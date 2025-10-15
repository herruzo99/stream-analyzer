import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { eventBus } from '@/application/event-bus';
import { workerService } from '@/infrastructure/worker/workerService';
import { useAnalysisStore } from '@/state/analysisStore';
import { keyManagerService } from './keyManagerService';

/**
 * Finds the corresponding HLS segment object and its parent playlist from the manifest IR.
 * @param {string} url The URL of the segment.
 * @returns {{playlist: import('@/types.ts').MediaPlaylist | null, segment: import('@/types.ts').HlsSegment | null, segmentIndex: number}}
 */
function findHlsSegmentAndPlaylist(url) {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);
    if (!activeStream || activeStream.protocol !== 'hls') {
        return { playlist: null, segment: null, segmentIndex: -1 };
    }

    for (const playlist of activeStream.mediaPlaylists.values()) {
        const segmentIndex = (playlist.manifest.segments || []).findIndex(
            (s) => s.resolvedUrl === url
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

async function _fetchAndParseSegment(url, formatHint) {
    const { set } = useSegmentCacheStore.getState();
    try {
        set(url, { status: -1, data: null, parsedData: null });
        eventBus.dispatch('segment:pending', { url });

        const {
            playlist: mediaPlaylist,
            segment: hlsSegment,
            segmentIndex,
        } = findHlsSegmentAndPlaylist(url);
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
            const response = await fetch(url, {
                method: 'GET',
                cache: 'no-store',
            });
            if (!response.ok) {
                const errorEntry = {
                    status: response.status,
                    data: null,
                    parsedData: { error: `HTTP ${response.status}` },
                };
                set(url, errorEntry);
                eventBus.dispatch('segment:loaded', { url, entry: errorEntry });
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

        set(url, finalEntry);
        eventBus.dispatch('segment:loaded', { url, entry: finalEntry });
    } catch (error) {
        console.error(`Failed to fetch or parse segment ${url}:`, error);
        const errorEntry = {
            status: 0,
            data: null,
            parsedData: { error: error.message },
        };
        set(url, errorEntry);
        eventBus.dispatch('segment:loaded', { url, entry: errorEntry });
    }
}

export function getParsedSegment(url, formatHint = null) {
    const { get } = useSegmentCacheStore.getState();
    const cachedEntry = get(url);

    if (cachedEntry && cachedEntry.status !== -1 && cachedEntry.parsedData) {
        return cachedEntry.parsedData.error
            ? Promise.reject(new Error(cachedEntry.parsedData.error))
            : Promise.resolve(cachedEntry.parsedData);
    }

    return new Promise((resolve, reject) => {
        const onSegmentLoaded = ({ url: loadedUrl, entry }) => {
            if (loadedUrl === url) {
                unsubscribe();
                if (entry.status !== 200) {
                    reject(new Error(`HTTP ${entry.status} for ${url}`));
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
            _fetchAndParseSegment(url, formatHint);
        }
    });
}

export function initializeSegmentService() {
    eventBus.subscribe('segment:fetch', ({ url, format }) =>
        _fetchAndParseSegment(url, format)
    );
}
