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
const AD_RESOLUTION_LIMITS = Object.freeze({
    events: 100,
    nestedDocuments: 20,
});
const activeResolutions = new Map();
let resolutionGeneration = 0;

function safeExternalUrl(value) {
    const url = new URL(value);
    if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password
    )
        throw new TypeError('Unsupported external advertising URL.');
    return url.href;
}

const isCurrent = (streamId, context) =>
    activeResolutions.get(streamId)?.generation === context.generation &&
    !context.controller.signal.aborted;

function createPartialAdAvail(stream, scte35Event, detectionMethod, context) {
    if (context && !isCurrent(stream.id, context)) return;
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

function updateStreamState(streamId, adAvail, context) {
    if (context && !isCurrent(streamId, context)) return;
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

async function resolveAdAvail(stream, scte35Event, detectionMethod, context) {
    if (!scte35Event.scte35 || 'error' in scte35Event.scte35) return;

    const descriptor = scte35Event.scte35.descriptors?.find(
        (d) => d.segmentation_upid_type === 0x0c // MPU()
    );

    if (!descriptor?.segmentation_upid) {
        createPartialAdAvail(stream, scte35Event, detectionMethod, context);
        return;
    }

    let adManifestUrl;
    try {
        adManifestUrl = safeExternalUrl(descriptor.segmentation_upid);
    } catch (_e) {
        createPartialAdAvail(stream, scte35Event, detectionMethod, context);
        return;
    }

    try {
        const response = await fetchWithRetry(adManifestUrl, {
            signal: context.controller.signal,
            credentials: 'omit',
        });
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
            for (const br of vmap.breaks.slice(
                0,
                AD_RESOLUTION_LIMITS.nestedDocuments
            )) {
                if (br.adTagUri) {
                    try {
                        const nestedUrl = safeExternalUrl(br.adTagUri);
                        const vastRes = await fetchWithRetry(nestedUrl, {
                            signal: context.controller.signal,
                            credentials: 'omit',
                        });
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

        updateStreamState(stream.id, adAvail, context);
    } catch (e) {
        if (e?.name === 'AbortError' || context.controller.signal.aborted)
            return;
        console.error(
            `[resolveAdAvailUseCase] Failed to fetch ads from ${adManifestUrl}:`,
            e
        );
        createPartialAdAvail(stream, scte35Event, detectionMethod, context);
    }
}

async function handleInbandEventsAdded({ streamId, newEvents }) {
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream) return;

    activeResolutions.get(streamId)?.controller.abort();
    const context = {
        controller: new AbortController(),
        generation: ++resolutionGeneration,
    };
    activeResolutions.set(streamId, context);

    for (const event of newEvents.slice(0, AD_RESOLUTION_LIMITS.events)) {
        // Handle SCTE-35
        if (event.scte35) {
            await resolveAdAvail(stream, event, 'SCTE35_INBAND', context);
        }
        // Handle SCTE-224 (Check scheme or payload structure)
        if (
            event.schemeIdUri &&
            SCTE224_SCHEMES.some((s) => event.schemeIdUri.includes(s))
        ) {
            handleScte224Event(stream, event, context);
        }
    }
}

function handleScte224Event(stream, event, context) {
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
        updateStreamState(stream.id, avail, context);
    }
}

export function initializeResolveAdAvailUseCase() {
    const unsubscribe = eventBus.subscribe(
        'state:inband-events-added',
        handleInbandEventsAdded
    );
    return () => {
        unsubscribe();
        for (const context of activeResolutions.values())
            context.controller.abort();
        activeResolutions.clear();
    };
}
