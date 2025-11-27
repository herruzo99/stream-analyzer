import { eventBus } from '@/application/event-bus';
import { AdAvail } from '@/features/advertising/domain/AdAvail';
import { AdCreative } from '@/features/advertising/domain/AdCreative';
import { fetchWithRetry } from '@/infrastructure/http/fetch';
import { parseVast } from '@/infrastructure/parsing/ads/vast-parser';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';

/**
 * Creates a partial AdAvail from a splice_insert command when no VAST URL is available.
 * @param {import('@/types.ts').Stream} stream
 * @param {import('@/types.ts').Event} scte35Event
 * @param {import('@/types').AdAvail['detectionMethod']} detectionMethod
 */
function createPartialAdAvail(stream, scte35Event, detectionMethod) {
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
        detectionMethod: detectionMethod,
    });

    // Update the stream state
    const currentStream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === stream.id);
    if (!currentStream) return;

    const existingAvails = new Map(
        (currentStream.adAvails || []).map((a) => [a.id, a])
    );
    if (existingAvails.has(adAvail.id)) return;

    const updatedAdAvails = [...(currentStream.adAvails || []), adAvail];
    analysisActions.updateStream(stream.id, { adAvails: updatedAdAvails });
}

/**
 * @param {import('@/types.ts').Stream} stream
 * @param {import('@/types.ts').Event} scte35Event
 * @param {import('@/types').AdAvail['detectionMethod']} detectionMethod
 */
async function resolveAdAvail(stream, scte35Event, detectionMethod) {
    if (!scte35Event.scte35 || 'error' in scte35Event.scte35) return;

    const descriptor = scte35Event.scte35.descriptors?.find(
        (d) => d.segmentation_upid_type === 0x0c // MPU()
    );

    if (!descriptor?.segmentation_upid) {
        createPartialAdAvail(stream, scte35Event, detectionMethod);
        return;
    }

    let adManifestUrl;
    try {
        adManifestUrl = new URL(descriptor.segmentation_upid).href;
    } catch (_e) {
        createPartialAdAvail(stream, scte35Event, detectionMethod);
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
            detectionMethod: detectionMethod,
        });

        const currentStream = useAnalysisStore
            .getState()
            .streams.find((s) => s.id === stream.id);
        if (!currentStream) return;

        const existingAvails = new Map(
            (currentStream.adAvails || []).map((a) => [a.id, a])
        );
        if (existingAvails.has(adAvail.id)) return;

        const updatedAdAvails = [...(currentStream.adAvails || []), adAvail];
        analysisActions.updateStream(stream.id, { adAvails: updatedAdAvails });
    } catch (e) {
        console.error(
            `[resolveAdAvailUseCase] Failed to fetch or parse VAST from ${adManifestUrl}:`,
            e
        );
        createPartialAdAvail(stream, scte35Event, detectionMethod);
    }
}

function handleInbandEventsAdded({ streamId, newEvents }) {
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream) return;

    for (const event of newEvents) {
        if (event.scte35) {
            resolveAdAvail(stream, event, 'SCTE35_INBAND');
        }
    }
}

function handleAnalysisCompleteForManifestEvents({ streams }) {
    for (const stream of streams) {
        for (const event of stream.manifest?.events || []) {
            if (event.scte35) {
                resolveAdAvail(stream, event, 'SCTE35_DATERANGE');
            }
        }
    }
}

export function initializeResolveAdAvailUseCase() {
    eventBus.subscribe('state:inband-events-added', handleInbandEventsAdded);
    eventBus.subscribe(
        'state:analysis-complete',
        handleAnalysisCompleteForManifestEvents
    );
}
