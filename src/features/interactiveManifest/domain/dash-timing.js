/**
 * Calculates segment information based on DASH SegmentTemplate timing rules.
 * @param {object} params
 * @param {number} params.now - Current Wall Clock Time (ms).
 * @param {number} params.availabilityStartTime - MPD@availabilityStartTime (ms).
 * @param {number} params.periodStart - Period@start (seconds).
 * @param {number} params.timescale - SegmentTemplate@timescale.
 * @param {number} params.duration - SegmentTemplate@duration (ticks).
 * @param {number} params.startNumber - SegmentTemplate@startNumber.
 * @param {number} params.pto - SegmentTemplate@presentationTimeOffset (ticks).
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
    } = params;

    if (!timescale || !duration)
        return { error: 'Invalid Timescale or Duration' };

    const segmentDurationSec = duration / timescale;

    // 1. Calculate elapsed time since Period start (in seconds)
    // Time since AST = now - AST
    // Time in Period = (now - AST)/1000 - PeriodStart
    const timeSinceAstMs = now - availabilityStartTime;
    const timeInPeriodSec = timeSinceAstMs / 1000 - periodStart;

    // 2. Calculate Index
    // Index = floor(TimeInPeriod / SegmentDuration) + StartNumber
    // Note: This is a simplified "Live Edge" calculation.
    // Presentation Time = (Index - StartNumber) * Duration
    const rawIndex = Math.floor(timeInPeriodSec / segmentDurationSec);
    const segmentIndex = rawIndex + startNumber;

    // 3. Calculate Exact Timing (Ticks)
    // Scaled Time = (Index - StartNumber) * Duration
    const scaledTime = (segmentIndex - startNumber) * duration;
    const presentationTime = scaledTime - pto; // Adjust for PTO if needed, though URL usually uses unshifted

    // 4. Calculate Validity
    const segmentStartWallMs =
        availabilityStartTime +
        periodStart * 1000 +
        (scaledTime / timescale) * 1000;
    const segmentEndWallMs = segmentStartWallMs + segmentDurationSec * 1000;
    const isAvailable = now >= segmentEndWallMs; // Available after it finishes? Or starts? Usually availabilityTimeOffset matters here.

    return {
        segmentIndex,
        segmentDurationSec,
        timeInPeriodSec,
        presentationTime, // $Time$
        segmentStartWallMs,
        segmentEndWallMs,
        isAvailable,
    };
}
