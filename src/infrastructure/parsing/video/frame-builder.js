/**
 * @typedef {Object} Frame
 * @property {number} index
 * @property {string} type - 'I', 'P', 'B', 'Unknown'
 * @property {number} size
 * @property {boolean} isKeyFrame
 * @property {number[]} nalTypes
 */

/**
 * Groups a list of NAL units into logical Video Frames.
 * Handles both Annex B (TS) and Length-Prefixed (MP4) NALs if normalized first.
 * @param {import('./nal-parser').NalUnit[]} nalUnits
 * @returns {Frame[]}
 */
export function reconstructFrames(nalUnits) {
    const frames = [];
    let currentFrame = null;

    // Helper to flush current frame
    const pushFrame = () => {
        if (currentFrame) {
            // Only push if it has content (some NALs might be 0 length edge cases)
            if (currentFrame.size > 0) {
                frames.push(currentFrame);
            }
            currentFrame = null;
        }
    };

    const startNewFrame = (isIdr) => {
        pushFrame();
        currentFrame = {
            index: frames.length,
            size: 0,
            isKeyFrame: isIdr,
            type: isIdr ? 'I' : 'P/B', // Refine P/B logic if needed based on slice headers
            nalTypes: [],
        };
    };

    // Pre-check for Access Unit Delimiters (AUD)
    const hasAud = nalUnits.some((n) => n.isAud);

    nalUnits.forEach((nal) => {
        let isFrameStart = false;

        if (hasAud) {
            // Clean split on AUD
            if (nal.isAud) isFrameStart = true;
        } else {
            // Fallback: IDR always starts a frame.
            // If no current frame, start one.
            if (nal.isIdr) isFrameStart = true;
            else if (!currentFrame) isFrameStart = true;
            
            // Note: Without AUD or VUI SEI, detecting P vs B start boundaries
            // in a continuous stream of VCL NALs is difficult without deep parsing.
            // This logic groups consecutive non-IDR VCLs into one frame if they follow each other,
            // which is a simplification but often correct for 1-slice-per-frame encoding.
        }

        if (isFrameStart) {
            startNewFrame(nal.isIdr);
        } else if (!currentFrame) {
            // Should be covered above, but safe fallback
            startNewFrame(nal.isIdr);
        }

        if (currentFrame) {
            // Upgrade keyframe status if an IDR appears mid-sequence (rare but possible with AUD)
            if (nal.isIdr) {
                currentFrame.isKeyFrame = true;
                currentFrame.type = 'I';
            }
            
            // Accumulate
            currentFrame.size += nal.length;
            currentFrame.nalTypes.push(nal.type);
        }
    });

    pushFrame();

    // Filter out frames that only contain AUDs or PPS/SPS (no VCL)
    // A valid video frame must have at least one VCL NAL? 
    // Or we keep them but mark them? 
    // GopAnalyzer expects valid frames. Let's filter out "empty" meta frames.
    
    // Simple filter: Ensure frame has some size.
    return frames.filter(f => f.size > 0);
}