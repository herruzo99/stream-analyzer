import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { eventBus } from '@/application/event-bus';
import { workerService } from '@/infrastructure/worker/workerService';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { keyManagerService } from '@/infrastructure/decryption/keyManagerService';
import { fetchWithRetry } from '@/infrastructure/http/fetch';

/**
 * Finds the corresponding HLS segment object and its parent playlist from the manifest IR.
 * @param {string} uniqueId The unique ID of the segment.
 * @returns {{playlist: import('@/types.ts').MediaPlaylist | null, segment: import('@/types.ts').HlsSegment | null, segmentIndex: number}}
 */
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

async function _fetchAndParseSegment(uniqueId, streamId, formatHint) {
    const { set } = useSegmentCacheStore.getState();
    const url = uniqueId.split('@')[0]; // Extract the raw URL for fetching

    try {
        set(uniqueId, { status: -1, data: null, parsedData: null });
        eventBus.dispatch('segment:pending', { uniqueId });

        const {
            playlist: mediaPlaylist,
            segment: hlsSegment,
            segmentIndex,
        } = findHlsSegmentAndPlaylist(uniqueId);
        let workerTask = 'parse-segment-structure';
        let workerPayload = { url, data: null, formatHint };
        let finalDataBuffer = null;

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

                workerTask = 'decrypt-and-parse-segment';
                workerPayload = { url, key, iv, formatHint, data: null };
            }
        }

        if (workerTask === 'parse-segment-structure') {
            const response = await fetchWithRetry(url, {
                method: 'GET',
                cache: 'no-store',
            });
            if (!response.ok) {
                const errorEntry = {
                    status: response.status,
                    data: null,
                    parsedData: { error: `HTTP ${response.status}` },
                };
                set(uniqueId, errorEntry);
                eventBus.dispatch('segment:loaded', {
                    uniqueId,
                    entry: errorEntry,
                });
                return;
            }
            finalDataBuffer = await response.arrayBuffer();
            workerPayload.data = finalDataBuffer;
        }

        const workerResult = await workerService.postTask(
            workerTask,
            workerPayload
        );

        let parsedData;
        if (workerTask === 'decrypt-and-parse-segment') {
            parsedData = workerResult.parsedData;
            finalDataBuffer = workerResult.decryptedData;
        } else {
            parsedData = workerResult;
        }

        const finalEntry = {
            status: 200,
            data: finalDataBuffer,
            parsedData,
        };

        // --- NEW LOGIC: Check for inband events ---
        if (streamId !== null && parsedData?.data?.events?.length > 0) {
            analysisActions.addInbandEvents(streamId, parsedData.data.events);
        }
        // --- END NEW LOGIC ---

        set(uniqueId, finalEntry);
        eventBus.dispatch('segment:loaded', { uniqueId, entry: finalEntry });
    } catch (error) {
        console.error(`Failed to fetch or parse segment ${url}:`, error);
        const errorEntry = {
            status: 0,
            data: null,
            parsedData: { error: error.message },
        };
        set(uniqueId, errorEntry);
        eventBus.dispatch('segment:loaded', { uniqueId, entry: errorEntry });
    }
}

export function getParsedSegment(uniqueId, streamId = null, formatHint = null) {
    const { get } = useSegmentCacheStore.getState();
    const cachedEntry = get(uniqueId);
    const id = streamId ?? useAnalysisStore.getState().activeStreamId;

    if (cachedEntry && cachedEntry.status !== -1 && cachedEntry.parsedData) {
        return cachedEntry.parsedData.error
            ? Promise.reject(new Error(cachedEntry.parsedData.error))
            : Promise.resolve(cachedEntry.parsedData);
    }

    return new Promise((resolve, reject) => {
        const onSegmentLoaded = ({ uniqueId: loadedId, entry }) => {
            if (loadedId === uniqueId) {
                unsubscribe();
                if (entry.status !== 200) {
                    reject(new Error(`HTTP ${entry.status} for ${uniqueId}`));
                } else if (entry.parsedData?.error) {
                    reject(new Error(entry.parsedData.error));
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
            _fetchAndParseSegment(uniqueId, id, formatHint);
        }
    });
}

export function initializeSegmentService() {
    eventBus.subscribe('segment:fetch', ({ uniqueId, streamId, format }) =>
        _fetchAndParseSegment(uniqueId, streamId, format)
    );
}