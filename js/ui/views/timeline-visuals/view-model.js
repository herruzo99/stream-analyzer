import { useStore } from '../../../core/store.js';
import { parseAllSegmentUrls } from '../../../protocols/manifest/dash/segment-parser.js';

/**
 * Creates a view model for the DASH timeline visualization by leveraging the central segment parser.
 * @param {import('../../../core/types.js').Stream} stream
 * @returns {Promise<object[]>} A promise that resolves to an array of switching set view models.
 */
export async function createDashTimelineViewModel(stream) {
    if (!stream || !stream.manifest) return [];

    // Use the single source of truth for segment parsing. This function is synchronous
    // and does not perform any network requests for this type of manifest.
    const segmentsByRepId = parseAllSegmentUrls(
        stream.manifest.serializedManifest,
        stream.baseUrl
    );

    const switchingSets = stream.manifest.periods.flatMap((period) =>
        period.adaptationSets
            .filter((as) => as.contentType === 'video')
            .map((as) => {
                const representations = as.representations.map((rep) => {
                    const compositeKey = `${period.id}-${rep.id}`;
                    const segments = segmentsByRepId[compositeKey] || [];
                    const mediaSegments = segments.filter(
                        (s) => s.type === 'Media'
                    );

                    if (mediaSegments.length === 0) {
                        return {
                            id: rep.id,
                            bandwidth: rep.bandwidth,
                            resolution: `${rep.width}x${rep.height}`,
                            error: 'No media segments could be parsed for this Representation.',
                            fragments: [],
                            events: [],
                        };
                    }

                    const fragments = mediaSegments.map((seg) => ({
                        startTime: seg.time / seg.timescale,
                        duration: seg.duration / seg.timescale,
                    }));

                    const events = [];
                    useStore.getState().segmentCache.forEach((entry) => {
                        if (entry.parsedData?.data?.events) {
                            events.push(...entry.parsedData.data.events);
                        }
                    });

                    return {
                        id: rep.id,
                        bandwidth: rep.bandwidth,
                        resolution: `${rep.width}x${rep.height}`,
                        fragments,
                        events,
                    };
                });

                const totalDuration =
                    stream.manifest.duration ??
                    period.duration ??
                    (representations[0]?.fragments
                        ? representations[0].fragments
                              .map((f) => f.duration)
                              .reduce((acc, f) => acc + f, 0)
                        : 0);

                return {
                    id: as.id || 'video-set',
                    totalDuration,
                    representations,
                };
            })
    );

    // This function is now effectively synchronous for this manifest type,
    // so we can wrap the result in a resolved promise.
    return Promise.resolve(switchingSets);
}
