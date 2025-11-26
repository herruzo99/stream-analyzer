/**
 * Prepares data for the Advertising UI.
 * @param {import('@/types').Stream} stream
 */
export function createAdvertisingViewModel(stream) {
    const avails = stream.adAvails || [];
    const duration = stream.manifest.duration || 0; // 0 for Live if unknown

    // Sort chronologically
    const sortedAvails = [...avails].sort((a, b) => a.startTime - b.startTime);

    // Calculate stats
    const totalAvails = sortedAvails.length;
    const totalAdDuration = sortedAvails.reduce(
        (acc, a) => acc + (a.duration || 0),
        0
    );

    // Calculate Ad Load (percentage of content that is ads)
    // Prevent division by zero for live streams with no known duration
    const adLoad = duration > 0 ? (totalAdDuration / duration) * 100 : 0;

    // Categorize Detection Methods
    const detectionCounts = sortedAvails.reduce((acc, a) => {
        acc[a.detectionMethod] = (acc[a.detectionMethod] || 0) + 1;
        return acc;
    }, {});

    // Normalize timeline items
    // We need to map avails to percentage positions for the visual timeline
    const timelineItems = sortedAvails.map((avail) => {
        const startPct = duration > 0 ? (avail.startTime / duration) * 100 : 0;
        const widthPct = duration > 0 ? (avail.duration / duration) * 100 : 0;

        // Cap width visually so short breaks are still visible
        const visualWidth = Math.max(widthPct, 1);

        return {
            ...avail,
            timelineStyles: {
                left: `${startPct.toFixed(2)}%`,
                width: `${visualWidth.toFixed(2)}%`,
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
        isLive: stream.manifest.type === 'dynamic',
        duration,
    };
}

function getStatusColor(avail) {
    if (
        avail.detectionMethod === 'SCTE35_INBAND' ||
        avail.detectionMethod === 'SCTE35_DATERANGE'
    ) {
        return avail.adManifestUrl ? 'emerald' : 'amber'; // Signal + VAST vs Signal Only
    }
    return 'blue'; // Heuristic
}
