/**
 * Estimates the size of a JavaScript object by serializing it to a JSON string.
 * This function runs inside the web worker to avoid blocking the main thread.
 * @param {any} object The object to measure.
 * @returns {number} The estimated size in bytes.
 */
function estimateObjectSize(object) {
    if (object === null || object === undefined) {
        return 0;
    }

    // A custom replacer is needed to handle complex types that JSON.stringify doesn't support natively.
    const replacer = (key, value) => {
        if (value instanceof Map) {
            return Array.from(value.entries());
        }
        if (value instanceof Set) {
            return Array.from(value.values());
        }
        if (value instanceof File || value instanceof ArrayBuffer) {
            return `[File/Buffer: ${value.constructor.name}]`;
        }
        // Defensive coding: Explicitly ignore LRUCache instances if they ever leak into the payload.
        if (value?.constructor?.name === 'LRUCache') {
            return '[LRUCache]';
        }
        return value;
    };

    try {
        const string = JSON.stringify(object, replacer);
        // Each character in a JavaScript string is typically 2 bytes (UTF-16).
        return string.length * 2;
    } catch (e) {
        // This can happen with circular references not caught by the replacer.
        console.warn('Could not estimate object size:', e);
        return 0;
    }
}

// --- PERFORMANCE REFACTORING ---
// Define representative "average" objects for log arrays. Calculating the size of these
// once and multiplying by the array length is vastly more performant than serializing
// the entire array from the main thread.
const AVG_NETWORK_EVENT_SIZE = estimateObjectSize({
    id: 'b78a9c2b-3e5f-4a1d-8c9f-6b3d1e2a5c4b',
    url: 'https://example.com/segment_12345.m4s',
    resourceType: 'video',
    streamId: 1,
    request: { method: 'GET', headers: { Range: 'bytes=0-1023' } },
    response: { status: 206, statusText: 'Partial Content', headers: { 'content-type': 'video/mp4' }, contentLength: 1024 },
    timing: { startTime: 12345.67, endTime: 12456.78, duration: 111.11, breakdown: null },
});

const AVG_PLAYER_EVENT_SIZE = estimateObjectSize({
    timestamp: '12:34:56',
    type: 'adaptation',
    details: 'Bitrate: 1500k → 2500k | Resolution: 720p → 1080p',
});

const AVG_HISTORY_EVENT_SIZE = estimateObjectSize({
    time: 123.45,
    bufferHealth: 25.6,
    bandwidth: 5e6,
    bitrate: 2.5e6,
});
// --- END REFACTORING ---

/**
 * Calculates the size of all application state objects passed from the main thread.
 * @param {object} statePayload - An object containing all the Zustand store states.
 * @returns {object} A breakdown of state sizes.
 */
function calculateApplicationStateSize(statePayload) {
    const { analysis, ui, player, network, decryption } = statePayload;

    const analysisSize = estimateObjectSize(analysis);
    const uiSize = estimateObjectSize(ui);
    const decryptionSize = estimateObjectSize(decryption);
    const segmentCacheIndexSize = 0;

    // --- PERFORMANCE REFACTORING ---
    // Use the lengths passed from the main thread to estimate the size of large arrays.
    const networkSize = (network.eventsLength || 0) * AVG_NETWORK_EVENT_SIZE;
    const playerLogSize = (player.eventLogLength || 0) * AVG_PLAYER_EVENT_SIZE;
    const playerHistorySize =
        ((player.abrHistoryLength || 0) + (player.playbackHistoryLength || 0)) *
        AVG_HISTORY_EVENT_SIZE;

    // Estimate the size of the static parts of the player state.
    const playerStaticSize = estimateObjectSize({
        isLoaded: player.isLoaded,
        playbackState: player.playbackState,
        currentStats: player.currentStats,
    });

    const playerSize = playerStaticSize + playerLogSize + playerHistorySize;
    // --- END REFACTORING ---

    return {
        analysis: analysisSize,
        ui: uiSize,
        player: playerSize,
        network: networkSize,
        decryption: decryptionSize,
        segmentCacheIndex: segmentCacheIndexSize,
        total:
            analysisSize + uiSize + playerSize + networkSize + decryptionSize,
    };
}

/**
 * The main handler for the 'calculate-memory-report' worker task.
 * @param {object} statePayload - The application state passed from the main thread.
 * @returns {object} The calculated application state size report.
 */
export function handleCalculateMemoryReport(statePayload) {
    const appStateSize = calculateApplicationStateSize(statePayload);
    // By returning the result, we resolve the promise on the main thread.
    return appStateSize;
}