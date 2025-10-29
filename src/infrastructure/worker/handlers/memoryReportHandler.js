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

/**
 * Calculates the size of all application state objects passed from the main thread.
 * @param {object} statePayload - An object containing all the Zustand store states.
 * @returns {object} A breakdown of state sizes.
 */
function calculateApplicationStateSize(statePayload) {
    const { analysis, ui, player, network, decryption } = statePayload;

    const analysisSize = estimateObjectSize(analysis);
    const uiSize = estimateObjectSize(ui);
    const playerSize = estimateObjectSize(player);
    const networkSize = estimateObjectSize(network);
    const decryptionSize = estimateObjectSize(decryption);

    // The segmentCacheIndex is no longer passed and its size is considered zero for this calculation.
    const segmentCacheIndexSize = 0;

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
