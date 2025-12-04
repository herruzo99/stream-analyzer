/**
 * Prepares data for the Advertising UI.
 * @param {import('@/types').Stream} stream
 */
export function createAdvertisingViewModel(stream) {
    const avails = stream.adAvails || [];
    const manifest = stream.manifest;
    const isLive = manifest.type === 'dynamic';

    // --- DURATION HEURISTIC ---
    // 1. Prefer explicit total duration (VOD / Static)
    let duration = manifest.duration;

    // 2. If Live and no total duration, use DVR Window (timeShiftBufferDepth)
    if (isLive && (!duration || duration === 0)) {
        duration = manifest.timeShiftBufferDepth;
    }

    // 3. Fallback: Calculate from Period duration if available (e.g., simplistic live)
    if (
        (!duration || duration === 0) &&
        manifest.periods &&
        manifest.periods.length > 0
    ) {
        // Sum known period durations
        const periodSum = manifest.periods.reduce(
            (sum, p) => sum + (p.duration || 0),
            0
        );
        if (periodSum > 0) duration = periodSum;
    }

    // 4. Absolute Fallback: If still 0, avoid division by zero later
    if (!duration) duration = 0;

    // Sort chronologically
    const sortedAvails = [...avails].sort((a, b) => a.startTime - b.startTime);

    // Calculate stats
    const totalAvails = sortedAvails.length;
    const totalAdDuration = sortedAvails.reduce(
        (acc, a) => acc + (a.duration || 0),
        0
    );

    // Calculate Ad Load (percentage of content that is ads)
    // Use the derived 'duration' (DVR window or total) as the denominator
    const adLoad = duration > 0 ? (totalAdDuration / duration) * 100 : 0;

    // Categorize Detection Methods
    const detectionCounts = sortedAvails.reduce((acc, a) => {
        acc[a.detectionMethod] = (acc[a.detectionMethod] || 0) + 1;
        return acc;
    }, {});

    // Normalize timeline items
    const timelineItems = sortedAvails.map((avail) => {
        // Handle relative vs absolute time for live
        // If start time is huge (epoch), normalizing it to the window is complex without live edge.
        // For visualization, we check if it fits in 0-Duration range.

        let startPct = 0;
        let widthPct = 0;

        if (duration > 0) {
            // If using Epoch time (common in DASH live), we can't easily plot on a 0-100% bar
            // without knowing the window start.
            // Heuristic: If startTime > duration, it's likely Epoch.
            // In that case, we can't plot it accurately on a relative bar without more context.
            // We default to 0 or skip plotting (but keep in list).
            if (avail.startTime <= duration) {
                startPct = (avail.startTime / duration) * 100;
                widthPct = (avail.duration / duration) * 100;
            }
        }

        // Cap width visually so short breaks are still visible
        const visualWidth = Math.max(widthPct, 1);

        return {
            ...avail,
            timelineStyles: {
                left: `${startPct.toFixed(2)}%`,
                width: `${visualWidth.toFixed(2)}%`,
                // Hide if out of bounds (e.g. epoch time in relative view)
                display:
                    duration > 0 && avail.startTime > duration
                        ? 'none'
                        : 'block',
            },
            // Helper for determining status color
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
        duration, // Now represents DVR Window for live
        durationLabel: isLive ? 'DVR Window' : 'Total Duration', // New label hint
    };
}

function getStatusColor(avail) {
    if (
        avail.detectionMethod === 'SCTE35_INBAND' ||
        avail.detectionMethod === 'SCTE35_DATERANGE' ||
        avail.detectionMethod === 'SCTE224_ESNI'
    ) {
        return avail.adManifestUrl ? 'emerald' : 'amber'; // Signal + VAST vs Signal Only
    }
    return 'blue'; // Heuristic
}
