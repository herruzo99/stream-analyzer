/**
 * @typedef {object} FrameInfo
 * @property {number} index
 * @property {string} type - 'I', 'P', 'B', or 'Unknown'
 * @property {number} size - Total size in bytes
 * @property {boolean} isKeyFrame
 * @property {number[]} nalTypes
 */

/**
 * @typedef {object} GopAnalysis
 * @property {FrameInfo[]} frames
 * @property {object} summary
 * @property {number} summary.totalFrames
 * @property {number} summary.avgFrameSize
 * @property {number} summary.maxFrameSize
 * @property {number} summary.gopLength - Average GOP length
 * @property {number} summary.minGopLength - Minimum GOP length
 * @property {number} summary.maxGopLength - Maximum GOP length
 * @property {string} summary.gopStructure - E.g., "Open" or "Closed"
 * @property {number} summary.bitrate - Estimated average bitrate
 * @property {number} summary.bpp - Bits Per Pixel (Quality heuristic)
 * @property {number} summary.iFrameRatio - Ratio of avg I-frame size to avg P-frame size
 * @property {number} summary.variability - Coefficient of variation in frame size
 */

/**
 * Calculates GOP statistics from a list of pre-constructed frames.
 * @param {FrameInfo[]} videoFrames
 * @param {number} durationSec
 * @param {number} width - Video width (for BPP)
 * @param {number} height - Video height (for BPP)
 * @returns {GopAnalysis}
 */
export function calculateGopStatistics(
    videoFrames,
    durationSec,
    width = 0,
    height = 0
) {
    const totalSize = videoFrames.reduce((sum, f) => sum + f.size, 0);
    const keyFrames = videoFrames.filter((f) => f.isKeyFrame);
    const pFrames = videoFrames.filter((f) => !f.isKeyFrame); // Simplified (P+B)

    let minGop = Infinity;
    let maxGop = -Infinity;
    let gopSum = 0;
    let gopCount = 0;

    if (keyFrames.length > 1) {
        for (let i = 1; i < keyFrames.length; i++) {
            const dist = keyFrames[i].index - keyFrames[i - 1].index;
            if (dist < minGop) minGop = dist;
            if (dist > maxGop) maxGop = dist;
            gopSum += dist;
            gopCount++;
        }
    } else if (keyFrames.length === 1) {
        const dist = videoFrames.length;
        minGop = dist;
        maxGop = dist;
        gopSum = dist;
        gopCount = 1;
    } else {
        minGop = 0;
        maxGop = 0;
    }

    const avgGopLength = gopCount > 0 ? gopSum / gopCount : videoFrames.length;
    const avgFrameSize = totalSize / (videoFrames.length || 1);
    const bitrate = durationSec > 0 ? (totalSize * 8) / durationSec : 0;

    // --- New Advanced Metrics ---

    // 1. Bits Per Pixel (BPP)
    // Formula: Bitrate / (PixelCount * FPS)
    // FPS can be approximated by totalFrames / duration
    let bpp = 0;
    if (width > 0 && height > 0 && durationSec > 0 && videoFrames.length > 0) {
        const fps = videoFrames.length / durationSec;
        const pixelCount = width * height;
        if (pixelCount > 0 && fps > 0) {
            bpp = bitrate / (pixelCount * fps);
        }
    }

    // 2. I-Frame Weight Ratio
    let iFrameRatio = 0;
    if (keyFrames.length > 0 && pFrames.length > 0) {
        const avgI =
            keyFrames.reduce((s, f) => s + f.size, 0) / keyFrames.length;
        const avgP = pFrames.reduce((s, f) => s + f.size, 0) / pFrames.length;
        iFrameRatio = avgP > 0 ? avgI / avgP : 0;
    }

    // 3. Variability (Standard Deviation / Mean)
    const variance =
        videoFrames.reduce(
            (sum, f) => sum + Math.pow(f.size - avgFrameSize, 2),
            0
        ) / videoFrames.length;
    const stdDev = Math.sqrt(variance);
    const variability = avgFrameSize > 0 ? stdDev / avgFrameSize : 0;

    return {
        frames: videoFrames,
        summary: {
            totalFrames: videoFrames.length,
            avgFrameSize: avgFrameSize,
            maxFrameSize: Math.max(...videoFrames.map((f) => f.size), 0),
            gopLength: parseFloat(avgGopLength.toFixed(1)),
            minGopLength: minGop === Infinity ? 0 : minGop,
            maxGopLength: maxGop === -Infinity ? 0 : maxGop,
            gopStructure:
                keyFrames.length > 0
                    ? videoFrames[0].isKeyFrame
                        ? 'Closed'
                        : 'Open'
                    : 'Unknown',
            bitrate: bitrate,
            bpp: parseFloat(bpp.toFixed(4)),
            iFrameRatio: parseFloat(iFrameRatio.toFixed(1)),
            variability: parseFloat(variability.toFixed(2)),
        },
    };
}

/**
 * (Legacy wrapper kept for backward compat, updated to pass 0 resolution)
 */
export function analyzeGopStructure(nalUnits, durationSec) {
    const frames = [];
    // ... (Keep existing extraction logic unchanged for legacy text parsing) ...
    // Note: For brevity, we assume the extraction logic matches the previous file.
    // The important part is delegating calculation.

    // Simple re-implementation of frame construction for safety:
    let currentFrame = null;
    nalUnits.forEach((nal) => {
        const isAud = nal.type === 9 || nal.type === 35;
        if (isAud) {
            if (currentFrame) frames.push(currentFrame);
            currentFrame = {
                index: frames.length,
                type: 'Unknown',
                size: 0,
                isKeyFrame: false,
                nalTypes: [],
            };
        }
        if (!currentFrame)
            currentFrame = {
                index: 0,
                type: 'Unknown',
                size: 0,
                isKeyFrame: false,
                nalTypes: [],
            };
        currentFrame.size += nal.length;
        currentFrame.nalTypes.push(nal.type);
        if (nal.isVcl) {
            if (nal.isIdr) {
                currentFrame.type = 'I';
                currentFrame.isKeyFrame = true;
            } else if (currentFrame.type === 'Unknown') {
                currentFrame.type = 'P/B';
            }
        }
    });
    if (currentFrame) frames.push(currentFrame);
    const videoFrames = frames.filter((f) =>
        f.nalTypes.some((t) => t !== 9 && t !== 35)
    );

    return calculateGopStatistics(videoFrames, durationSec, 0, 0);
}
