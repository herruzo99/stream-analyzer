/**
 * Configuration for the Quality Analyzers.
 */
export const QC_THRESHOLDS = {
    // Video
    BLACK_LUMA_THRESHOLD: 16, // standard legal black is 16
    FREEZE_DIFF_THRESHOLD: 0.01, // 1% pixel difference allowed (noise)
    FREEZE_DURATION_MS: 2000, // Must remain static for 2s to trigger
    BLACK_DURATION_MS: 1000,

    // Audio
    SILENCE_DB_THRESHOLD: -60,
    SILENCE_DURATION_MS: 2000,
};

/**
 * Calculates basic luma statistics (Min, Max, Avg) from a pixel buffer.
 * Data is expected to be RGBA.
 * @param {Uint8ClampedArray} data
 * @returns {{ min: number, max: number, avg: number }}
 */
export function analyzeLuma(data) {
    let min = 255;
    let max = 0;
    let sum = 0;
    const len = data.length;
    const pixelCount = len / 4;

    // Optimization: Skip alpha, iterate by 4
    for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // BT.709 Luma coefficients
        // Y = 0.2126 R + 0.7152 G + 0.0722 B
        // Integer approximation: Y = (218 * R + 732 * G + 74 * B) >> 10
        // Using floating point for cleaner code in JS (engine optimizes this well now)
        const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        if (y < min) min = y;
        if (y > max) max = y;
        sum += y;
    }

    return {
        min,
        max,
        avg: sum / pixelCount,
    };
}

/**
 * Calculates the Mean Squared Error (MSE) between two frames.
 * Used for Freeze detection.
 * @param {Uint8ClampedArray} prevData
 * @param {Uint8ClampedArray} currData
 * @returns {number} Normalized difference (0.0 to 1.0)
 */
export function calculateTemporalDiff(prevData, currData) {
    if (!prevData || prevData.length !== currData.length) return 1.0;

    let diffSum = 0;
    const len = currData.length;
    // Optimization: Check every 4th pixel (stride 16 bytes) to save CPU.
    // Freeze detection doesn't need pixel-perfect precision.
    const STRIDE = 16;

    let samples = 0;
    for (let i = 0; i < len; i += STRIDE) {
        const rDiff = currData[i] - prevData[i];
        const gDiff = currData[i + 1] - prevData[i + 1];
        const bDiff = currData[i + 2] - prevData[i + 2];

        diffSum += Math.abs(rDiff) + Math.abs(gDiff) + Math.abs(bDiff);
        samples++;
    }

    // Max difference per pixel is 255 * 3 = 765
    return diffSum / (samples * 765);
}

/**
 * Converts linear amplitude to Decibels.
 * @param {number} value
 */
export function toDb(value) {
    if (value <= 0) return -100;
    return 20 * Math.log10(value);
}
