import {
    findChildrenRecursive,
    getAttr,
    getInheritedElement,
} from '@/infrastructure/parsing/utils/recursive-parser';
import { isDebugMode } from '@/shared/utils/env';

/** Dev-only tracing (prints with ?debug=1). */
const devLog = (...args) => {
    if (isDebugMode) console.log(...args);
};
const devWarn = (...args) => {
    if (isDebugMode) console.warn(...args);
};

/**
 * Extracts timing configuration from a Representation context.
 * @param {object} rep - Representation element.
 * @param {object} as - AdaptationSet element.
 * @param {object} period - Period element.
 * @returns {object|null} Timing configuration or null if not found.
 */
export function extractTimingConfig(rep, as, period, baseUrl) {
    const hierarchy = [rep, as, period];
    const template = getInheritedElement('SegmentTemplate', hierarchy);

    if (!template) {
        // console.warn('[DashTiming] SegmentTemplate not found for rep:', getAttr(rep, 'id'));
        return null;
    }

    let duration = parseFloat(getAttr(template, 'duration'));
    let timeline = null;

    const timelineEl = findChildrenRecursive(template, 'SegmentTimeline')[0];
    if (timelineEl) {
        timeline = findChildrenRecursive(timelineEl, 'S').map((s) => ({
            t: getAttr(s, 't') ? parseInt(getAttr(s, 't'), 10) : undefined,
            d: parseInt(getAttr(s, 'd'), 10),
            r: getAttr(s, 'r') ? parseInt(getAttr(s, 'r'), 10) : 0,
        }));
    }

    // Heuristic for missing duration when timeline exists
    if (isNaN(duration) && timeline) {
        // Calculate max duration from timeline for estimation
        duration = timeline.reduce((max, entry) => Math.max(max, entry.d), 0);
    }

    let mediaTemplate = getAttr(template, 'media');
    if (baseUrl && mediaTemplate && !mediaTemplate.startsWith('http')) {
        // Ensure proper joining
        if (!baseUrl.endsWith('/') && !mediaTemplate.startsWith('/')) {
            mediaTemplate = baseUrl + '/' + mediaTemplate;
        } else if (baseUrl.endsWith('/') && mediaTemplate.startsWith('/')) {
            mediaTemplate = baseUrl + mediaTemplate.substring(1);
        } else {
            mediaTemplate = baseUrl + mediaTemplate;
        }
    }

    return {
        id: getAttr(rep, 'id'),
        bandwidth: parseInt(getAttr(rep, 'bandwidth') || '0', 10),
        contentType: getAttr(as, 'contentType') || 'unknown',
        timescale: parseFloat(getAttr(template, 'timescale') || '1'),
        duration: duration,
        startNumber: parseInt(getAttr(template, 'startNumber') || '1'),
        pto: parseFloat(getAttr(template, 'presentationTimeOffset') || '0'),
        mediaTemplate: mediaTemplate,
        timeline: timeline,
        baseUrl: baseUrl, // Return baseUrl for SegmentBase/List fallback
    };
}

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
 * @param {object} trackConfig - Object containing segment template properties.
 * @param {number} trackConfig.timescale - SegmentTemplate@timescale.
 * @param {number} [trackConfig.duration] - SegmentTemplate@duration (ticks) [Optional if timeline present].
 * @param {number} trackConfig.startNumber - SegmentTemplate@startNumber.
 * @param {number} trackConfig.pto - SegmentTemplate@presentationTimeOffset (ticks).
 * @param {TimelineEntry[]} [trackConfig.timeline] - Parsed SegmentTimeline entries [Optional].
 * @param {string} [trackConfig.mediaTemplate] - SegmentTemplate@media [Optional].
 * @param {string} [trackConfig.id] - Representation@id [Optional].
 * @param {number} [trackConfig.bandwidth] - Representation@bandwidth [Optional].
 * @param {string} [trackConfig.baseUrl] - BaseURL for the representation [Optional].
 * @param {number} availabilityStartTime - MPD@availabilityStartTime (ms).
 * @param {number} periodStart - Period@start (seconds).
 * @param {number} now - Current Wall Clock Time (ms).
 * @param {number} wallClockTime - Current wall clock time in ms (for availability check).
 * @param {number} spd - Suggested Presentation Delay in seconds.
 * @param {number} timeShiftBufferDepth - Time Shift Buffer Depth in seconds.
 * @returns {object} Calculation result.
 */
export function calculateDashSegment(
    trackConfig,
    availabilityStartTime,
    periodStart,
    now,
    wallClockTime,
    spd,
    timeShiftBufferDepth,
    manifestUrl
) {
    const { timescale, duration, startNumber, pto, timeline } = trackConfig;

    // Default SPD to 0 if not provided (though now it's a direct param, so it should always be provided)
    spd = spd || 0;
    // wallClockTime is now a direct parameter, no default to 'now' needed here.

    if (!timescale) return { error: 'Invalid Timescale' };

    // ... (Keep existing logic up to Availability Check) ...

    // 1. Calculate Time in Period (seconds)
    // AST is the anchor. PeriodStart is relative to AST.
    const timeSinceAstMs = now - availabilityStartTime;
    const timeSinceAstSec = timeSinceAstMs / 1000;
    const timeInPeriodSec = timeSinceAstSec - periodStart;

    // Calculate target time in ticks (relative to Period Start)
    // If SegmentTimeline uses absolute ticks (t >= PTO), we need to adjust targetTimeTicks to match the timeline's coordinate space.
    // We assume that if PTO > 0, the timeline 't' values likely start around PTO.
    // So we add PTO to the target ticks for lookup.
    // Use Math.round to avoid floating point jitter near integer boundaries
    const targetTimeTicks =
        Math.round(timeInPeriodSec * timescale) + (pto || 0);

    let segmentIndex = startNumber;
    let segmentStartTicks = 0;
    let segmentDurationTicks = 0;
    let found = false;

    // Debug object to populate
    // const debug = {
    //     targetTimeTicks,
    //     timeInPeriodSec,
    //     matchedEntry: null,
    //     scaledTime: targetTimeTicks,
    //     availability: {
    //         now: now,
    //         spd: spd,
    //         wallClock: wallClockTime,
    //         diff: 0
    //     }
    // };

    let currentIdx = startNumber;
    let sElementIndex = -1;
    let matchedSElement = null;

    // --- LOGIC BRANCH 1: SegmentTimeline ---
    if (timeline && timeline.length > 0) {
        let currentTicks = 0;
        // If the first element has a 't' attribute, use it as the start time.
        // Otherwise, it starts at 0 (or PTO? Spec says 0 relative to PeriodStart, but if PTO is present...)
        // Actually, if PTO is present, usually 't' starts at PTO.
        // If 't' is missing, it defaults to 0.
        // But we just added PTO to targetTimeTicks, so we should be consistent.

        // If the first element has a 't', that is our anchor.
        // Note: 't' in SegmentTimeline is usually absolute presentation time (including PTO).
        // We now assume targetTimeTicks is also in this absolute space (due to adding PTO).
        // So, we use 't' directly if present, otherwise it starts at 0 (relative to period start, then PTO is added to targetTimeTicks).
        // DEBUG: Log timeline start
        if (isDebugMode && currentIdx % 1000 === 0) {
            devLog('[DashTiming] Timeline Check:', {
                t0: timeline[0].t,
                d0: timeline[0].d,
                r0: timeline[0].r,
                pto,
                targetTimeTicks,
                timeInPeriodSec,
            });
        }

        if (timeline[0].t !== undefined) {
            currentTicks = timeline[0].t;
        } else {
            // Fallback: If t is missing on first element, default to PTO.
            currentTicks = pto || 0;
            devWarn(
                '[DashTiming] Missing t on first S element! Defaulting to PTO:',
                currentTicks
            );
        }

        // --- Backward Projection (Before Timeline Start) ---
        if (targetTimeTicks < currentTicks) {
            // We are before the first segment in the timeline.
            // Do NOT project backwards. Return null/error.
            return { error: 'Time outside available segments (before start)' };
        } else {
            sElementIndex = 0;
            for (const entry of timeline) {
                // CRITICAL FIX: Respect explicit 't' on ANY S element, not just the first one.
                // This handles discontinuities and explicit timing updates from the packager.
                if (entry.t !== undefined) {
                    currentTicks = entry.t;
                }

                const d = entry.d;
                const r = entry.r || 0;

                // Handle open-ended repeat (r < 0) - usually means "until end"
                // For calculation purposes, if it's the last element, we treat it as covering the rest.

                let runDuration = 0;
                // let effectiveR = r;

                if (r < 0) {
                    // If r is negative, it effectively means "repeat indefinitely".
                    // effectiveR = Infinity;
                    runDuration = Infinity;
                } else {
                    runDuration = d * (r + 1);
                }

                // Check if target is within this run
                if (
                    targetTimeTicks >= currentTicks &&
                    (r < 0 || targetTimeTicks < currentTicks + runDuration)
                ) {
                    // Found it!
                    const offsetInRun = targetTimeTicks - currentTicks;
                    const indexInRun = Math.floor(offsetInRun / d);

                    segmentIndex = currentIdx + indexInRun;
                    segmentStartTicks = currentTicks + indexInRun * d;
                    segmentDurationTicks = d;
                    found = true;
                    matchedSElement = { t: currentTicks, d: d, r: r };
                    break;
                }

                // Advance
                if (r >= 0) {
                    currentTicks += runDuration;
                    currentIdx += r + 1;
                }
                sElementIndex++;
            }

            // If we passed the end of the timeline (future), we do NOT project.
            if (!found) {
                // For visualization purposes, we might want to know which S element "would" cover this time if it continued?
                // Or just say it's outside.
                // If we are strictly following the timeline, we can't project beyond the last S element unless r < 0.
                // But if the user wants to see "future" segments based on the last S element's duration, we could allow it?
                // The current implementation returns an error, which is correct for strict DASH.
                // However, for the "S Grouping" feature, we need to know the S index if we *were* to project.
                // But since we return an error, the UI won't render it anyway.
                // So the current logic is fine: if it's not in the timeline, it's not in an S-element.
                return { error: 'Time outside available segments (after end)' };
            }
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
    } else {
        return { error: 'Missing Duration or Timeline' };
    }

    // Final Calculations
    // Presentation Time ($Time$) = StartTicks - PTO (because StartTicks includes PTO offset)
    const presentationTime = segmentStartTicks - pto;

    const segmentDurationSec = segmentDurationTicks / timescale;

    // Wall Clock Start = AST + PeriodStart + (ScaledTime / Timescale)
    const segmentStartWallMs =
        availabilityStartTime +
        periodStart * 1000 +
        (presentationTime / timescale) * 1000;
    const segmentEndWallMs = segmentStartWallMs + segmentDurationSec * 1000;

    // Availability Check
    // Segment is available if WallClockTime >= SegmentEnd
    // AND if it hasn't fallen out of the TimeShiftBufferDepth (DVR window)
    const isAvailableStart = wallClockTime >= segmentEndWallMs;
    let isWithinWindow = true;
    if (timeShiftBufferDepth && timeShiftBufferDepth > 0) {
        // The segment start must be after (WallClock - BufferDepth)
        // Actually, usually the availability window is defined such that the segment is available
        // as long as its start time is within the window? Or end time?
        // DASH spec: Segment is available if sum of its start time and duration is greater than (Now - TSB).
        // So SegmentEnd > (Now - TSB)
        const availabilityStartTimeLimit =
            wallClockTime - timeShiftBufferDepth * 1000;
        isWithinWindow = segmentEndWallMs > availabilityStartTimeLimit;
    }

    const isAvailable = isAvailableStart && isWithinWindow;

    // Safe to Play Check
    // If SPD is provided, we check if we are past the SPD buffer relative to the segment end.
    // Usually SPD is a delay from Live Edge.
    // If WallClockTime is Live Edge, then SafeToPlay means WallClockTime >= SegmentEnd + SPD?
    // No, SPD means we should play at LiveEdge - SPD.
    // So if Playhead (now) <= WallClockTime - SPD, it is safe.
    // But here we are checking if a specific SEGMENT is safe.
    // A segment is safe if it is fully available and we are not playing too close to the edge?
    // Let's define SafeToPlay as: Is the segment fully available? (Same as isAvailable for now, unless we want to enforce SPD buffer)
    // Actually, if the user wants to "take into account SPD", maybe they mean isAvailable should include SPD?
    // Let's stick to isAvailable = wallClockTime >= segmentEndWallMs.

    const isSafeToPlay = isAvailable;

    // --- Calculation Steps for Whiteboard ---
    const calculationSteps = [];

    // Step 0: Playhead Input
    const liveEdgeOffsetsMs = wallClockTime - now;

    calculationSteps.push({
        label: 'Playhead (Simulation Time)',
        type: 'input',
        formula: 'SimulationTime = Playhead',
        value: `@{SimulationTime:${now}ms (${new Date(now).toISOString()})} = @{Playhead:${now}ms}`,
        note: `Offset from Live Edge: -${liveEdgeOffsetsMs}ms`,
    });

    // Step 1: Time Normalization
    calculationSteps.push({
        label: 'Time Normalization',
        type: 'calculation',
        formula: 'Playhead - AvailabilityStart = TimeSinceAST',
        value: `@{Playhead:${now}ms (${new Date(now).toISOString()})} - @{AvailabilityStart:${availabilityStartTime}ms (${new Date(availabilityStartTime).toISOString()})} = @{TimeSinceAST:${timeSinceAstMs}ms}`,
        note: 'Calculate time elapsed since Availability Start Time',
    });

    // Step 2: Period Offset
    calculationSteps.push({
        label: 'Period Offset',
        type: 'calculation',
        formula: 'TimeSinceAST - PeriodStart = TimeInPeriod',
        value: `@{TimeSinceAST:${timeSinceAstMs}ms} - @{PeriodStart:${periodStart * 1000}ms} = @{TimeInPeriod:${(timeInPeriodSec * 1000).toFixed(0)}ms}`,
        note: 'Adjust time to be relative to the start of the current Period',
    });

    // Step 3: Timescale Scaling
    calculationSteps.push({
        label: 'Timescale Scaling',
        type: 'calculation',
        formula: 'round(TimeInPeriod * Timescale) + PTO = TargetTimeTicks',
        value: `round(@{TimeInPeriod:${timeInPeriodSec.toFixed(3)}s} * @{Timescale:${timescale}}) + @{PTO:${pto || 0}} = @{TargetTimeTicks:${targetTimeTicks}}`,
        note: 'Convert seconds to media ticks and apply Presentation Time Offset',
    });

    // Step 4: Segment Identification
    if (timeline && timeline.length > 0) {
        calculationSteps.push({
            label: 'Segment Search (Timeline)',
            type: 'calculation',
            formula: 'SegmentStartTicks <= TargetTimeTicks < SegmentEnd',
            value: found
                ? `@{SegmentStartTicks:${segmentStartTicks}} <= @{TargetTimeTicks:${targetTimeTicks}} < @{SegmentEnd:${segmentStartTicks + segmentDurationTicks}}`
                : `Projected at index @{SegmentIndex:${segmentIndex}}`,
            note: found
                ? `Matched S element (t=${matchedSElement?.t}, d=${matchedSElement?.d})`
                : 'Target time is outside explicit timeline, projected from nearest segment',
        });
    } else {
        calculationSteps.push({
            label: 'Segment Search (Template)',
            type: 'calculation',
            formula:
                'floor(TimeInPeriod / DurationSec) + StartNumber = SegmentIndex',
            value: `floor(@{TimeInPeriod:${timeInPeriodSec.toFixed(3)}s} / @{DurationSec:${(duration / timescale).toFixed(3)}s}) + @{StartNumber:${startNumber}} = @{SegmentIndex:${segmentIndex}}`,
            note: 'Calculate index based on fixed duration',
        });
    }

    // Step 5: Presentation Time
    calculationSteps.push({
        label: 'Presentation Time',
        type: 'output',
        formula: 'SegmentStartTicks - PTO = PresentationTime',
        value: `@{SegmentStartTicks:${segmentStartTicks}} - @{PTO:${pto || 0}} = @{PresentationTime:${presentationTime}}`,
        note: 'Calculate final presentation time for the segment',
    });

    // Step 6: Wall Clock Derivation
    calculationSteps.push({
        label: 'Wall Clock Start',
        type: 'output',
        formula:
            'AvailabilityStart + PeriodStart + (PresentationTime / Timescale) = WallClockStart',
        value: `@{AvailabilityStart:${availabilityStartTime}ms} + @{PeriodStart:${periodStart * 1000}ms} + (@{PresentationTime:${presentationTime}}/@{Timescale:${timescale}}) = @{WallClockStart:${segmentStartWallMs}ms (${new Date(segmentStartWallMs).toISOString()})}`,
        note: 'Convert segment presentation time back to absolute wall clock time',
    });

    // Step 7: Availability Check
    calculationSteps.push({
        label: 'Availability Check',
        type: 'check',
        formula: 'LiveEdge >= SegmentEnd = IsAvailable',
        value: `@{LiveEdge:${wallClockTime}ms (${new Date(wallClockTime).toISOString()})} >= @{SegmentEnd:${segmentEndWallMs}ms (${new Date(segmentEndWallMs).toISOString()})}`,
        note: isAvailable
            ? 'TRUE: Segment is available for download'
            : `FALSE: Segment is in the future (Wait ${(segmentEndWallMs - wallClockTime).toFixed(0)}ms)`,
    });

    if (timeShiftBufferDepth && timeShiftBufferDepth > 0) {
        const availabilityStartTimeLimit =
            wallClockTime - timeShiftBufferDepth * 1000;
        calculationSteps.push({
            label: 'DVR Window Check',
            type: 'check',
            formula: 'SegmentEnd > DVRWindowStart = IsWithinWindow',
            value: `@{SegmentEnd:${segmentEndWallMs}ms (${new Date(segmentEndWallMs).toISOString()})} > @{DVRWindowStart:${availabilityStartTimeLimit}ms (${new Date(availabilityStartTimeLimit).toISOString()})}`,
            note: isWithinWindow
                ? 'TRUE: Segment is inside DVR window'
                : 'FALSE: Segment has fallen out of DVR window',
        });
    }

    // Step 9: Template Substitution
    let templateKey = '$Number$';
    let templateValue = segmentIndex;
    if (
        trackConfig.mediaTemplate &&
        trackConfig.mediaTemplate.includes('$Time$')
    ) {
        templateKey = '$Time$';
        templateValue = segmentStartTicks; // Usually Time is the start ticks
    }

    calculationSteps.push({
        label: 'Template Substitution',
        type: 'calculation',
        formula: `Template(${templateKey}) -> Value`,
        value: `@{TemplateKey:${templateKey}} -> @{TemplateValue:${templateValue}}`,
        note: `Replacing ${templateKey} in the segment template`,
    });

    // Step 10: URL Generation
    // We need to construct the URL here or pass it in.
    // Since we are in domain logic, we might not have the full URL construction logic or BaseURL easily.
    // But we can approximate or show the template.
    // Actually, the caller (modal) constructs the URL.
    // Let's add a placeholder or try to construct    // Step 10: URL Generation
    if (trackConfig.mediaTemplate) {
        const relativeUrl = trackConfig.mediaTemplate
            .replace(/\$Number\$/g, String(segmentIndex))
            .replace(/\$Time\$/g, String(segmentStartTicks))
            .replace(/\$RepresentationID\$/g, String(trackConfig.id))
            .replace(/\$Bandwidth\$/g, String(trackConfig.bandwidth));

        // Calculate Manifest Base URL (strip filename like index.mpd)
        const manifestBase = manifestUrl
            ? manifestUrl.substring(0, manifestUrl.lastIndexOf('/') + 1)
            : '';

        let effectiveBaseUrl = trackConfig.baseUrl;

        if (!effectiveBaseUrl) {
            effectiveBaseUrl = manifestBase;
        } else if (
            !effectiveBaseUrl.startsWith('http') &&
            !effectiveBaseUrl.startsWith('//')
        ) {
            // Resolve relative BaseURL against Manifest Base
            effectiveBaseUrl = manifestBase + effectiveBaseUrl;
        }

        // Ensure proper slash separator
        if (
            effectiveBaseUrl &&
            !effectiveBaseUrl.endsWith('/') &&
            !relativeUrl.startsWith('/')
        ) {
            effectiveBaseUrl += '/';
        }

        const fullUrl = effectiveBaseUrl + relativeUrl;

        // Clean up double slashes (preserve http://)
        // fullUrl = fullUrl.replace(/([^:]\/)\/+/g, '$1'); // Careful with this, might break if effectiveBaseUrl was empty?

        calculationSteps.push({
            label: 'Segment URL Generation',
            type: 'output',
            formula: 'BaseURL + RelativeURL = FullURL',
            value: `@{BaseURL:${effectiveBaseUrl || '...'}} + @{RelativeURL:${relativeUrl}} = \n${fullUrl}`,
            note: 'Final resolved URL for the segment',
            action: {
                type: 'inspect',
                label: 'Inspect',
                url: fullUrl,
                repId: trackConfig.id,
            },
        });
    } else if (trackConfig.baseUrl) {
        // Fallback for SegmentBase / SegmentList (Single File or predefined list)
        // If mediaTemplate is missing, we assume the BaseURL points to the representation file

        let fullUrl = trackConfig.baseUrl;

        // Resolve against manifest if needed
        const manifestBase = manifestUrl
            ? manifestUrl.substring(0, manifestUrl.lastIndexOf('/') + 1)
            : '';
        if (!fullUrl.startsWith('http') && !fullUrl.startsWith('//')) {
            fullUrl = manifestBase + fullUrl;
        }

        calculationSteps.push({
            label: 'Segment URL Generation',
            type: 'output',
            formula: 'BaseURL (SegmentBase) = FullURL',
            value: `@{BaseURL:${fullUrl}}`,
            note: 'Using BaseURL as segment URL (SegmentBase/List)',
            action: {
                type: 'inspect',
                label: 'Inspect',
                url: fullUrl,
                repId: trackConfig.id,
            },
        });
    }

    // Determine runStartTicks for debug
    let runStartTicks = 0;
    if (timeline && timeline.length > 0) {
        if (found) {
            runStartTicks =
                segmentStartTicks -
                (segmentIndex - currentIdx) * segmentDurationTicks;
        } else {
            runStartTicks =
                segmentStartTicks -
                (segmentIndex - currentIdx) * segmentDurationTicks;
        }
    }

    // Determine label for UI
    let segmentLabel = `#${segmentIndex}`;
    if (
        trackConfig.mediaTemplate &&
        trackConfig.mediaTemplate.includes('$Time$')
    ) {
        segmentLabel = String(segmentStartTicks);
    } else if (
        trackConfig.mediaTemplate &&
        trackConfig.mediaTemplate.includes('$Number$')
    ) {
        segmentLabel = `#${segmentIndex}`;
    }

    return {
        segmentIndex,
        segmentLabel, // New property for UI
        segmentDurationSec,
        timeInPeriodSec,
        presentationTime, // $Time$
        segmentStartWallMs,
        segmentEndWallMs,
        isAvailable,
        isSafeToPlay,
        sElementIndex: found
            ? sElementIndex
            : timeline?.length
              ? timeline.length - 1
              : -1,
        debug: {
            ast: availabilityStartTime,
            timeSinceAstSec,
            timeInPeriod: timeInPeriodSec,
            periodStart,
            targetTimeTicks,
            indexDiff: segmentIndex - startNumber,
            durationTick: segmentDurationTicks,
            pto,
            scaledTime: segmentStartTicks,
            usingTimeline: !!(timeline && timeline.length > 0),
            spd,
            calculationSteps, // Added steps
            matchedEntry: {
                t: segmentStartTicks,
                d: segmentDurationTicks,
                r: found
                    ? (timeline?.[currentIdx]?.r ?? 0)
                    : timeline?.length
                      ? (timeline[timeline.length - 1]?.r ?? 0)
                      : 0,
                entryIndex: currentIdx,
                sElementIndex: found
                    ? sElementIndex
                    : timeline?.length
                      ? timeline.length - 1
                      : -1,
                runStartTicks: runStartTicks,
                manifestRunStart: runStartTicks + pto, // The 't' value of the S element (absolute)
                isProjected: !found,
                isBeforeStart: segmentIndex < startNumber,
                manifestSegmentStart: segmentStartTicks + pto, // The 't' value of the specific segment (absolute)
            },
            availability: {
                now: now, // Simulation Time
                wallClock: wallClockTime, // Real Time
                end: segmentEndWallMs,
                diff: wallClockTime - segmentEndWallMs,
                spd: spd,
            },
        },
    };
}
