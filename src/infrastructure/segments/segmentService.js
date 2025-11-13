import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { eventBus } from '@/application/event-bus';
import { workerService } from '@/infrastructure/worker/workerService';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { keyManagerService } from '@/infrastructure/decryption/keyManagerService';
import { appLog } from '@/shared/utils/debug';

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
            'segment:loaded',
            onSegmentLoaded
        );

        if (!cachedEntry || cachedEntry.status !== -1) {
            set(uniqueId, { status: -1, data: null, parsedData: null });
            eventBus.dispatch('segment:pending', { uniqueId });
            eventBus.dispatch('segment:fetch', {
                uniqueId,
                streamId: id,
                format: formatHint,
                context,
            });
        }
    });
}

export function initializeSegmentService() {
    eventBus.subscribe(
        'segment:fetch',
        ({ uniqueId, streamId, format, context }) => {
            const stream = useAnalysisStore
                .getState()
                .streams.find((s) => s.id === streamId);

            const {
                playlist: mediaPlaylist,
                segment: hlsSegment,
                segmentIndex,
            } = findHlsSegmentAndPlaylist(uniqueId);

            const getDecryptionInfo = async () => {
                if (hlsSegment?.encryptionInfo) {
                    const {
                        method,
                        uri,
                        iv: ivHex,
                    } = hlsSegment.encryptionInfo;
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

            getDecryptionInfo().then((decryption) => {
                workerService
                    .postTask('segment-fetch-and-parse', {
                        uniqueId,
                        streamId,
                        formatHint: format,
                        auth: stream?.auth,
                        decryption,
                        context,
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
                                finalEntry.parsedData.data.events.map(
                                    (e) => ({ ...e, sourceSegmentId: uniqueId })
                                );
                            analysisActions.addInbandEvents(
                                streamId,
                                eventsWithSource
                            );
                        }
                        useSegmentCacheStore
                            .getState()
                            .set(uniqueId, finalEntry);
                        eventBus.dispatch('segment:loaded', {
                            uniqueId,
                            entry: finalEntry,
                        });
                    })
                    .catch((error) => {
                        const errorEntry = {
                            status: 0,
                            data: null,
                            parsedData: { error: error.message },
                        };
                        useSegmentCacheStore
                            .getState()
                            .set(uniqueId, errorEntry);
                        eventBus.dispatch('segment:loaded', {
                            uniqueId,
                            entry: errorEntry,
                        });
                    });
            });
        }
    );

    eventBus.subscribe(
        'worker:shaka-segment-loaded',
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
                eventBus.dispatch('segment:loaded', {
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

function findHlsSegmentAndPlaylist(uniqueId) {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);
    if (!activeStream || activeStream.protocol !== 'hls') {
        return { playlist: null, segment: null, segmentIndex: -1 };
    }

    for (const playlist of activeStream.mediaPlaylists.values()) {
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
    return { playlist: null, segment: null, segmentIndex: -1 };
}