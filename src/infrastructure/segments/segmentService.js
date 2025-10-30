import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { eventBus } from '@/application/event-bus';
import { workerService } from '@/infrastructure/worker/workerService';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { keyManagerService } from '@/infrastructure/decryption/keyManagerService';
import { debugLog } from '@/shared/utils/debug';

export function getParsedSegment(uniqueId, streamId = null, formatHint = null) {
    const { get, set } = useSegmentCacheStore.getState();
    const cachedEntry = get(uniqueId);
    const id = streamId ?? useAnalysisStore.getState().activeStreamId;

    // 1. If we have fully parsed data, return it immediately.
    if (cachedEntry?.parsedData) {
        return cachedEntry.parsedData.error
            ? Promise.reject(new Error(cachedEntry.parsedData.error))
            : Promise.resolve(cachedEntry.parsedData);
    }

    // --- ARCHITECTURAL REFACTOR: LAZY PARSING ---
    // 2. If we have raw data but haven't parsed it yet, parse it now.
    if (cachedEntry?.data) {
        debugLog(
            'SegmentService',
            `Lazy parsing segment: ${uniqueId}. Data is already cached.`
        );
        return new Promise((resolve, reject) => {
            workerService
                .postTask('parse-segment-structure', {
                    data: cachedEntry.data,
                    url: uniqueId,
                    formatHint: formatHint,
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
    // --- END REFACTOR ---

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
            });
        }
    });
}

export function initializeSegmentService() {
    eventBus.subscribe('segment:fetch', ({ uniqueId, streamId, format }) => {
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
                const { method, uri, iv: ivHex } = hlsSegment.encryptionInfo;
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
                        analysisActions.addInbandEvents(
                            streamId,
                            finalEntry.parsedData.data.events
                        );
                    }
                    useSegmentCacheStore.getState().set(uniqueId, finalEntry);
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
                    useSegmentCacheStore.getState().set(uniqueId, errorEntry);
                    eventBus.dispatch('segment:loaded', {
                        uniqueId,
                        entry: errorEntry,
                    });
                });
        });
    });

    // --- ARCHITECTURAL REFACTOR: LAZY PARSING ---
    // This handler now receives raw segment data from the player. It stores
    // the ArrayBuffer in the cache but does NOT hold onto the large parsedData object.
    // This prevents the main thread from being overwhelmed with object allocations during playback.
    eventBus.subscribe('worker:shaka-segment-loaded', (payload) => {
        debugLog(
            'SegmentService',
            'Handler for "worker:shaka-segment-loaded" triggered.',
            { uniqueId: payload.uniqueId, streamId: payload.streamId }
        );

        const { uniqueId, status, data, streamId } = payload;
        const { set } = useSegmentCacheStore.getState();
        const stream = useAnalysisStore
            .getState()
            .streams.find((s) => s.id === streamId);

        if (streamId === null || !stream) {
            debugLog(
                'SegmentService',
                `Could not find stream with ID ${streamId}. Cannot process segment.`
            );
            return;
        }

        // Store only the raw data. Parsed data will be generated on-demand.
        const entry = { status, data, parsedData: null };
        set(uniqueId, entry);

        // Dispatch a minimal event to notify that raw data is available.
        // This is different from the full "segment:loaded" which implies parsing is complete.
        eventBus.dispatch('segment:cached', { uniqueId, entry });

        if (stream.protocol === 'hls') {
            analysisActions.addHlsSegmentFromPlayer({
                streamId,
                segmentUrl: uniqueId,
            });
        }
    });
    // --- END REFACTOR ---
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