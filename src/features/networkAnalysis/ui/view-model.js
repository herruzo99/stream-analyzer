import { formatBitrate } from '@/ui/shared/format';

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
            avgTtfb: 0,
            avgDownload: 0,
            totalBytes: 0,
            totalTime: 0,
            avgThroughput: 0,
        };
    }

    let failedRequests = 0;
    let totalTtfb = 0;
    let totalDownload = 0;
    let totalBytes = 0;
    let timingBreakdownCount = 0;

    const firstStartTime = Math.min(...events.map((e) => e.timing.startTime));
    const lastEndTime = Math.max(...events.map((e) => e.timing.endTime));
    const totalTime = (lastEndTime - firstStartTime) / 1000; // in seconds

    for (const event of events) {
        if (event.response.status >= 400) {
            failedRequests++;
        }
        totalBytes += event.response.contentLength || 0;
        if (event.timing.breakdown) {
            totalTtfb += event.timing.breakdown.ttfb;
            totalDownload += event.timing.breakdown.download;
            timingBreakdownCount++;
        }
    }

    const avgThroughput = totalTime > 0 ? (totalBytes * 8) / totalTime : 0;

    return {
        totalRequests: events.length,
        failedRequests,
        avgTtfb:
            timingBreakdownCount > 0 ? totalTtfb / timingBreakdownCount : 0,
        avgDownload:
            timingBreakdownCount > 0 ? totalDownload / timingBreakdownCount : 0,
        totalBytes,
        totalTime,
        avgThroughput,
    };
}

/**
 * Generates data points for the throughput chart by bucketing requests into time intervals.
 * @param {import('@/types').NetworkEvent[]} events
 * @param {number} chartStartTime The absolute start time of the chart's timeline.
 * @returns {{time: number, throughput: number}[]}
 */
function generateThroughputData(events, chartStartTime) {
    if (events.length === 0) return [];

    const timeBuckets = new Map();
    const bucketSizeMs = 1000; // 1-second buckets

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
            const end = Math.min(event.timing.endTime, bucketTime + bucketSizeMs);
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
            time: Math.max(0, time), // Guard against negative time values
            throughput: bucket.bits / (bucketSizeMs / 1000), // bits per second for the bucket
        });
    }

    return dataPoints.sort((a, b) => a.time - b.time);
}
/**
 * Creates the main view model for the network analysis feature.
 * @param {import('@/types').NetworkEvent[]} filteredEvents The events that match the current UI filters.
 * @param {import('@/types').NetworkEvent[]} allEvents All events for the stream, unfiltered.
 * @param {import('@/types').Stream} stream The stream object.
 * @returns {object} The view model.
 */
export function createNetworkViewModel(filteredEvents, allEvents, stream) {
    const summary = calculateSummaryStats(filteredEvents);

    const absoluteStartTime =
        allEvents.length > 0
            ? Math.min(...allEvents.map((e) => e.timing.startTime))
            : 0;
    const absoluteEndTime =
        allEvents.length > 0
            ? Math.max(...allEvents.map((e) => e.timing.endTime))
            : 0;
    const absoluteDuration = absoluteEndTime - absoluteStartTime;

    const chartStartTime =
        filteredEvents.length > 0
            ? Math.min(...filteredEvents.map((e) => e.timing.startTime))
            : 0;

    const throughputData = generateThroughputData(
        filteredEvents,
        chartStartTime
    );

    const waterfallData = filteredEvents.map((event) => {
        const downloadDurationSeconds = (event.timing.duration || 1) / 1000;
        const mediaDuration = event.segmentDuration || 0;

        const downloadRatio =
            mediaDuration > 0 && downloadDurationSeconds > 0
                ? mediaDuration / downloadDurationSeconds
                : null;

        const throughput =
            event.response.contentLength > 0 && downloadDurationSeconds > 0
                ? (event.response.contentLength * 8) / downloadDurationSeconds
                : 0;

        return {
            ...event,
            downloadRatio,
            size: event.response.contentLength,
            throughput,
        };
    });

    return {
        summary,
        throughputData,
        waterfallData,
        timeline: {
            start: absoluteStartTime,
            duration: absoluteDuration,
        },
    };
}