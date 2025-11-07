import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { usePlayerStore } from '@/state/playerStore';
import { useNetworkStore } from '@/state/networkStore';
import { useDecryptionStore } from '@/state/decryptionStore';
import { useMemoryStore, memoryActions } from '@/state/memoryStore';
import { workerService } from '@/infrastructure/worker/workerService';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { debugLog } from '@/shared/utils/debug';
import { eventBus } from '@/application/event-bus';

let tickerSubscription = null;

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
 * Prepares the complex analysis state for serialization, handling non-JSON-friendly types.
 * This still runs on the main thread but targets the most complex, but not largest, piece of state.
 * @param {object} analysisState The raw analysis state.
 * @returns {object} A serializable representation.
 */
function prepareAnalysisStateForWorker(analysisState) {
    const replacer = (key, value) => {
        if (
            key === 'parsedData' ||
            (key === 'data' && value instanceof ArrayBuffer)
        ) {
            return undefined;
        }
        if (value instanceof File) {
            return {
                isFilePlaceholder: true,
                name: value.name,
                type: value.type,
            };
        }
        if (value instanceof Map) {
            return Array.from(value.entries());
        }
        if (value instanceof Set) {
            return Array.from(value.values());
        }
        return value;
    };
    // The key change is to only stringify/parse the analysis state.
    // This is still a synchronous operation, but it's much smaller than the full app state
    // because we are now excluding the large log arrays.
    return JSON.parse(JSON.stringify(analysisState, replacer));
}

async function dispatchAndProcessMemoryCalculation() {
    const analysisState = useAnalysisStore.getState();
    const uiState = useUiStore.getState();
    const playerState = usePlayerStore.getState();
    const networkState = useNetworkStore.getState();
    const decryptionState = useDecryptionStore.getState();

    // PERFORMANCE REFACTOR:
    // Instead of serializing the entire state on the main thread, we now only
    // pre-process the most complex part (analysis state) and pass the *length*
    // of large log arrays to the worker. The worker then estimates the size.
    const statePayload = {
        analysis: prepareAnalysisStateForWorker({
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
            // Pass lengths instead of full arrays
            eventLogLength: playerState.eventLog.length,
            abrHistoryLength: playerState.abrHistory.length,
            playbackHistoryLength: playerState.playbackHistory.length,
        },
        network: {
            // Pass length instead of full array
            eventsLength: networkState.events.length,
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

/**
 * Checks if any player is currently active (playing or buffering).
 * @returns {boolean}
 */
function isAnyPlayerActive() {
    const { playbackState } = usePlayerStore.getState();
    if (playbackState === 'PLAYING' || playbackState === 'BUFFERING') {
        return true;
    }

    const { players } = useMultiPlayerStore.getState();
    for (const player of players.values()) {
        if (player.state === 'playing' || player.state === 'buffering') {
            return true;
        }
    }

    return false;
}

/**
 * Handles changes in player states to automatically start or stop memory monitoring.
 */
function _handlePlayerStateChange() {
    if (isAnyPlayerActive()) {
        memoryService.stop();
    } else {
        memoryService.start();
    }
}

export const memoryService = {
    /**
     * Sets up listeners to make the memory service playback-aware.
     */
    initialize() {
        usePlayerStore.subscribe(_handlePlayerStateChange);
        useMultiPlayerStore.subscribe(_handlePlayerStateChange);
        // Initial check
        _handlePlayerStateChange();
    },

    /**
     * Starts the periodic memory calculation if not already running.
     */
    start() {
        if (tickerSubscription) {
            return; // Already running
        }
        debugLog('MemoryService', 'Starting periodic memory analysis.');
        dispatchAndProcessMemoryCalculation(); // Run once immediately
        tickerSubscription = eventBus.subscribe(
            'ticker:two-second-tick',
            dispatchAndProcessMemoryCalculation
        );
    },

    /**
     * Stops the periodic memory calculation.
     */
    stop() {
        if (tickerSubscription) {
            debugLog(
                'MemoryService',
                'Stopping periodic memory analysis to yield to playback.'
            );
            tickerSubscription();
            tickerSubscription = null;
        }
    },
};
