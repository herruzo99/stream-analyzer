import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { generateFeatureAnalysis } from '@/features/featureAnalysis/domain/analyzer';
import { debugLog } from '@/shared/utils/debug';

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
    if (!Array.isArray(newResults)) return false;
    if (!oldResults) {
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
 * The main handler for processing a live manifest update.
 * @param {object} updateData The event data from `livestream:manifest-updated`.
 */
async function processLiveUpdate(updateData) {
    debugLog('LiveUpdateProcessor', 'Received "livestream:manifest-updated" event.', updateData);
    const {
        streamId,
        newManifestString,
        newManifestObject,
        complianceResults,
        serializedManifest,
        diffHtml,
        dashRepresentationState: dashRepStateFromArray,
    } = updateData;

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);

    if (!stream || (stream.protocol !== 'dash' && stream.protocol !== 'hls')) {
        debugLog('LiveUpdateProcessor', `Stream ${streamId} not found or has invalid protocol. Aborting update.`);
        return;
    }

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

    let segmentsWereUpdated = false;
    let newDashState = new Map(stream.dashRepresentationState);
    let newHlsState = new Map(stream.hlsVariantState);

    if (stream.protocol === 'dash' && dashRepStateFromArray) {
        debugLog('LiveUpdateProcessor', 'Processing DASH segment state update.');
        for (const [key, value] of dashRepStateFromArray) {
            const oldRepState = stream.dashRepresentationState.get(key);
            
            // --- MODIFIED: Merge segments instead of replacing ---
            const oldSegments = oldRepState?.segments || [];
            const newSegments = value.segments || [];

            const segmentMap = new Map();
            oldSegments.forEach(seg => segmentMap.set(seg.uniqueId, seg));
            newSegments.forEach(seg => segmentMap.set(seg.uniqueId, seg));
            const mergedSegments = Array.from(segmentMap.values());
            // --- END MODIFICATION ---

            if (value.segments.length > (oldRepState?.segments.length || 0)) {
                segmentsWereUpdated = true;
                debugLog('LiveUpdateProcessor', `New segments detected for rep ${key}. Old count: ${oldRepState?.segments.length || 0}, New count: ${value.segments.length}`);
            }

            newDashState.set(key, {
                ...value,
                segments: mergedSegments,
                freshSegmentUrls: new Set(value.freshSegmentUrls || []),
            });
        }
    } else if (stream.protocol === 'hls' && !newManifestObject.isMaster) {
        const variantState = newHlsState.get(stream.originalUrl);
        if (variantState) {
            // --- MODIFIED: Merge segments instead of replacing ---
            const oldSegments = variantState.segments || [];
            const newSegments = newManifestObject.segments || [];

            const segmentMap = new Map();
            oldSegments.forEach(seg => segmentMap.set(seg.uniqueId, seg));
            newSegments.forEach(seg => segmentMap.set(seg.uniqueId, seg));
            const mergedSegments = Array.from(segmentMap.values());
            // --- END MODIFICATION ---

            if (newSegments.length > oldSegments.length) {
                segmentsWereUpdated = true;
            }
            newHlsState.set(stream.originalUrl, {
                ...variantState,
                segments: mergedSegments,
                freshSegmentUrls: new Set(newSegments.map((s) => s.uniqueId)),
            });
        }
    }
    
    debugLog('LiveUpdateProcessor', `Segments were updated: ${segmentsWereUpdated}`);

    schedulePollsFromScte35(
        /** @type {KnownProtocolStream} */ (stream),
        newManifestObject
    );

    const updatePayload = {
        rawManifest: newManifestString,
        manifest: newManifestObject,
        manifestUpdates: newManifestUpdates,
        featureAnalysis: newFeatureAnalysisState,
        dashRepresentationState: newDashState,
        hlsVariantState: newHlsState,
    };

    debugLog('LiveUpdateProcessor', 'Calling analysisActions.updateStream with payload:', updatePayload);
    analysisActions.updateStream(streamId, updatePayload);
    eventBus.dispatch('stream:data-updated', { streamId });
    if (segmentsWereUpdated) {
        eventBus.dispatch('stream:segments-updated', { streamId });
    }
}


/**
 * Initializes the service by subscribing to the live manifest update event.
 */
export function initializeLiveUpdateProcessor() {
    eventBus.subscribe('livestream:manifest-updated', processLiveUpdate);
}