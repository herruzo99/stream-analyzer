import { eventBus } from '@/application/event-bus';
import { AdAvail } from '@/features/advertising/domain/AdAvail';
import { AdCreative } from '@/features/advertising/domain/AdCreative';
import { fetchWithRetry } from '@/infrastructure/http/fetch';
import { parseScte224 } from '@/infrastructure/parsing/ads/scte224-parser';
import { parseVast } from '@/infrastructure/parsing/ads/vast-parser';
import { parseVmap } from '@/infrastructure/parsing/ads/vmap-parser';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';

const SCTE224_SCHEMES = [
    'urn:scte:scte224:2015',
    'urn:scte:224:2018',
    'http://www.scte.org/schemas/224',
];

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
        adManifestUrl: null,
        creatives: [],
        detectionMethod: detectionMethod,
    });
    updateStreamState(stream.id, adAvail);
}

function updateStreamState(streamId, adAvail) {
    const currentStream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!currentStream) return;

    const existingAvails = new Map(
        (currentStream.adAvails || []).map((a) => [a.id, a])
    );
    // Merge or Add
    existingAvails.set(adAvail.id, adAvail);

    const updatedAdAvails = Array.from(existingAvails.values()).sort(
        (a, b) => a.startTime - b.startTime
    );
    analysisActions.updateStream(streamId, { adAvails: updatedAdAvails });
}

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
        const content = await response.text();

        let creatives = [];
        let vmapInfo = null;

        // VMAP Detection
        if (content.includes('<vmap:VMAP') || content.includes('<VMAP')) {
            const vmap = parseVmap(content);
            vmapInfo = {
                version: vmap.version,
                breakCount: vmap.breaks.length,
            };

            // Naive Flattening: Resolve ALL VAST URIs in VMAP
            for (const br of vmap.breaks) {
                if (br.adTagUri) {
                    try {
                        const vastRes = await fetchWithRetry(br.adTagUri);
                        if (vastRes.ok) {
                            const vastXml = await vastRes.text();
                            const vastParsed = parseVast(vastXml);
                            if (vastParsed.ads) {
                                vastParsed.ads.forEach((ad) => {
                                    ad.creatives.forEach((c) => {
                                        creatives.push(
                                            new AdCreative({
                                                id: c.id,
                                                sequence: c.sequence,
                                                duration: c.duration,
                                                mediaFileUrl: c.mediaFileUrl,
                                                trackingUrls: c.trackingUrls,
                                            })
                                        );
                                    });
                                });
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to resolve VMAP internal URI', e);
                    }
                }
            }
        } else {
            // VAST Parsing
            const parsedVast = parseVast(content);
            if (parsedVast.ads) {
                parsedVast.ads.forEach((ad) => {
                    ad.creatives.forEach((c) => {
                        creatives.push(
                            new AdCreative({
                                id: c.id,
                                sequence: c.sequence,
                                duration: c.duration,
                                mediaFileUrl: c.mediaFileUrl,
                                trackingUrls: c.trackingUrls,
                            })
                        );
                    });
                });
            }
        }

        const totalDuration = creatives.reduce((sum, c) => sum + c.duration, 0);

        const adAvail = new AdAvail({
            id: String(descriptor.segmentation_event_id),
            startTime: scte35Event.startTime,
            duration: totalDuration || scte35Event.duration,
            scte35Signal: scte35Event.scte35,
            adManifestUrl,
            creatives,
            detectionMethod,
            vmapInfo,
        });

        updateStreamState(stream.id, adAvail);
    } catch (e) {
        console.error(
            `[resolveAdAvailUseCase] Failed to fetch ads from ${adManifestUrl}:`,
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
        // Handle SCTE-35
        if (event.scte35) {
            resolveAdAvail(stream, event, 'SCTE35_INBAND');
        }
        // Handle SCTE-224 (Check scheme or payload structure)
        if (
            event.schemeIdUri &&
            SCTE224_SCHEMES.some((s) => event.schemeIdUri.includes(s))
        ) {
            handleScte224Event(stream, event);
        }
    }
}

function handleScte224Event(stream, event) {
    // If payload is text, parse it. If binary, decode.
    let xml = event.messageData;
    // Sometimes messageData is base64
    if (!xml.startsWith('<')) {
        try {
            xml = atob(xml);
        } catch (_e) {
            /* ignore */
        }
    }

    if (xml.includes('<Media') || xml.includes('<Audience')) {
        const parsed224 = parseScte224(xml);

        // Create a pseudo-avail or update stream metadata
        const avail = new AdAvail({
            id: `ESNI-${parsed224.id || event.startTime}`,
            startTime: event.startTime,
            duration: event.duration,
            scte35Signal: null,
            scte224Signal: parsed224,
            adManifestUrl: null,
            creatives: [],
            detectionMethod: 'SCTE224_ESNI',
        });
        updateStreamState(stream.id, avail);
    }
}

export function initializeResolveAdAvailUseCase() {
    eventBus.subscribe('state:inband-events-added', handleInbandEventsAdded);
}
