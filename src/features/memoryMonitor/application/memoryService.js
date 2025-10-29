import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { usePlayerStore } from '@/state/playerStore';
import { useNetworkStore } from '@/state/networkStore';
import { useDecryptionStore } from '@/state/decryptionStore';
import { useMemoryStore, memoryActions } from '@/state/memoryStore';
import { workerService } from '@/infrastructure/worker/workerService';

const UPDATE_INTERVAL_MS = 3000;
let intervalId = null;

function getJsHeapSize() {
    const { isPerformanceApiSupported } = useMemoryStore.getState();
    if (!isPerformanceApiSupported) {
        return null;
    }
    const memoryInfo = /** @type {any} */ (performance).memory;
    return {
        used: memoryInfo.usedJSHeapSize,
        total: memoryInfo.totalJSHeapSize,
        limit: memoryInfo.jsHeapSizeLimit,
    };
}

function calculateSegmentCacheSize() {
    const { cache } = useSegmentCacheStore.getState();
    let size = 0;
    cache.forEach((entry) => {
        if (entry.data instanceof ArrayBuffer) {
            size += entry.data.byteLength;
        }
    });
    return size;
}

function updateMemoryReport(appStateSize) {
    const report = {
        jsHeap: getJsHeapSize(),
        segmentCache: calculateSegmentCacheSize(),
        appState: appStateSize,
    };
    memoryActions.updateReport(report);
}

/**
 * Deep clones the analysis state and removes any references to raw ArrayBuffer data
 * to create a pure metadata object that is safe to send to the worker.
 * @param {object} analysisState - The original state from the analysisStore.
 * @returns {object} A cleansed, serializable state object.
 */
function cleanseStateForWorker(analysisState) {
    // Manually reconstruct the stream objects to ensure no heavy data is included.
    const cleansedStreams = analysisState.streams.map((stream) => {
        const cleansedStream = { ...stream };

        // Remove references to parsed data on segments, which can hold ArrayBuffers.
        const cleanseSegments = (segments) => {
            if (!segments) return [];
            return segments.map((seg) => {
                const { parsedData, ...rest } = seg;
                return rest;
            });
        };

        cleansedStream.dashRepresentationState = new Map(
            Array.from(stream.dashRepresentationState.entries()).map(
                ([key, value]) => {
                    return [
                        key,
                        { ...value, segments: cleanseSegments(value.segments) },
                    ];
                }
            )
        );

        cleansedStream.hlsVariantState = new Map(
            Array.from(stream.hlsVariantState.entries()).map(([key, value]) => {
                return [
                    key,
                    { ...value, segments: cleanseSegments(value.segments) },
                ];
            })
        );

        if (cleansedStream.segments) {
            cleansedStream.segments = cleanseSegments(cleansedStream.segments);
        }

        return cleansedStream;
    });

    return {
        ...analysisState,
        streams: cleansedStreams,
    };
}

async function dispatchAndProcessMemoryCalculation() {
    const analysisState = useAnalysisStore.getState();
    const uiState = useUiStore.getState();
    const playerState = usePlayerStore.getState();
    const networkState = useNetworkStore.getState();
    const decryptionState = useDecryptionStore.getState();

    const statePayload = {
        analysis: cleanseStateForWorker({
            streams: analysisState.streams,
            activeStreamId: analysisState.activeStreamId,
            streamInputs: analysisState.streamInputs,
            segmentsForCompare: analysisState.segmentsForCompare,
            urlAuthMap: analysisState.urlAuthMap,
        }),
        ui: {
            viewState: uiState.viewState,
            activeTab: uiState.activeTab,
            activeSegmentUrl: uiState.activeSegmentUrl,
        },
        player: {
            isLoaded: playerState.isLoaded,
            playbackState: playerState.playbackState,
            currentStats: playerState.currentStats,
            eventLog: playerState.eventLog,
            abrHistory: playerState.abrHistory,
            playbackHistory: playerState.playbackHistory,
        },
        network: {
            events: networkState.events,
            filters: networkState.filters,
        },
        decryption: {
            keyCache: decryptionState.keyCache,
        },
    };

    try {
        const appStateSize = await workerService.postTask(
            'calculate-memory-report',
            statePayload
        ).promise;
        updateMemoryReport(appStateSize);
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Failed to calculate memory report:', error);
        }
    }
}

export const memoryService = {
    start() {
        if (intervalId) {
            clearInterval(intervalId);
        }
        dispatchAndProcessMemoryCalculation();
        intervalId = setInterval(
            dispatchAndProcessMemoryCalculation,
            UPDATE_INTERVAL_MS
        );
    },
    stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    },
};
