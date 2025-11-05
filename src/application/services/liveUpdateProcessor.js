import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { debugLog } from '@/shared/utils/debug';
import { diffManifest } from '@/ui/shared/diff';
import xmlFormatter from 'xml-formatter';
import { useUiStore, uiActions } from '@/state/uiStore';
import { generateFeatureAnalysis } from '@/features/featureAnalysis/domain/analyzer';

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

    // --- ARCHITECTURAL REMEDIATION: Preserve HLS Summary Enrichment ---
    // The worker only re-parses the master playlist on updates, losing the enriched
    // data (like duration) that was gathered from a media playlist on initial load.
    // We must merge the old, enriched summary data into the new, sparse summary.
    if (
        stream.protocol === 'hls' &&
        stream.manifest?.summary?.hls &&
        updateData.newManifestObject?.summary?.hls
    ) {
        const oldSummary = stream.manifest.summary;
        const newSummary = updateData.newManifestObject.summary;

        // If the new summary (from master) is missing duration but the old one had it, carry it over.
        if (
            newSummary.general.duration === null &&
            oldSummary.general.duration
        ) {
            newSummary.general.duration = oldSummary.general.duration;
            newSummary.hls.dvrWindow = oldSummary.hls.dvrWindow;
            newSummary.hls.targetDuration = oldSummary.hls.targetDuration;
            newSummary.hls.mediaPlaylistDetails =
                oldSummary.hls.mediaPlaylistDetails;
            debugLog(
                'LiveUpdateProcessor',
                'Hydrating new HLS summary with duration data from previous state.',
                { duration: newSummary.general.duration }
            );
        }
    }
    // --- END REMEDIATION ---

    let formattedOld = stream.manifestUpdates[0]?.rawManifest || '';
    let formattedNew = updateData.newManifestString;
    if (stream.protocol === 'dash') {
        const formatOptions = { indentation: '  ', lineSeparator: '\n' };
        formattedOld = xmlFormatter(formattedOld, formatOptions);
        formattedNew = xmlFormatter(formattedNew, formatOptions);
    }

    const { diffHtml, changes } = diffManifest(
        formattedOld,
        formattedNew,
        stream.protocol
    );

    const oldIssueCount = (
        stream.manifestUpdates[0]?.complianceResults || []
    ).filter((r) => r.status === 'fail' || r.status === 'warn').length;
    const newIssueCount = (updateData.complianceResults || []).filter(
        (r) => r.status === 'fail' || r.status === 'warn'
    ).length;
    const hasNewIssues = newIssueCount > oldIssueCount;

    // Calculate the sequence number for this update.
    const lastSequenceNumber = stream.manifestUpdates[0]?.sequenceNumber || 1;

    const newUpdate = {
        id: `${streamId}-${Date.now()}`,
        sequenceNumber: lastSequenceNumber + 1,
        timestamp: new Date().toLocaleTimeString(),
        diffHtml,
        rawManifest: updateData.newManifestString,
        complianceResults: updateData.complianceResults,
        hasNewIssues,
        serializedManifest: updateData.serializedManifest,
        changes,
    };

    const updatePayload = {
        manifest: updateData.newManifestObject,
        rawManifest: updateData.newManifestString,
        manifestUpdates: [newUpdate, ...stream.manifestUpdates].slice(0, 50),
        adAvails: updateData.adAvails,
        dashRepresentationState: new Map(
            updateData.dashRepresentationState || []
        ),
        hlsVariantState: new Map(updateData.hlsVariantState || []),
    };

    analysisActions.updateStream(streamId, updatePayload);

    // --- NEW: Conditional Polling Check ---
    const { conditionalPolling } = useUiStore.getState();
    if (
        conditionalPolling.status === 'active' &&
        conditionalPolling.streamId === streamId
    ) {
        const featureAnalysisResults = new Map(
            Object.entries(
                generateFeatureAnalysis(
                    updateData.newManifestObject,
                    stream.protocol,
                    updateData.serializedManifest
                )
            )
        );

        const targetFeature = featureAnalysisResults.get(
            conditionalPolling.featureName
        );

        if (targetFeature && targetFeature.used) {
            // Feature Found! Stop polling for this specific stream.
            analysisActions.setStreamPolling(streamId, false);
            uiActions.setConditionalPollingStatus('found');
            eventBus.dispatch('ui:show-status', {
                message: `Feature "${conditionalPolling.featureName}" found in ${stream.name}! Polling stopped.`,
                type: 'pass',
                duration: 10000,
            });
            debugLog(
                'LiveUpdateProcessor',
                `Conditional poll target "${conditionalPolling.featureName}" found. Stopping poll for stream ${streamId}.`
            );
        }
    }
    // --- END NEW ---

    // --- ARCHITECTURAL FIX: Unify Live Update Data Paths ---
    // When the player is active, it takes over polling the master playlist. When we
    // process that update here, we must manually trigger the media playlist fetches
    // to ensure the Segment Explorer continues to receive new segments.
    const updatedStream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);

    if (
        updatedStream &&
        updatedStream.protocol === 'hls' &&
        updatedStream.manifest?.isMaster
    ) {
        debugLog(
            'LiveUpdateProcessor',
            'HLS Master playlist updated. Triggering media playlist refreshes.'
        );
        for (const variantUri of updatedStream.hlsVariantState.keys()) {
            eventBus.dispatch('hls:media-playlist-fetch-request', {
                streamId: updatedStream.id,
                variantUri,
                isBackground: true,
            });
        }
    }
    // --- END FIX ---
}

/**
 * Initializes the service by subscribing to the live manifest update event from the worker.
 */
export function initializeLiveUpdateProcessor() {
    eventBus.subscribe('livestream:manifest-updated', processLiveUpdate);
}