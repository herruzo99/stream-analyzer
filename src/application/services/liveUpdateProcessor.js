import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { debugLog } from '@/shared/utils/debug';
import { diffManifest } from '@/ui/shared/diff';
import xmlFormatter from 'xml-formatter';

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
    const lastSequenceNumber =
        stream.manifestUpdates[0]?.sequenceNumber || 0;

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
}

/**
 * Initializes the service by subscribing to the live manifest update event from the worker.
 */
export function initializeLiveUpdateProcessor() {
    eventBus.subscribe('livestream:manifest-updated', processLiveUpdate);
}