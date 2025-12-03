// Minimal changes required here as most logic moved to components,
// but ensuring export is clean.

/**
 * Calculates summary statistics from a list of network events.
 * @param {import('@/types').NetworkEvent[]} events
 * @returns {object}
 */
function calculateSummaryStats(events) {
    if (events.length === 0) {
        return {
            totalRequests: 0,
            failedRequests: 0,
            avgLatency: 0,
            totalBytes: 0,
            totalTime: 0,
            avgThroughput: 0,
        };
    }

    let failedRequests = 0;
    let totalLatency = 0;
    let totalBytes = 0;

    const firstStartTime = Math.min(...events.map((e) => e.timing.startTime));
    const lastEndTime = Math.max(...events.map((e) => e.timing.endTime));
    const totalTime = (lastEndTime - firstStartTime) / 1000; // in seconds

    for (const event of events) {
        if (event.response.status >= 400) {
            failedRequests++;
        }
        totalBytes += event.response.contentLength || 0;
        totalLatency += event.timing.duration;
    }

    const avgThroughput = totalTime > 0 ? (totalBytes * 8) / totalTime : 0;

    return {
        totalRequests: events.length,
        failedRequests,
        avgLatency: events.length > 0 ? totalLatency / events.length : 0,
        totalBytes,
        totalTime,
        avgThroughput,
    };
}

/**
 * Generates data points for the throughput chart.
 */
function generateThroughputData(events, chartStartTime) {
    if (events.length === 0) return [];
    const timeBuckets = new Map();
    const bucketSizeMs = 1000;

    for (const event of events) {
        if (!event.response.contentLength || event.timing.duration <= 0)
            continue;
        const startBucket =
            Math.floor(event.timing.startTime / bucketSizeMs) * bucketSizeMs;
        const endBucket =
            Math.floor(event.timing.endTime / bucketSizeMs) * bucketSizeMs;

        for (
            let bucketTime = startBucket;
            bucketTime <= endBucket;
            bucketTime += bucketSizeMs
        ) {
            const bucket = timeBuckets.get(bucketTime) || { bits: 0 };
            const start = Math.max(event.timing.startTime, bucketTime);
            const end = Math.min(
                event.timing.endTime,
                bucketTime + bucketSizeMs
            );
            const durationInBucket = end - start;

            if (durationInBucket > 0) {
                const proportion = durationInBucket / event.timing.duration;
                bucket.bits += event.response.contentLength * 8 * proportion;
            }
            timeBuckets.set(bucketTime, bucket);
        }
    }

    const dataPoints = [];
    for (const [bucketTime, bucket] of timeBuckets.entries()) {
        const time = (bucketTime - chartStartTime) / 1000;
        dataPoints.push({
            time: Math.max(0, time),
            throughput: bucket.bits / (bucketSizeMs / 1000),
        });
    }
    return dataPoints.sort((a, b) => a.time - b.time);
}

/**
 * Creates the main view model for the network analysis feature.
 * @param {import('@/types').NetworkEvent[]} filteredEvents
 * @param {import('@/types').NetworkEvent[]} allEvents
 * @returns {object}
 */
export function createNetworkViewModel(filteredEvents, allEvents) {
    const summary = calculateSummaryStats(filteredEvents);

    const absoluteStartTime =
        allEvents.length > 0
            ? Math.min(...allEvents.map((e) => e.timing.startTime))
            : performance.now();
    const absoluteEndTime =
        allEvents.length > 0
            ? Math.max(...allEvents.map((e) => e.timing.endTime))
            : absoluteStartTime + 1000;

    const timelineDuration = Math.max(100, absoluteEndTime - absoluteStartTime);

    const throughputData = generateThroughputData(
        filteredEvents,
        absoluteStartTime
    );

    const waterfallData = filteredEvents
        .map((event) => {
            const startRelative = event.timing.startTime - absoluteStartTime;
            const leftPercent = (startRelative / timelineDuration) * 100;
            const widthPercent = Math.max(
                0.2,
                (event.timing.duration / timelineDuration) * 100
            );

            const breakdown = event.timing.breakdown || {
                redirect: 0,
                dns: 0,
                tcp: 0,
                tls: 0,
                ttfb: event.timing.duration * 0.1,
                download: event.timing.duration * 0.9,
            };

            // Calculate relative widths within the event bar (total 100%)
            const totalDur = event.timing.duration || 1;
            const getPct = (val) => ((val || 0) / totalDur) * 100;

            const visuals = {
                left: `${leftPercent.toFixed(3)}%`,
                width: `${widthPercent.toFixed(3)}%`,
                redirectWidth: `${getPct(breakdown.redirect).toFixed(1)}%`,
                dnsWidth: `${getPct(breakdown.dns).toFixed(1)}%`,
                tcpWidth: `${getPct(breakdown.tcp).toFixed(1)}%`,
                tlsWidth: `${getPct(breakdown.tls).toFixed(1)}%`,
                ttfbWidth: `${getPct(breakdown.ttfb).toFixed(1)}%`,
                downloadWidth: `${getPct(breakdown.download).toFixed(1)}%`,
            };

            const downloadDurationSeconds = (event.timing.duration || 1) / 1000;
            const throughput =
                event.response.contentLength > 0 && downloadDurationSeconds > 0
                    ? (event.response.contentLength * 8) /
                      downloadDurationSeconds
                    : 0;

            let efficiency = null;
            if (event.segmentDuration && event.segmentDuration > 0) {
                efficiency = downloadDurationSeconds / event.segmentDuration;
            }

            return {
                ...event,
                size: event.response.contentLength,
                throughput,
                efficiency,
                visuals,
            };
        })
        .sort((a, b) => a.timing.startTime - b.timing.startTime);

    return {
        summary,
        throughputData,
        waterfallData,
        timeline: {
            start: absoluteStartTime,
            duration: timelineDuration,
        },
    };
}
