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
    // Scaled Time = (Index - StartNumber) * Duration (Relative to the first segment in the template sequence)
    const scaledTime = (segmentIndex - startNumber) * duration;

    // FIX: Presentation Time = Relative Time + Offset
    // Previously this was subtracted, causing negative values for large PTOs.
    // In DASH, the Presentation Time in the media segment roughly equals (PeriodStart + Relative) mapped to the media timeline via PTO.
    // Effectively: MediaTime = RelativeTime + PTO.
    const presentationTime = scaledTime + pto;

    // 4. Calculate Validity
    // Wall Clock Start = AST + PeriodStart + (ScaledTime / Timescale)
    // Note: We use scaledTime (relative) here because PeriodStart already accounts for the offset from AST.
    const segmentStartWallMs =
        availabilityStartTime +
        periodStart * 1000 +
        (scaledTime / timescale) * 1000;

    const segmentEndWallMs = segmentStartWallMs + segmentDurationSec * 1000;

    // Availability Check:
    // A segment is available if the current time is past its availability window start.
    // For simple cases, we assume availability matches end time (ignoring availabilityTimeOffset for basic calc).
    const isAvailable = now >= segmentEndWallMs;

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
