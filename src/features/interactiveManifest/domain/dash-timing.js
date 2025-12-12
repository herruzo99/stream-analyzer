/**
 * Represents a single entry in a SegmentTimeline.
 * @typedef {Object} TimelineEntry
 * @property {number} [t] - Start time (optional/derived).
 * @property {number} d - Duration.
 * @property {number} [r] - Repeat count (optional, defaults to 0).
 */

/**
 * Calculates segment information based on DASH SegmentTemplate rules.
 * Supports both fixed duration math and explicit SegmentTimeline traversal.
 * 
 * @param {object} params
 * @param {number} params.now - Current Wall Clock Time (ms).
 * @param {number} params.availabilityStartTime - MPD@availabilityStartTime (ms).
 * @param {number} params.periodStart - Period@start (seconds).
 * @param {number} params.timescale - SegmentTemplate@timescale.
 * @param {number} params.duration - SegmentTemplate@duration (ticks) [Optional if timeline present].
 * @param {number} params.startNumber - SegmentTemplate@startNumber.
 * @param {number} params.pto - SegmentTemplate@presentationTimeOffset (ticks).
 * @param {TimelineEntry[]} [params.timeline] - Parsed SegmentTimeline entries [Optional].
 * @returns {object} Calculated segment details.
 */
export function calculateDashSegment(params) {
    const {
        now,
        availabilityStartTime,
        periodStart,
        timescale,
        duration,
        startNumber,
        pto,
        timeline
    } = params;

    if (!timescale) return { error: 'Invalid Timescale' };

    // 1. Calculate Time in Period (seconds)
    // AST is the anchor. PeriodStart is relative to AST.
    const timeSinceAstMs = now - availabilityStartTime;
    const timeSinceAstSec = timeSinceAstMs / 1000;
    const timeInPeriodSec = timeSinceAstSec - periodStart;

    // Target Presentation Time (in ticks, relative to period zero)
    const targetTimeTicks = timeInPeriodSec * timescale;

    let segmentIndex = startNumber;
    let segmentStartTicks = 0;
    let segmentDurationTicks = 0;
    let found = false;

    // --- LOGIC BRANCH 1: SegmentTimeline ---
    if (timeline && timeline.length > 0) {
        let currentTicks = 0;
        let currentIdx = startNumber;

        // If the first element has a 't', that is our anchor.
        // Note: 't' in SegmentTimeline is usually absolute presentation time (including PTO).
        // We normalize to period-relative for calculation by subtracting PTO, 
        // because targetTimeTicks is period-relative.
        if (timeline[0].t !== undefined) {
            currentTicks = timeline[0].t - pto;
        }

        for (const entry of timeline) {
            const d = entry.d;
            const r = entry.r || 0;
            
            // Total duration of this run (original + r repeats)
            const runDuration = d * (r + 1);
            
            // Check if target is within this run
            if (targetTimeTicks >= currentTicks && targetTimeTicks < currentTicks + runDuration) {
                // Found it!
                const offsetInRun = targetTimeTicks - currentTicks;
                const indexInRun = Math.floor(offsetInRun / d);
                
                segmentIndex = currentIdx + indexInRun;
                segmentStartTicks = currentTicks + (indexInRun * d);
                segmentDurationTicks = d;
                found = true;
                break;
            }

            // Advance
            currentTicks += runDuration;
            currentIdx += (r + 1);
        }

        // If we passed the end of the timeline (future), we project based on the last known segment properties
        if (!found && timeline.length > 0) {
             segmentIndex = currentIdx; 
             segmentStartTicks = currentTicks;
             const lastD = timeline[timeline.length - 1].d;
             segmentDurationTicks = lastD;
        }
    } 
    // --- LOGIC BRANCH 2: Fixed Duration (Template@duration) ---
    else if (duration) {
        const segmentDurationSec = duration / timescale;
        // Avoid division by zero
        if (segmentDurationSec > 0) {
            const rawIndex = Math.floor(timeInPeriodSec / segmentDurationSec);
            segmentIndex = rawIndex + startNumber;
            
            const indexDiff = segmentIndex - startNumber;
            segmentStartTicks = indexDiff * duration;
            segmentDurationTicks = duration;
        }
    } 
    else {
        return { error: 'Missing Duration or Timeline' };
    }

    // Final Calculations
    // Presentation Time ($Time$) = StartTicks + PTO
    const presentationTime = segmentStartTicks + pto; 
    
    const segmentDurationSec = segmentDurationTicks / timescale;

    // Wall Clock Start = AST + PeriodStart + (ScaledTime / Timescale)
    const segmentStartWallMs = availabilityStartTime + (periodStart * 1000) + ((segmentStartTicks / timescale) * 1000);
    const segmentEndWallMs = segmentStartWallMs + (segmentDurationSec * 1000);

    // Availability Check
    const isAvailable = now >= segmentEndWallMs;

    return {
        segmentIndex,
        segmentDurationSec,
        timeInPeriodSec,
        presentationTime, // $Time$
        segmentStartWallMs,
        segmentEndWallMs,
        isAvailable,
        debug: {
            timeSinceAstSec,
            periodStart,
            indexDiff: segmentIndex - startNumber,
            durationTick: segmentDurationTicks,
            pto,
            scaledTime: segmentStartTicks,
            usingTimeline: !!(timeline && timeline.length > 0)
        }
    };
}