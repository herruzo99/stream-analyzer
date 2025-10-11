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
 * @param {import('@/application/lru-cache.js').LRUCache} segmentCache
 * @returns {Promise<object[]>} A promise that resolves to an array of switching set view models.
 */
export async function createDashTimelineViewModel(stream, segmentCache) {
    if (!stream || !stream.manifest) return [];

    const segmentsByRepId = await parseAllSegmentUrls(
        stream.manifest.serializedManifest,
        stream.baseUrl
    );

    const switchingSetsPromises = stream.manifest.periods.map(async (period) =>
        Promise.all(
            period.adaptationSets
                .filter((as) => as.contentType === 'video')
                .map(async (as) => {
                    const firstRep = as.representations[0];
                    let elstData = null;
                    let trackTimescale = 1;

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
                                const initSegment =
                                    await getParsedSegment(initUrl);
                                if (initSegment?.data?.boxes) {
                                    elstData = findBoxRecursive(
                                        initSegment.data.boxes,
                                        (b) => b.type === 'elst'
                                    );
                                    const mdhd = findBoxRecursive(
                                        initSegment.data.boxes,
                                        (b) => b.type === 'mdhd'
                                    );
                                    if (mdhd?.details?.timescale) {
                                        trackTimescale =
                                            mdhd.details.timescale.value;
                                    }
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
                            const repState =
                                segmentsByRepId[compositeKey] || {};
                            const mediaSegments =
                                repState.segmentsByStrategy?.get(
                                    'Strategy C (UTCTiming Source)'
                                ) ||
                                repState.segmentsByStrategy?.get(
                                    'Strategy A (Wall-Clock)'
                                ) ||
                                repState.segmentsByStrategy?.get('default') ||
                                [];

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
                                    const initSegment =
                                        await getParsedSegment(initUrl);
                                    if (initSegment?.data?.boxes) {
                                        tfraData = findBoxRecursive(
                                            initSegment.data.boxes,
                                            (b) => b.type === 'tfra'
                                        );
                                    }
                                } catch (e) {
                                    // Warning already logged
                                }
                            }

                            let presentationTimeOffset = 0;
                            let mediaTimelineOffset = 0;

                            if (elstData?.details?.entry_count?.value > 0) {
                                const mediaTime =
                                    elstData.details.entry_1_media_time?.value;
                                if (mediaTime > 0) {
                                    mediaTimelineOffset =
                                        mediaTime / trackTimescale;
                                    presentationTimeOffset =
                                        -mediaTimelineOffset;
                                }
                            }

                            const fragments = mediaSegments.map((seg) => {
                                const fragment = {
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
                                    startTimeUTC: /** @type {any} */ (seg)
                                        .startTimeUTC,
                                    url: /** @type {any} */ (seg).resolvedUrl,
                                    chunks: [], // Placeholder for chunk data
                                };

                                const cachedSegment = segmentCache.get(
                                    fragment.url
                                );
                                if (
                                    cachedSegment?.parsedData?.format ===
                                        'isobmff' &&
                                    cachedSegment.parsedData.data.boxes
                                ) {
                                    const parsedChunks =
                                        cachedSegment.parsedData.data.boxes.filter(
                                            (b) => b.isChunk
                                        );
                                    if (parsedChunks.length > 0) {
                                        fragment.chunks = parsedChunks.map(
                                            (chunk, index) => {
                                                const chunkDuration =
                                                    chunk.timing.duration /
                                                    trackTimescale;
                                                const chunkStartTime =
                                                    chunk.timing.baseTime /
                                                    trackTimescale;
                                                return {
                                                    index,
                                                    relativeStartTime:
                                                        chunkStartTime -
                                                        fragment.mediaStartTime,
                                                    duration: chunkDuration,
                                                    tooltip: `Chunk #${index}\nTime: ${chunkStartTime.toFixed(
                                                        3
                                                    )}s\nDuration: ${chunkDuration.toFixed(
                                                        3
                                                    )}s\nSamples: ${
                                                        chunk.timing.sampleCount
                                                    }`,
                                                };
                                            }
                                        );
                                    }
                                }
                                return fragment;
                            });

                            let randomAccessPoints = [];
                            if (tfraData) {
                                const timescale =
                                    tfraData.details.timescale.value;
                                randomAccessPoints = Array.from(
                                    {
                                        length: tfraData.details
                                            .number_of_entries.value,
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
                                resolution: `${rep.width.value}x${rep.height.value}`,
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

                    let mediaDuration;
                    if (stream.manifest.type === 'dynamic') {
                        mediaDuration =
                            stream.manifest.timeShiftBufferDepth || 0;
                        // Fallback for live streams that might not have buffer depth but do have segments
                        if (
                            mediaDuration === 0 &&
                            representations[0]?.fragments.length > 0
                        ) {
                            const fragments = representations[0].fragments;
                            const firstFrag = fragments[0];
                            const lastFrag = fragments[fragments.length - 1];
                            mediaDuration =
                                lastFrag.mediaStartTime +
                                lastFrag.duration -
                                firstFrag.mediaStartTime;
                        }
                    } else {
                        mediaDuration =
                            stream.manifest.duration ??
                            period.duration ??
                            representations[0]?.fragments
                                .map((f) => f.duration)
                                .reduce((acc, f) => acc + f, 0) ??
                            0;
                    }

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
                        adAvails: stream.adAvails || [],
                        representations,
                    };
                })
        )
    );

    const switchingSets = (await Promise.all(switchingSetsPromises)).flat();
    return switchingSets;
}