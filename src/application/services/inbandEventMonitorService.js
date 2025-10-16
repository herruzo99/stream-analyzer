import { eventBus } from '@/application/event-bus';
import { useAnalysisStore } from '@/state/analysisStore';
import { getParsedSegment } from './segmentService';
import { findChildrenRecursive, getAttr } from '@/infrastructure/parsing/dash/recursive-parser';

const SCTE35_SCHEME_ID = 'urn:scte:scte35:2013:bin';

/**
 * Scans all relevant media segments for in-band event messages ('emsg' boxes).
 * This is a more robust implementation that checks all segments instead of just one.
 * @param {import('@/types').Stream} stream
 */
async function checkForInbandEvents(stream) {
    if (stream.protocol !== 'dash' || !stream.manifest?.periods) {
        return;
    }

    for (const period of stream.manifest.periods) {
        for (const as of period.adaptationSets) {
            const inbandEventStreams = findChildrenRecursive(as.serializedManifest, 'InbandEventStream');
            const hasScte35 = inbandEventStreams.some(
                (ies) => getAttr(ies, 'schemeIdUri') === SCTE35_SCHEME_ID
            );

            if (hasScte35) {
                // This AdaptationSet is declared to have in-band SCTE-35.
                // We will now proactively parse ALL of its segments to find 'emsg' boxes.
                if (!as.representations || as.representations.length === 0) continue;

                for (const rep of as.representations) {
                    const compositeKey = `${period.id || 0}-${rep.id}`;
                    const repState = stream.dashRepresentationState.get(compositeKey);
                    const mediaSegments = repState?.segments.filter(s => /** @type {any} */(s).type === 'Media');

                    if (!mediaSegments || mediaSegments.length === 0) continue;

                    // Dispatch parsing requests for all segments.
                    // The segmentService is idempotent and will handle caching, so this is safe and efficient.
                    // The result of `getParsedSegment` is handled by event listeners, so we don't need to await.
                    for (const segment of mediaSegments) {
                        const segmentUrl = /** @type {any} */(segment).resolvedUrl;
                        if (segmentUrl) {
                            try {
                                getParsedSegment(segmentUrl, stream.id, 'isobmff');
                            } catch (e) {
                                console.error(`[InbandEventMonitor] Failed to dispatch segment parse for ${segmentUrl}: ${e.message}`);
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