import { getParsedSegment } from '@/application/services/segmentService';
import {
    findInitSegmentUrl,
    parseAllSegmentUrls,
} from '@/infrastructure/parsing/dash/segment-parser';
import {
    resolveBaseUrl,
    findChildrenRecursive,
} from '@/infrastructure/parsing/dash/recursive-parser';

/**
 * Recursively finds the first occurrence of a box of a given type.
 * @param {import('@/infrastructure/parsing/isobmff/parser.js').Box[]} boxes
 * @param {(box: import('@/infrastructure/parsing/isobmff/parser.js').Box) => boolean} predicate The predicate function to match a box.
 * @returns {import('@/infrastructure/parsing/isobmff/parser.js').Box | null}
 */
function findBoxRecursive(boxes, predicate) {
    if (!boxes) return null;
    for (const box of boxes) {
        if (predicate(box)) return box;
        if (box.children?.length > 0) {
            const found = findBoxRecursive(box.children, predicate);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Creates a view model for the DASH timeline visualization by leveraging the central segment parser
 * and asynchronously fetching initialization segments for edit list and random access point data.
 * @param {import('@/types.ts').Stream} stream
 * @returns {Promise<object[]>} A promise that resolves to an array of switching set view models.
 */
export async function createDashTimelineViewModel(stream) {
    if (!stream || !stream.manifest) return [];

    const segmentsByRepId = parseAllSegmentUrls(
        stream.manifest.serializedManifest,
        stream.baseUrl
    );

    const switchingSetsPromises = stream.manifest.periods.map(async (period) =>
        Promise.all(
            period.adaptationSets
                .filter((as) => as.contentType === 'video')
                .map(async (as) => {
                    // Fetch init segment for the first representation to get shared data like elst
                    const firstRep = as.representations[0];
                    let elstData = null;

                    if (firstRep) {
                        const baseUrl = resolveBaseUrl(
                            stream.baseUrl,
                            stream.manifest.serializedManifest,
                            period.serializedManifest,
                            as.serializedManifest,
                            firstRep.serializedManifest
                        );
                        const initUrl = findInitSegmentUrl(
                            firstRep,
                            as,
                            period,
                            baseUrl
                        );
                        if (initUrl) {
                            try {
                                const initSegment = await getParsedSegment(
                                    initUrl
                                );
                                if (initSegment?.data?.boxes) {
                                    elstData = findBoxRecursive(
                                        initSegment.data.boxes,
                                        (b) => b.type === 'elst'
                                    );
                                }
                            } catch (e) {
                                console.warn(
                                    `Could not fetch or parse init segment for timeline: ${initUrl}`,
                                    e
                                );
                            }
                        }
                    }

                    const representationsPromises = as.representations.map(
                        async (rep) => {
                            const compositeKey = `${period.id}-${rep.id}`;
                            const segments = segmentsByRepId[compositeKey] || [];
                            const mediaSegments = segments.filter(
                                (s) => /** @type {any} */ (s).type === 'Media'
                            );
                            const baseUrl = resolveBaseUrl(
                                stream.baseUrl,
                                stream.manifest.serializedManifest,
                                period.serializedManifest,
                                as.serializedManifest,
                                rep.serializedManifest
                            );
                            const initUrl = findInitSegmentUrl(
                                rep,
                                as,
                                period,
                                baseUrl
                            );

                            let tfraData = null;
                            if (initUrl) {
                                try {
                                    const initSegment = await getParsedSegment(
                                        initUrl
                                    );
                                    if (initSegment?.data?.boxes) {
                                        tfraData = findBoxRecursive(
                                            initSegment.data.boxes,
                                            (b) => b.type === 'tfra'
                                        );
                                    }
                                } catch (e) {
                                    // Warning already logged from elst fetch
                                }
                            }

                            let presentationTimeOffset = 0;
                            let mediaTimelineOffset = 0;

                            if (elstData?.details?.entry_count?.value > 0) {
                                const mediaTime =
                                    elstData.details.entry_1_media_time?.value;
                                const movieTimescale =
                                    findChildrenRecursive(
                                        stream.manifest.serializedManifest,
                                        'mvhd'
                                    )[0]?.details?.timescale?.value || 1;

                                if (mediaTime > 0) {
                                    presentationTimeOffset =
                                        -(mediaTime / movieTimescale);
                                    mediaTimelineOffset =
                                        mediaTime / movieTimescale;
                                }
                            }

                            const fragments = mediaSegments.map((seg) => ({
                                number: /** @type {any} */ (seg).number,
                                mediaStartTime:
                                    /** @type {any} */ (seg).time /
                                    /** @type {any} */ (seg).timescale,
                                presentationStartTime:
                                    /** @type {any} */ (seg).time /
                                        /** @type {any} */ (seg).timescale +
                                    presentationTimeOffset,
                                duration:
                                    /** @type {any} */ (seg).duration /
                                    /** @type {any} */ (seg).timescale,
                                startTimeUTC:
                                    /** @type {any} */ (seg).startTimeUTC,
                            }));

                            let randomAccessPoints = [];
                            if (tfraData) {
                                const timescale =
                                    tfraData.details.timescale.value;
                                randomAccessPoints = Array.from(
                                    {
                                        length:
                                            tfraData.details.number_of_entries
                                                .value,
                                    },
                                    (_, i) => ({
                                        time:
                                            tfraData.details[
                                                `entry_${i + 1}_time`
                                            ].value / timescale,
                                        moofOffset:
                                            tfraData.details[
                                                `entry_${i + 1}_moof_offset`
                                            ].value,
                                    })
                                );
                            }

                            return {
                                id: rep.id,
                                bandwidth: rep.bandwidth,
                                resolution: `${rep.width}x${rep.height}`,
                                fragments,
                                events: [],
                                randomAccessPoints,
                                mediaTimelineOffset,
                            };
                        }
                    );

                    const representations = await Promise.all(
                        representationsPromises
                    );
                    const mediaDuration =
                        stream.manifest.duration ??
                        period.duration ??
                        representations[0]?.fragments
                            .map((f) => f.duration)
                            .reduce((acc, f) => acc + f, 0) ??
                        0;

                    let presentationDuration = mediaDuration;
                    if (elstData?.details?.entry_1_segment_duration) {
                        const movieTimescale =
                            findChildrenRecursive(
                                stream.manifest.serializedManifest,
                                'mvhd'
                            )[0]?.details?.timescale?.value || 1;
                        presentationDuration =
                            elstData.details.entry_1_segment_duration.value /
                            movieTimescale;
                    }

                    return {
                        id: as.id || 'video-set',
                        mediaDuration: mediaDuration,
                        presentationDuration,
                        representations,
                    };
                })
        )
    );

    const switchingSets = (await Promise.all(switchingSetsPromises)).flat();
    return switchingSets;
}