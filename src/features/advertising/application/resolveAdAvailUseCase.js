import { eventBus } from '@/application/event-bus';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { parseVast } from '@/infrastructure/parsing/ads/vast-parser';
import { AdAvail } from '@/features/advertising/domain/AdAvail';
import { AdCreative } from '@/features/advertising/domain/AdCreative';
import { fetchWithRetry } from '@/infrastructure/http/fetch';

/**
 * Creates a partial AdAvail from a splice_insert command when no VAST URL is available.
 * @param {import('@/types.ts').Stream} stream
 * @param {import('@/types.ts').Event} scte35Event
 */
function createPartialAdAvail(stream, scte35Event) {
    const scte35 = scte35Event.scte35;
    if (!scte35 || 'error' in scte35) return;

    const command = scte35.splice_command;
    if (command.type !== 'Splice Insert' && command.type !== 'Time Signal')
        return;

    const adAvail = new AdAvail({
        id: String(command.splice_event_id || scte35Event.startTime),
        startTime: scte35Event.startTime,
        duration: command.break_duration
            ? command.break_duration.duration / 90000
            : scte35Event.duration || 0,
        scte35Signal: scte35,
        adManifestUrl: null, // Explicitly null as it's unresolved
        creatives: [],
    });

    // Update the stream state
    const currentStream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === stream.id);
    if (!currentStream) return;

    // Prevent duplicates
    const existingAvail = (currentStream.adAvails || []).find(
        (a) => a.id === adAvail.id
    );
    if (existingAvail) return;

    const updatedAdAvails = [...(currentStream.adAvails || []), adAvail];
    analysisActions.updateStream(stream.id, { adAvails: updatedAdAvails });
}

/**
 * @param {import('@/types.ts').Stream} stream
 * @param {import('@/types.ts').Event} scte35Event
 */
async function resolveAdAvail(stream, scte35Event) {
    if (!scte35Event.scte35 || 'error' in scte35Event.scte35) return;

    const descriptor = scte35Event.scte35.descriptors?.find(
        (d) => d.segmentation_upid_type === 0x0c // MPU()
    );

    // If there's no descriptor with a VAST URL, we may still have a valid ad avail.
    if (!descriptor?.segmentation_upid) {
        createPartialAdAvail(stream, scte35Event);
        return;
    }

    let adManifestUrl;
    try {
        adManifestUrl = new URL(descriptor.segmentation_upid).href;
    } catch (e) {
        // UPID is not a valid URL, treat it as a partial avail.
        createPartialAdAvail(stream, scte35Event);
        return;
    }

    try {
        const response = await fetchWithRetry(adManifestUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const vastXml = await response.text();
        const parsedVast = parseVast(vastXml);

        const allCreatives =
            parsedVast.ads.length > 0
                ? parsedVast.ads.flatMap((ad) =>
                      ad.creatives.map(
                          (c) =>
                              new AdCreative({
                                  id: c.id,
                                  sequence: c.sequence,
                                  duration: c.duration,
                                  mediaFileUrl: c.mediaFileUrl,
                                  trackingUrls: c.trackingUrls,
                              })
                      )
                  )
                : [];

        const totalDuration = allCreatives.reduce(
            (sum, c) => sum + c.duration,
            0
        );

        const adAvail = new AdAvail({
            id: String(descriptor.segmentation_event_id),
            startTime: scte35Event.startTime,
            duration: totalDuration || scte35Event.duration,
            scte35Signal: scte35Event.scte35,
            adManifestUrl,
            creatives: allCreatives,
        });

        // Update the stream state
        const currentStream = useAnalysisStore
            .getState()
            .streams.find((s) => s.id === stream.id);
        if (!currentStream) return;

        // Prevent duplicates
        const existingAvail = (currentStream.adAvails || []).find(
            (a) => a.id === adAvail.id
        );
        if (existingAvail) return;

        const updatedAdAvails = [...(currentStream.adAvails || []), adAvail];
        analysisActions.updateStream(stream.id, { adAvails: updatedAdAvails });
    } catch (e) {
        console.error(
            `[resolveAdAvailUseCase] Failed to fetch or parse VAST from ${adManifestUrl}:`,
            e
        );
        // Even if VAST fetch fails, we should still show the ad opportunity.
        createPartialAdAvail(stream, scte35Event);
    }
}

function handleAnalysisComplete({ streams }) {
    for (const stream of streams) {
        if (stream.manifest?.events) {
            for (const event of stream.manifest.events) {
                if (event.scte35) {
                    resolveAdAvail(stream, event);
                }
            }
        }
    }
}

function handleInbandEventsAdded({ streamId, newEvents }) {
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream) return;

    for (const event of newEvents) {
        if (event.scte35) {
            // The `startTime` for in-band emsg boxes needs to be calculated based on their presentation time.
            // For now, we'll assume the parser has populated this correctly.
            resolveAdAvail(stream, event);
        }
    }
}

export function initializeResolveAdAvailUseCase() {
    eventBus.subscribe('state:analysis-complete', handleAnalysisComplete);
    eventBus.subscribe('state:inband-events-added', handleInbandEventsAdded);
}