import { eventBus } from '@/application/event-bus';
import { keyManagerService } from '@/infrastructure/decryption/keyManagerService';
import { workerService } from '@/infrastructure/worker/workerService';
import { appLog } from '@/shared/utils/debug';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { EVENTS } from '@/types/events';

export function getParsedSegment(
    uniqueId,
    streamId = null,
    formatHint = null,
    context = {},
    options = {}
) {
    const { forceReload = false, background = false } = options;
    const { get, set } = useSegmentCacheStore.getState();
    let cachedEntry = forceReload ? null : get(uniqueId);
    const id = streamId ?? useAnalysisStore.getState().activeStreamId;

    if (
        context.isIFrame &&
        cachedEntry?.parsedData?.data?.boxes?.some(
            (box) =>
                box.type === 'mdat' &&
                box.issues?.some((issue) => issue.message.includes('truncated'))
        )
    ) {
        appLog(
            'SegmentService',
            'info',
            `Cache invalidation: Forcing re-parse of I-Frame segment ${uniqueId} with new context.`
        );
        set(uniqueId, { ...cachedEntry, parsedData: null });
        cachedEntry = get(uniqueId);
    }

    if (cachedEntry?.parsedData) {
        return cachedEntry.parsedData.error
            ? Promise.reject(new Error(cachedEntry.parsedData.error))
            : Promise.resolve(cachedEntry.parsedData);
    }

    if (cachedEntry?.data) {
        return new Promise((resolve, reject) => {
            workerService
                .postTask('parse-segment-structure', {
                    data: cachedEntry.data,
                    url: uniqueId,
                    formatHint: formatHint,
                    context,
                })
                .promise.then((parsedData) => {
                    // console.log('Worker returned parsedData:', parsedData);
                    const newEntry = { ...cachedEntry, parsedData };
                    set(uniqueId, newEntry);
                    if (parsedData.error) {
                        reject(new Error(parsedData.error));
                    } else {
                        resolve(parsedData);
                    }
                })
                .catch(reject);
        });
    }

    return new Promise((resolve, reject) => {
        const onSegmentLoaded = ({ uniqueId: loadedId, entry }) => {
            if (loadedId === uniqueId) {
                unsubscribe();
                if (entry.status !== 200 || entry.parsedData?.error) {
                    reject(
                        new Error(
                            entry.parsedData?.error ||
                                `Failed to load segment ${uniqueId} (HTTP ${entry.status})`
                        )
                    );
                } else {
                    resolve(entry.parsedData);
                }
            }
        };

        const unsubscribe = eventBus.subscribe(
            EVENTS.SEGMENT.LOADED,
            onSegmentLoaded
        );

        if (!cachedEntry || cachedEntry.status !== -1) {
            set(uniqueId, { status: -1, data: null, parsedData: null });

            if (!background) {
                eventBus.dispatch(EVENTS.SEGMENT.PENDING, { uniqueId });
            }

            eventBus.dispatch(EVENTS.SEGMENT.FETCH, {
                uniqueId,
                streamId: id,
                format: formatHint,
                context,
                options: { forceReload, background },
            });
        }
    });
}

/**
 * Finds and loads the Initialization Segment for a given media segment.
 * Supports both DASH (SegmentTemplate/Base) and HLS (EXT-X-MAP).
 */
async function ensureInitSegmentLoaded(stream, segment) {
    if (!segment.repId) return null;

    let initSegment = null;

    if (stream.protocol === 'dash') {
        const repKey = [...stream.dashRepresentationState.keys()].find((key) =>
            key.endsWith(`-${segment.repId}`)
        );
        if (repKey) {
            const repState = stream.dashRepresentationState.get(repKey);
            initSegment = repState?.segments?.find((s) => s.type === 'Init');
        }
    } else if (stream.protocol === 'hls') {
        // For HLS, repId is the Variant ID (or 'hls-media' if unmapped)
        const variantState = stream.hlsVariantState.get(segment.repId);
        if (variantState) {
            // HLS Init segments are stored in the segment list with type 'Init'
            // This is populated by hls/parser.js when EXT-X-MAP is present
            initSegment = variantState.segments.find((s) => s.type === 'Init');
        }
    }

    if (!initSegment) return null;

    try {
        const parsedInit = await getParsedSegment(
            initSegment.uniqueId,
            stream.id,
            'isobmff',
            {},
            { background: true }
        );
        return parsedInit;
    } catch (_e) {
        return null;
    }
}

export function initializeSegmentService() {
    eventBus.subscribe(
        EVENTS.SEGMENT.FETCH,
        ({ uniqueId, streamId, format, context, options }) => {
            const { get } = useSegmentCacheStore.getState();

            const currentEntry = get(uniqueId);
            if (
                currentEntry &&
                currentEntry.status === 200 &&
                currentEntry.data
            ) {
                return;
            }

            const stream = useAnalysisStore
                .getState()
                .streams.find((s) => s.id === streamId);

            const {
                playlist: mediaPlaylist,
                segment: segmentMeta,
                segmentIndex,
            } = findSegmentMetadata(uniqueId, streamId);

            const executeFetch = (decryption, initData = null) => {
                const workerContext = { ...context };

                if (initData && initData.data && initData.data.boxes) {
                    workerContext.initSegmentBoxes = initData.data.boxes;
                }

                // Inject Resolution from Manifest for BPP calc
                if (stream && segmentMeta && segmentMeta.repId) {
                    const videoTrack =
                        stream.manifest?.summary?.videoTracks?.find(
                            (t) => t.id === segmentMeta.repId
                        );
                    if (
                        videoTrack &&
                        videoTrack.resolutions &&
                        videoTrack.resolutions.length > 0
                    ) {
                        const resParts =
                            videoTrack.resolutions[0].value.split('x');
                        if (resParts.length === 2) {
                            const w = parseInt(resParts[0], 10);
                            const h = parseInt(resParts[1], 10);
                            if (!isNaN(w) && !isNaN(h)) {
                                workerContext.manifestWidth = w;
                                workerContext.manifestHeight = h;
                            }
                        }
                    }
                }

                // Pass full manifest summary for deep analysis (e.g. PIDs, codecs)
                if (stream?.manifest?.summary) {
                    workerContext.manifestSummary = stream.manifest.summary;
                }

                let byteRange = segmentMeta?.range || null;
                if (!byteRange && uniqueId.includes('@')) {
                    const parts = uniqueId.split('@');
                    const possibleRange = parts[parts.length - 1];
                    if (possibleRange.match(/^\d+-\d+$/)) {
                        byteRange = possibleRange;
                    }
                }

                workerService
                    .postTask('segment-fetch-and-parse', {
                        uniqueId,
                        streamId,
                        formatHint: format,
                        auth: stream?.auth,
                        decryption,
                        context: workerContext,
                        range: byteRange,
                    })
                    .promise.then((workerResult) => {
                        const finalEntry = {
                            status: workerResult.status,
                            data: workerResult.data,
                            parsedData: workerResult.parsedData,
                        };

                        useSegmentCacheStore
                            .getState()
                            .set(uniqueId, finalEntry);

                        eventBus.dispatch(EVENTS.SEGMENT.LOADED, {
                            uniqueId,
                            entry: finalEntry,
                        });

                        if (
                            streamId !== null &&
                            finalEntry.parsedData?.data?.events?.length > 0
                        ) {
                            const eventsWithSource =
                                finalEntry.parsedData.data.events.map((e) => ({
                                    ...e,
                                    sourceSegmentId: uniqueId,
                                }));
                            analysisActions.addInbandEvents(
                                streamId,
                                eventsWithSource
                            );
                        }
                    })
                    .catch((error) => {
                        console.error('[SegmentService] Worker error:', error);
                        const errorEntry = {
                            status: 0,
                            data: null,
                            parsedData: { error: error.message },
                        };
                        useSegmentCacheStore
                            .getState()
                            .set(uniqueId, errorEntry);
                        eventBus.dispatch(EVENTS.SEGMENT.LOADED, {
                            uniqueId,
                            entry: errorEntry,
                        });
                    });
            };

            const getDecryptionInfo = async () => {
                if (segmentMeta?.encryptionInfo) {
                    const {
                        method,
                        uri,
                        iv: ivHex,
                    } = segmentMeta.encryptionInfo;
                    if (method === 'AES-128') {
                        const key = await keyManagerService.getKey(uri);
                        let iv;
                        if (ivHex && ivHex !== 'null') {
                            iv = new Uint8Array(
                                ivHex
                                    .substring(2)
                                    .match(/.{1,2}/g)
                                    .map((byte) => parseInt(byte, 16))
                            );
                        } else {
                            const mediaSequence =
                                mediaPlaylist?.manifest?.mediaSequence || 0;
                            const sequenceNumber = mediaSequence + segmentIndex;
                            iv = new Uint8Array(16);
                            const view = new DataView(iv.buffer);
                            view.setBigUint64(8, BigInt(sequenceNumber), false);
                        }
                        return { key, iv };
                    }
                }
                return null;
            };

            const dependencyPromise =
                stream && segmentMeta && segmentMeta.type === 'Media'
                    ? ensureInitSegmentLoaded(stream, segmentMeta)
                    : Promise.resolve(null);

            dependencyPromise.then((initData) => {
                getDecryptionInfo()
                    .then((decryption) => executeFetch(decryption, initData))
                    .catch(() => executeFetch(null, initData));
            });
        }
    );

    eventBus.subscribe(
        EVENTS.WORKER.SHAKA_SEGMENT_LOADED,
        ({ uniqueId, streamId, data, parsedData, status }) => {
            const { get, set } = useSegmentCacheStore.getState();
            const existingEntry = get(uniqueId);

            const hasExistingAnalysis =
                existingEntry?.parsedData?.bitstreamAnalysisAttempted;
            const hasNewAnalysis = parsedData?.bitstreamAnalysisAttempted;

            if (existingEntry && existingEntry.status === 200) {
                if (hasExistingAnalysis && !hasNewAnalysis) {
                    return;
                }
                if (
                    existingEntry.data &&
                    data &&
                    existingEntry.data.byteLength === data.byteLength
                ) {
                    return;
                }
            }

            const finalEntry = { status, data, parsedData };
            set(uniqueId, finalEntry);

            eventBus.dispatch(EVENTS.SEGMENT.LOADED, {
                uniqueId,
                entry: finalEntry,
            });

            if (parsedData?.data?.events?.length > 0) {
                const eventsWithSource = parsedData.data.events.map((e) => ({
                    ...e,
                    sourceSegmentId: uniqueId,
                }));
                analysisActions.addInbandEvents(streamId, eventsWithSource);
            }
        }
    );
}

function findSegmentMetadata(uniqueId, streamId) {
    const { streams } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === streamId);
    if (!stream) return { playlist: null, segment: null, segmentIndex: -1 };

    if (stream.protocol === 'hls') {
        for (const [key, state] of stream.hlsVariantState.entries()) {
            const segmentIndex = state.segments.findIndex(
                (s) => s.uniqueId === uniqueId
            );
            if (segmentIndex !== -1) {
                const playlist = stream.mediaPlaylists.get(key) || {
                    manifest: { mediaSequence: 0 },
                };
                return {
                    playlist,
                    segment: state.segments[segmentIndex],
                    segmentIndex,
                };
            }
        }
    } else if (stream.protocol === 'dash') {
        for (const repState of stream.dashRepresentationState.values()) {
            const segment = repState.segments.find(
                (s) => s.uniqueId === uniqueId
            );
            if (segment) return { playlist: null, segment, segmentIndex: -1 };
            if (
                repState.initSegment &&
                repState.initSegment.uniqueId === uniqueId
            ) {
                return {
                    playlist: null,
                    segment: repState.initSegment,
                    segmentIndex: -1,
                };
            }
        }
    }
    return { playlist: null, segment: null, segmentIndex: -1 };
}
