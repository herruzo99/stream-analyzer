import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { debugLog } from '@/shared/utils/debug';

/**
 * The main handler for processing a live manifest update. This is now a simple
 * passthrough to the central state management, which handles all complex merging logic.
 * @param {object} updateData The event data from the worker.
 */
async function processLiveUpdate(updateData) {
    debugLog(
        'LiveUpdateProcessor',
        'Received "livestream:manifest-updated" event from worker.',
        updateData
    );
    const { streamId } = updateData;

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream) {
        debugLog(
            'LiveUpdateProcessor',
            `Stream ${streamId} not found. Aborting update.`
        );
        return;
    }

    // The new payload from shakaManifestHandler is now more comprehensive.
    // We can pass most of it directly to the robust `updateStream` action.
    const newUpdate = {
        timestamp: new Date().toLocaleTimeString(),
        diffHtml: updateData.diffHtml,
        rawManifest: updateData.newManifestString,
        complianceResults: updateData.complianceResults,
        hasNewIssues: false, // This could be enhanced later
        serializedManifest: updateData.serializedManifest,
    };

    const updatePayload = {
        manifest: updateData.newManifestObject,
        rawManifest: updateData.newManifestString,
        manifestUpdates: [newUpdate, ...stream.manifestUpdates].slice(0, 20),
        adAvails: updateData.adAvails, // The worker now provides the complete, diffed list
        // Pass the new states directly to the store action, which will handle merging
        dashRepresentationState: new Map(
            updateData.dashRepresentationState || []
        ),
        hlsVariantState: new Map(updateData.hlsVariantState || []),
    };

    analysisActions.updateStream(streamId, updatePayload);
}

/**
 * Initializes the service by subscribing to the live manifest update event from the worker.
 */
export function initializeLiveUpdateProcessor() {
    eventBus.subscribe('livestream:manifest-updated', processLiveUpdate);
}
