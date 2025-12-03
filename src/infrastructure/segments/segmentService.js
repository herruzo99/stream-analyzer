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
    options = { forceReload: false }
) {
    const { get, set } = useSegmentCacheStore.getState();
    let cachedEntry = options.forceReload ? null : get(uniqueId);
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

    // 1. If we have fully parsed data, return it immediately.
    if (cachedEntry?.parsedData) {
        return cachedEntry.parsedData.error
            ? Promise.reject(new Error(cachedEntry.parsedData.error))
            : Promise.resolve(cachedEntry.parsedData);
    }

    // 2. If we have raw data but haven't parsed it yet, parse it now.
    if (cachedEntry?.data) {
        appLog(
            'SegmentService',
            'info',
            `Lazy parsing segment: ${uniqueId}. Data is already cached.`
        );
        return new Promise((resolve, reject) => {
            workerService
                .postTask('parse-segment-structure', {
                    data: cachedEntry.data,
                    url: uniqueId,
                    formatHint: formatHint,
                    context,
                })
                .promise.then((parsedData) => {
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

    // 3. If we have nothing, fetch and parse from scratch.
    return new Promise((resolve, reject) => {
        const onSegmentLoaded = ({ uniqueId: loadedId, entry }) => {
            if (loadedId === uniqueId) {
                unsubscribe();
                if (entry.status !== 200 || entry.parsedData?.error) {
                    reject(
                        new Error(
                            entry.parsedData?.error ||
                                `Failed to load segment ${uniqueId}`
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
            eventBus.dispatch(EVENTS.SEGMENT.PENDING, { uniqueId });
            eventBus.dispatch(EVENTS.SEGMENT.FETCH, {
                uniqueId,
                streamId: id,
                format: formatHint,
                context,
            });
        }
    });
}

/**
 * Ensures the initialization segment for a given representation is loaded.
 * @param {import('@/types').Stream} stream
 * @param {import('@/types').MediaSegment} segment
 * @returns {Promise<object|null>} The parsed init segment data, or null.
 */
async function ensureInitSegmentLoaded(stream, segment) {
    if (stream.protocol !== 'dash' || !segment.repId) return null;

    // Find the state for this representation
    const repKey = [...stream.dashRepresentationState.keys()].find((key) =>
        key.endsWith(`-${segment.repId}`)
    );
    if (!repKey) return null;

    const repState = stream.dashRepresentationState.get(repKey);
    if (!repState || !repState.segments) return null;

    const initSegment = repState.segments.find((s) => s.type === 'Init');
    if (!initSegment) return null;

    // Check cache
    try {
        const parsedInit = await getParsedSegment(
            initSegment.uniqueId,
            stream.id,
            'isobmff'
        );
        return parsedInit;
    } catch (e) {
        console.warn(
            `[SegmentService] Failed to auto-load Init segment ${initSegment.uniqueId}:`,
            e
        );
        return null;
    }
}

export function initializeSegmentService() {
    eventBus.subscribe(
        EVENTS.SEGMENT.FETCH,
        ({ uniqueId, streamId, format, context }) => {
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

                // Inject Init Segment context if available
                if (initData && initData.data && initData.data.boxes) {
                    workerContext.initSegmentBoxes = initData.data.boxes;
                    appLog(
                        'SegmentService',
                        'info',
                        `Injecting Init Segment context for ${uniqueId}`
                    );
                }

                workerService
                    .postTask('segment-fetch-and-parse', {
                        uniqueId,
                        streamId,
                        formatHint: format,
                        auth: stream?.auth,
                        decryption,
                        context: workerContext,
                    })
                    .promise.then((workerResult) => {
                        const finalEntry = {
                            status: 200,
                            data: workerResult.data,
                            parsedData: workerResult.parsedData,
                        };
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
                        useSegmentCacheStore
                            .getState()
                            .set(uniqueId, finalEntry);
                        eventBus.dispatch(EVENTS.SEGMENT.LOADED, {
                            uniqueId,
                            entry: finalEntry,
                        });
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

            // --- Orchestration Flow ---
            // 1. Resolve Dependencies (Init Segment)
            // 2. Resolve Decryption
            // 3. Execute Fetch

            const dependencyPromise =
                stream && segmentMeta && segmentMeta.type === 'Media'
                    ? ensureInitSegmentLoaded(stream, segmentMeta)
                    : Promise.resolve(null);

            dependencyPromise.then((initData) => {
                getDecryptionInfo()
                    .then((decryption) => executeFetch(decryption, initData))
                    .catch((err) => {
                        console.error(
                            '[SegmentService] Decryption setup failed:',
                            err
                        );
                        executeFetch(null, initData); // Try fetching anyway to report error
                    });
            });
        }
    );

    eventBus.subscribe(
        EVENTS.WORKER.SHAKA_SEGMENT_LOADED,
        ({ uniqueId, streamId, data, parsedData, status }) => {
            const { get, set } = useSegmentCacheStore.getState();
            const existingEntry = get(uniqueId);

            if (!existingEntry || existingEntry.status !== 200) {
                appLog(
                    'SegmentService',
                    'info',
                    `Caching parsed segment from worker: ${uniqueId}`
                );
                const finalEntry = { status, data, parsedData };
                set(uniqueId, finalEntry);
                eventBus.dispatch(EVENTS.SEGMENT.LOADED, {
                    uniqueId,
                    entry: finalEntry,
                });

                if (parsedData?.data?.events?.length > 0) {
                    const eventsWithSource = parsedData.data.events.map(
                        (e) => ({ ...e, sourceSegmentId: uniqueId })
                    );
                    analysisActions.addInbandEvents(streamId, eventsWithSource);
                }
            }
        }
    );
}

function findSegmentMetadata(uniqueId, streamId) {
    const { streams } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === streamId);

    if (!stream) return { playlist: null, segment: null, segmentIndex: -1 };

    // HLS Lookup
    if (stream.protocol === 'hls') {
        for (const playlist of stream.mediaPlaylists.values()) {
            const segmentIndex = (playlist.manifest.segments || []).findIndex(
                (s) => s.uniqueId === uniqueId
            );
            if (segmentIndex !== -1) {
                return {
                    playlist,
                    segment: playlist.manifest.segments[segmentIndex],
                    segmentIndex,
                };
            }
        }
    }
    // DASH Lookup
    else if (stream.protocol === 'dash') {
        for (const repState of stream.dashRepresentationState.values()) {
            const segment = repState.segments.find(
                (s) => s.uniqueId === uniqueId
            );
            if (segment) {
                return { playlist: null, segment, segmentIndex: -1 };
            }
        }
    }

    return { playlist: null, segment: null, segmentIndex: -1 };
}
