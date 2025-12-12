import { formatDuration } from '@/ui/shared/format';

/**
 * Calculates the active timeline window from available segments and ad avails.
 * @param {import('@/types').Stream} stream
 */
function calculateTimelineBounds(stream) {
    let minTime = Infinity;
    let maxTime = -Infinity;
    let hasContent = false;

    // Helper to process a list of segments
    const processSegments = (segments, periodStartOffset = 0) => {
        if (!segments || segments.length === 0) return;

        // Check all segments to find true min/max bounds
        // (First/Last optimization removed to handle unsorted or gap scenarios safely)
        for (const seg of segments) {
            const start = periodStartOffset + seg.time / (seg.timescale || 1);
            const duration = seg.duration / (seg.timescale || 1);
            const end = start + duration;

            if (start < minTime) minTime = start;
            if (end > maxTime) maxTime = end;
            hasContent = true;
        }
    };

    if (stream.protocol === 'dash') {
        for (const repState of stream.dashRepresentationState.values()) {
            if (repState.segments.length > 0) {
                const first = repState.segments[0];
                const periodOffset = first.periodStart || 0;
                processSegments(repState.segments, periodOffset);
            }
        }
    } else if (stream.protocol === 'hls') {
        for (const variantState of stream.hlsVariantState.values()) {
            processSegments(variantState.segments);
        }
    }

    // Also factor in Ad Avails to expand window if ads start before/after content
    // This handles the "negative time" pre-roll visualization issue.
    if (stream.adAvails && stream.adAvails.length > 0) {
        for (const avail of stream.adAvails) {
            // Ignore placeholder
            if (avail.id === 'unconfirmed-inband-scte35') continue;

            if (avail.startTime < minTime) minTime = avail.startTime;
            const end = avail.startTime + avail.duration;
            if (end > maxTime) maxTime = end;
            hasContent = true;
        }
    }

    if (!hasContent) {
        // Fallback to manifest hints if no segments loaded
        return { start: 0, duration: stream.manifest?.duration || 60 };
    }

    // Safety clamps
    if (minTime === Infinity) minTime = 0;
    if (maxTime === -Infinity) maxTime = minTime + 60;

    return {
        start: minTime,
        duration: Math.max(1, maxTime - minTime), // Ensure non-zero
    };
}

/**
 * Prepares data for the Advertising UI.
 * @param {import('@/types').Stream} stream
 */
export function createAdvertisingViewModel(stream) {
    const avails = stream.adAvails || [];
    const isLive = stream.manifest?.type === 'dynamic';

    // --- Dynamic Window Calculation ---
    const bounds = calculateTimelineBounds(stream);
    const windowStart = bounds.start;
    const windowSize = bounds.duration;

    // Labels
    let labelStart = formatDuration(windowStart);
    let labelEnd = formatDuration(windowStart + windowSize);

    // Sort by start time for UI consistency
    const sortedAvails = [...avails].sort((a, b) => a.startTime - b.startTime);

    // Calculate stats
    const totalAvails = sortedAvails.length;
    const totalAdDuration = sortedAvails.reduce(
        (acc, a) => acc + (a.duration || 0),
        0
    );

    // Ad Load is relative to the visible window for live, or total duration for VOD
    const adLoad = windowSize > 0 ? (totalAdDuration / windowSize) * 100 : 0;

    const detectionCounts = sortedAvails.reduce((acc, a) => {
        acc[a.detectionMethod] = (acc[a.detectionMethod] || 0) + 1;
        return acc;
    }, {});

    // Normalize timeline items relative to the calculated window
    const timelineItems = sortedAvails.map((avail) => {
        let startPct = 0;
        let widthPct = 0;
        let shouldHide = false;

        // Skip placeholder
        if (avail.id === 'unconfirmed-inband-scte35') {
            shouldHide = true;
        } else {
            // Calculate relative position in the window
            // Start Relative to Window Start
            const relativeStart = avail.startTime - windowStart;

            // Percentage
            startPct = (relativeStart / windowSize) * 100;
            widthPct = (avail.duration / windowSize) * 100;

            // Hide if completely out of bounds
            // We allow partial overlaps (e.g. start < 0 but end > 0)
            const relativeEnd = relativeStart + avail.duration;
            if (relativeEnd < 0 || relativeStart > windowSize) {
                shouldHide = true;
            }
        }

        // Cap width visually so short breaks are still visible
        const visualWidth = Math.max(widthPct, 0.5);

        return {
            ...avail,
            timelineStyles: {
                left: `${startPct.toFixed(2)}%`,
                width: `${visualWidth.toFixed(2)}%`,
                display: shouldHide ? 'none' : 'block',
            },
            statusColor: getStatusColor(avail),
        };
    });

    return {
        avails: timelineItems,
        stats: {
            totalAvails,
            totalAdDuration: totalAdDuration.toFixed(2),
            adLoad: adLoad.toFixed(1),
            detectionCounts,
        },
        isLive,
        duration: windowSize,
        labels: {
            start: labelStart,
            end: labelEnd,
        },
    };
}

function getStatusColor(avail) {
    if (avail.id === 'unconfirmed-inband-scte35') {
        return 'blue';
    }
    if (avail.detectionMethod === 'STRUCTURAL_DISCONTINUITY') {
        return 'amber';
    }
    if (
        avail.detectionMethod === 'SCTE35_INBAND' ||
        avail.detectionMethod === 'SCTE35_DATERANGE' ||
        avail.detectionMethod === 'SCTE224_ESNI'
    ) {
        return avail.adManifestUrl ? 'emerald' : 'amber';
    }
    return 'blue';
}
