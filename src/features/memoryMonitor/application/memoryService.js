import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { usePlayerStore } from '@/state/playerStore';
import { useNetworkStore } from '@/state/networkStore';
import { useDecryptionStore } from '@/state/decryptionStore';
import { useMemoryStore, memoryActions } from '@/state/memoryStore';

const UPDATE_INTERVAL_MS = 2000;
let intervalId = null;

/**
 * Estimates the size of a JavaScript object by serializing it to a JSON string.
 * @param {any} object The object to measure.
 * @returns {number} The estimated size in bytes.
 */
function estimateObjectSize(object) {
    if (object === null || object === undefined) {
        return 0;
    }
    // A Map can't be stringified directly, so we convert it to an array of entries.
    const replacer = (key, value) => {
        if (value instanceof Map) {
            return Array.from(value.entries());
        }
        if (value instanceof Set) {
            return Array.from(value.values());
        }
        return value;
    };
    try {
        const string = JSON.stringify(object, replacer);
        // Each character in a JavaScript string is 2 bytes (UTF-16).
        return string.length * 2;
    } catch (e) {
        return 0; // In case of circular references or other errors
    }
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

function calculateApplicationStateSize() {
    const analysis = estimateObjectSize(useAnalysisStore.getState());
    const ui = estimateObjectSize(useUiStore.getState());
    const player = estimateObjectSize(usePlayerStore.getState());
    const network = estimateObjectSize(useNetworkStore.getState());
    const decryption = estimateObjectSize(useDecryptionStore.getState());
    const segmentCacheIndex = estimateObjectSize(
        useSegmentCacheStore.getState()
    );

    return {
        analysis,
        ui,
        player,
        network,
        decryption,
        segmentCacheIndex,
        total:
            analysis + ui + player + network + decryption + segmentCacheIndex,
    };
}

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

function updateMemoryReport() {
    const report = {
        jsHeap: getJsHeapSize(),
        segmentCache: calculateSegmentCacheSize(),
        appState: calculateApplicationStateSize(),
    };
    memoryActions.updateReport(report);
}

export const memoryService = {
    start() {
        if (intervalId) {
            clearInterval(intervalId);
        }
        updateMemoryReport(); // Initial report
        intervalId = setInterval(updateMemoryReport, UPDATE_INTERVAL_MS);
    },
    stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    },
};
