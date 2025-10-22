import { eventBus } from '@/application/event-bus';
import { getParsedSegment } from '@/infrastructure/segments/segmentService';
import {
    findChildrenRecursive,
    getAttr,
} from '@/infrastructure/parsing/dash/recursive-parser';

const SCTE35_SCHEME_ID = 'urn:scte:scte35:2013:bin';

/**
 * Scans a single media segment for in-band event messages ('emsg' boxes).
 * This is a more robust and performant implementation that checks only the first segment
 * of a Representation to avoid downloading all segments on initial load.
 * @param {import('@/types').Stream} stream
 */
async function checkForInbandEvents(stream) {
    if (stream.protocol !== 'dash' || !stream.manifest?.periods) {
        return;
    }

    for (const period of stream.manifest.periods) {
        for (const as of period.adaptationSets) {
            const inbandEventStreams = findChildrenRecursive(
                as.serializedManifest,
                'InbandEventStream'
            );
            const hasScte35 = inbandEventStreams.some(
                (ies) => getAttr(ies, 'schemeIdUri') === SCTE35_SCHEME_ID
            );

            if (hasScte35) {
                if (!as.representations || as.representations.length === 0)
                    continue;

                for (const rep of as.representations) {
                    const compositeKey = `${period.id || 0}-${rep.id}`;
                    const repState =
                        stream.dashRepresentationState.get(compositeKey);
                    const mediaSegments =
                        repState?.segments.filter(
                            (s) => /** @type {any} */ (s).type === 'Media'
                        ) || [];

                    if (mediaSegments.length === 0) continue;

                    // ARCHITECTURAL REFINEMENT:
                    // If there's only one media segment and it's a VOD stream, it's highly
                    // likely a SegmentBase stream representing the entire file. Do NOT fetch it.
                    if (
                        mediaSegments.length === 1 &&
                        stream.manifest?.type === 'static'
                    ) {
                        continue;
                    }

                    // For multi-segment streams (SegmentTemplate/SegmentList),
                    // proactively parse only the FIRST media segment.
                    const firstMediaSegment = mediaSegments[0];
                    if (firstMediaSegment) {
                        const segmentUrl =
                            /** @type {any} */
                            (firstMediaSegment).resolvedUrl;
                        if (segmentUrl) {
                            try {
                                getParsedSegment(
                                    segmentUrl,
                                    stream.id,
                                    'isobmff'
                                );
                            } catch (e) {
                                console.error(
                                    `[InbandEventMonitor] Failed to dispatch segment parse for ${segmentUrl}: ${e.message}`
                                );
                            }
                        }
                    }
                }
            }
        }
    }
}

function handleAnalysisComplete({ streams }) {
    for (const stream of streams) {
        checkForInbandEvents(stream);
    }
}

export function initializeInbandEventMonitor() {
    eventBus.subscribe('state:analysis-complete', handleAnalysisComplete);
}