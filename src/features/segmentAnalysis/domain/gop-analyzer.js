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
 * @property {string} summary.gopStructure - E.g., "Open" or "Closed"
 * @property {number} summary.bitrate - Estimated average bitrate
 */

/**
 * Analyzes the NAL unit stream to reconstruct frame structure.
 * Note: Without full decoding, distinction between P and B frames in simple parsing
 * is heuristic-based or requires parsing slice headers (bitstream parsing).
 * For this implementation, we will differentiate Keyframes (I) vs Non-Keyframes.
 * Full P/B distinction requires deeper bitstream parsing which we simplify here.
 *
 * @param {import('../../../infrastructure/parsing/video/nal-parser').NalUnit[]} nalUnits
 * @param {number} durationSec - Duration of the segment in seconds
 * @returns {GopAnalysis}
 */
export function analyzeGopStructure(nalUnits, durationSec) {
    const frames = [];
    let currentFrame = null;

    // Heuristic: A new VCL NAL usually implies a new Access Unit (Frame)
    // if the previous one was also a VCL, OR if specific delimiters are found.
    // Simplified grouping: We assume 1 VCL NAL per frame for simple stream structures,
    // or group adjacent VCLs if they belong to the same timestamp (which we lack here without deeper parsing).
    //
    // Robust Approach: Use the AUD (Access Unit Delimiter) if present.
    // AVC AUD: Type 9. HEVC AUD: Type 35.

    nalUnits.forEach((nal) => {
        const isAud = nal.type === 9 || nal.type === 35; // AVC 9, HEVC 35

        // If we hit an AUD, force a new frame
        if (isAud) {
            if (currentFrame) frames.push(currentFrame);
            currentFrame = {
                index: frames.length,
                type: 'Unknown', // Will be determined by VCLs
                size: 0,
                isKeyFrame: false,
                nalTypes: [],
            };
        }

        if (!currentFrame) {
            currentFrame = {
                index: 0,
                type: 'Unknown',
                size: 0,
                isKeyFrame: false,
                nalTypes: [],
            };
        }

        // If we hit a VCL and the current frame already has a VCL, it *might* be a slice of the same frame.
        // However, without timestamps, most reliable simple parser assumes 1 Frame = sequence starting with AUD or VCL.

        currentFrame.size += nal.length;
        currentFrame.nalTypes.push(nal.type);

        if (nal.isVcl) {
            if (nal.isIdr) {
                currentFrame.type = 'I';
                currentFrame.isKeyFrame = true;
            } else if (currentFrame.type === 'Unknown') {
                currentFrame.type = 'P/B'; // Generic non-keyframe
            }
        }
    });

    if (currentFrame) frames.push(currentFrame);

    // Filter out empty frames (e.g. just SEI/SPS/PPS at start) that didn't get a VCL
    // Actually, keep them but mark them as Metadata frames? No, let's filter for visual frames.
    const videoFrames = frames.filter((f) =>
        f.nalTypes.some((t) => t !== 9 && t !== 35)
    ); // Has more than just AUD

    const totalSize = videoFrames.reduce((sum, f) => sum + f.size, 0);
    const keyFrames = videoFrames.filter((f) => f.isKeyFrame);
    const gopLength =
        keyFrames.length > 1
            ? videoFrames.length / keyFrames.length
            : videoFrames.length; // If only 1 keyframe, GOP is the whole segment

    return {
        frames: videoFrames,
        summary: {
            totalFrames: videoFrames.length,
            avgFrameSize: totalSize / (videoFrames.length || 1),
            maxFrameSize: Math.max(...videoFrames.map((f) => f.size), 0),
            gopLength: parseFloat(gopLength.toFixed(1)),
            gopStructure:
                keyFrames.length > 0
                    ? frames[0].isKeyFrame
                        ? 'Closed (Starts with I)'
                        : 'Open (Starts with non-I)'
                    : 'Unknown',
            bitrate: durationSec > 0 ? (totalSize * 8) / durationSec : 0,
        },
    };
}
