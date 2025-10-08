import {
    useAnalysisStore,
    analysisActions,
} from '@/state/analysisStore.js';
import { eventBus } from '@/application/event-bus.js';
import { generateFeatureAnalysis } from '@/features/featureAnalysis/domain/analyzer.js';
import { parseAllSegmentUrls as parseDashSegments } from '@/infrastructure/parsing/dash/segment-parser.js';
import { diffManifest } from '@/ui/shared/diff.js';
import xmlFormatter from 'xml-formatter';

/**
 * A more specific stream type where the protocol is guaranteed to be 'dash' or 'hls'.
 * @typedef {import('@/types.ts').Stream & { protocol: 'dash' | 'hls' }} KnownProtocolStream
 */

/**
 * Checks for future SCTE-35 events and schedules a high-priority poll.
 * @param {KnownProtocolStream} stream The stream being updated.
 * @param {import('@/types.ts').Manifest} newManifestObject The newly parsed manifest IR.
 */
function schedulePollsFromScte35(stream, newManifestObject) {
    if (stream.manifest.type !== 'dynamic' || !newManifestObject.events) {
        return;
    }

    const now = Date.now();
    const preRollBufferMs = 1000; // Poll 1 second before the event

    for (const event of newManifestObject.events) {
        if (!event.scte35 || /** @type {any} */ (event.scte35).error) {
            continue;
        }

        const command = /** @type {any} */ (event.scte35).splice_command;
        if (
            !command ||
            !command.splice_time ||
            !command.splice_time.time_specified
        ) {
            continue;
        }

        const ptsTime = command.splice_time.pts_time;
        const ptsAdjustment =
            /** @type {any} */ (event.scte35).pts_adjustment || 0;
        const adjustedPts = ptsTime + ptsAdjustment;

        // Find the most recent Program Clock Reference (PCR) from a segment to anchor our wall-clock calculation
        // This is a simplified approach; a real-world client would maintain a running timeline.
        // For our purposes, we anchor to availabilityStartTime.
        const availabilityStartTime =
            newManifestObject.availabilityStartTime?.getTime();
        if (!availabilityStartTime) continue;

        const eventMediaTimeSeconds = adjustedPts / 90000;
        const eventWallClockTime =
            availabilityStartTime + eventMediaTimeSeconds * 1000;

        const pollTime = eventWallClockTime - preRollBufferMs;

        if (pollTime > now) {
            eventBus.dispatch('monitor:schedule-one-time-poll', {
                streamId: stream.id,
                pollTime: pollTime,
                reason: `SCTE-35 ${command.type || 'Event'}`,
            });
        }
    }
}

/**
 * Compares two sets of compliance results to see if any new issues have appeared.
 * @param {import('@/types.ts').ComplianceResult[]} oldResults
 * @param {import('@/types.ts').ComplianceResult[]} newResults
 * @returns {boolean}
 */
function checkForNewIssues(oldResults, newResults) {
    if (!Array.isArray(newResults)) return false; // Defensive guard
    if (!oldResults) {
        // If there were no old results, any new issue is considered "new".
        return newResults.some(
            (res) => res.status === 'fail' || res.status === 'warn'
        );
    }

    const oldIssueIds = new Set(
        oldResults
            .filter((r) => r.status === 'fail' || r.status === 'warn')
            .map((r) => r.id)
    );

    return newResults.some(
        (r) =>
            (r.status === 'fail' || r.status === 'warn') &&
            !oldIssueIds.has(r.id)
    );
}

/**
 * The main handler for processing a live manifest update. This version is optimized
 * to build a partial update object, avoiding expensive deep clones of the entire stream state.
 * @param {object} updateData The event data from `livestream:manifest-updated`.
 */
function processLiveUpdate(updateData) {
    const {
        streamId,
        newManifestString,
        newManifestObject,
        oldManifestString,
        complianceResults,
        serializedManifest,
    } = updateData;
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);

    if (!stream || stream.protocol === 'unknown') return;

    // --- Create a new manifestUpdates array ---
    let formattedOld = oldManifestString;
    let formattedNew = newManifestString;

    if (stream.protocol === 'dash') {
        formattedOld = xmlFormatter(oldManifestString, { indentation: '  ' });
        formattedNew = xmlFormatter(newManifestString, { indentation: '  ' });
    }

    const diffHtml = diffManifest(formattedOld, formattedNew, stream.protocol);
    const previousResults = stream.manifestUpdates[0]?.complianceResults;
    const hasNewIssues = checkForNewIssues(previousResults, complianceResults);

    const newUpdate = {
        timestamp: new Date().toLocaleTimeString(),
        diffHtml,
        rawManifest: newManifestString,
        complianceResults,
        hasNewIssues,
        serializedManifest,
    };

    const newManifestUpdates = [newUpdate, ...stream.manifestUpdates].slice(
        0,
        20
    );

    // --- Recalculate feature analysis ---
    const newFeatureAnalysisState = {
        ...stream.featureAnalysis,
        manifestCount: stream.featureAnalysis.manifestCount + 1,
        results: new Map(stream.featureAnalysis.results),
    };

    const newAnalysisResults = generateFeatureAnalysis(
        newManifestObject,
        stream.protocol,
        serializedManifest
    );

    Object.entries(newAnalysisResults).forEach(([name, result]) => {
        const existing = newFeatureAnalysisState.results.get(name);
        if (result.used && (!existing || !existing.used)) {
            newFeatureAnalysisState.results.set(name, {
                used: true,
                details: result.details,
            });
        }
    });

    // --- Recalculate segment state ---
    let newDashState, newHlsState;
    if (stream.protocol === 'dash') {
        newDashState = new Map(stream.dashRepresentationState);
        const newSegmentsByCompositeKey = parseDashSegments(
            serializedManifest,
            stream.baseUrl
        );
        Object.entries(newSegmentsByCompositeKey).forEach(
            ([compositeKey, newSegments]) => {
                const repState = newDashState.get(compositeKey);
                if (repState) {
                    const existingUrls = new Set(
                        repState.segments.map(
                            (s) => /** @type {any} */ (s).resolvedUrl
                        )
                    );
                    newSegments.forEach((newSeg) => {
                        if (
                            !existingUrls.has(
                                /** @type {any} */ (newSeg).resolvedUrl
                            )
                        ) {
                            repState.segments.push(newSeg);
                        }
                    });
                    repState.freshSegmentUrls = new Set(
                        newSegments.map(
                            (s) => /** @type {any} */ (s).resolvedUrl
                        )
                    );
                }
            }
        );
    } else {
        // HLS
        newHlsState = new Map(stream.hlsVariantState);
        if (!newManifestObject.isMaster) {
            const variant = newHlsState.get(stream.originalUrl);
            if (variant) {
                variant.segments = newManifestObject.segments || [];
                variant.freshSegmentUrls = new Set(
                    variant.segments.map(
                        (s) => /** @type {any} */ (s).resolvedUrl
                    )
                );
            }
        }
    }

    // --- Schedule polls based on SCTE-35 ---
    schedulePollsFromScte35(
        /** @type {KnownProtocolStream} */ (stream),
        newManifestObject
    );

    // --- Construct the partial update payload ---
    const updatePayload = {
        rawManifest: newManifestString,
        manifest: newManifestObject,
        manifestUpdates: newManifestUpdates,
        featureAnalysis: newFeatureAnalysisState,
        dashRepresentationState: newDashState,
        hlsVariantState: newHlsState,
    };

    // --- Dispatch the update action ---
    analysisActions.updateStream(streamId, updatePayload);
    eventBus.dispatch('stream:data-updated', { streamId });
}

/**
 * Initializes the service by subscribing to the live manifest update event.
 */
export function initializeLiveUpdateProcessor() {
    eventBus.subscribe('livestream:manifest-updated', processLiveUpdate);
}
