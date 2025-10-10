import { eventBus } from '@/application/event-bus';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { parseVast } from '@/infrastructure/parsing/ads/vast-parser';
import { AdAvail } from '@/domain/ads/AdAvail';
import { AdCreative } from '@/domain/ads/AdCreative';

async function resolveAdAvail(stream, scte35Event) {
    if (!scte35Event.scte35 || scte35Event.scte35.error) return;

    const descriptor = scte35Event.scte35.descriptors?.find(
        (d) => d.segmentation_upid_type === 0x0c // MPU()
    );
    if (!descriptor?.segmentation_upid) return;

    let adManifestUrl;
    try {
        adManifestUrl = new URL(descriptor.segmentation_upid).href;
    } catch (e) {
        return; // UPID is not a valid URL
    }

    try {
        const response = await fetch(adManifestUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const vastXml = await response.text();
        const parsedVast = parseVast(vastXml);

        if (parsedVast.ads.length === 0) return;

        // For simplicity, we'll model one avail per SCTE-35 signal,
        // and all creatives from the VAST belong to this avail.
        const allCreatives = parsedVast.ads.flatMap((ad) =>
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
        );

        const totalDuration = allCreatives.reduce(
            (sum, c) => sum + c.duration,
            0
        );

        const adAvail = new AdAvail({
            id: descriptor.segmentation_event_id,
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
        const updatedAdAvails = [...(currentStream.adAvails || []), adAvail];
        analysisActions.updateStream(stream.id, { adAvails: updatedAdAvails });
    } catch (e) {
        console.error(
            `[resolveAdAvailUseCase] Failed to fetch or parse VAST from ${adManifestUrl}:`,
            e
        );
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

export function initializeResolveAdAvailUseCase() {
    eventBus.subscribe('state:analysis-complete', handleAnalysisComplete);
}
