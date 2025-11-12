import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { eventBus } from '@/application/event-bus';
import { appLog } from '@/shared/utils/debug';
import { diffManifest } from '@/ui/shared/diff';
import xmlFormatter from 'xml-formatter';
import { useUiStore, uiActions } from '@/state/uiStore';
import { generateFeatureAnalysis } from '@/features/featureAnalysis/domain/analyzer';
import { AdAvail } from '@/features/advertising/domain/AdAvail.js';
import { resolveAdAvailsInWorker } from '@/features/advertising/application/resolveAdAvailWorker';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';

const MAX_MANIFEST_UPDATES_HISTORY = 200;

/**
 * After a live update, this function checks for any representations being
 * actively polled and dispatches fetch events for any new segments.
 * @param {import('@/types').Stream} stream The newly updated stream object.
 */
function queueNewSegmentsForPolledReps(stream) {
    if (!stream.segmentPollingReps || stream.segmentPollingReps.size === 0) {
        return;
    }

    const { get, set } = useSegmentCacheStore.getState();
    const repsToPoll = Array.from(stream.segmentPollingReps);

    appLog(
        'LiveUpdateProcessor',
        'info',
        `Checking for new segments in ${repsToPoll.length} actively polled representations for stream ${stream.id}.`
    );

    for (const repId of repsToPoll) {
        const repState =
            stream.dashRepresentationState.get(repId) ||
            stream.hlsVariantState.get(repId);

        if (
            !repState ||
            !repState.newlyAddedSegmentUrls ||
            repState.newlyAddedSegmentUrls.size === 0
        ) {
            continue;
        }

        const newSegmentUrls = Array.from(repState.newlyAddedSegmentUrls);
        const unloadedSegments = newSegmentUrls
            .map((uniqueId) =>
                repState.segments.find((seg) => seg.uniqueId === uniqueId)
            )
            .filter((seg) => {
                if (!seg || seg.gap) return false;
                const entry = get(seg.uniqueId);
                return !entry || (entry.status !== 200 && entry.status !== -1);
            });

        if (unloadedSegments.length > 0) {
            appLog(
                'LiveUpdateProcessor',
                'info',
                `Queueing ${unloadedSegments.length} new segments for polled representation: ${repId}`
            );

            unloadedSegments.forEach((seg) => {
                set(seg.uniqueId, {
                    status: -1,
                    data: null,
                    parsedData: null,
                });

                const { contentType } = inferMediaInfoFromExtension(
                    seg.resolvedUrl
                );

                let formatHint;
                if (stream.protocol === 'dash') {
                    formatHint =
                        stream.manifest.segmentFormat === 'unknown'
                            ? 'isobmff'
                            : stream.manifest.segmentFormat;
                } else {
                    formatHint =
                        contentType === 'text'
                            ? 'vtt'
                            : stream.manifest.segmentFormat === 'unknown'
                              ? 'ts' // HLS default
                              : stream.manifest.segmentFormat;
                }

                eventBus.dispatch('segment:fetch', {
                    uniqueId: seg.uniqueId,
                    streamId: stream.id,
                    format: formatHint,
                    context: {},
                });
            });
        }
    }
}

/**
 * The main handler for processing a live manifest update. This is now a simple
 * passthrough to the central state management, which handles all complex merging logic.
 * @param {object} updateData The event data from the worker.
 */
async function processLiveUpdate(updateData) {
    appLog(
        'LiveUpdateProcessor',
        'info',
        'Received "livestream:manifest-updated" event from worker.',
        updateData
    );
    const { streamId } = updateData;

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream) {
        appLog(
            'LiveUpdateProcessor',
            'warn',
            `Stream ${streamId} not found. Aborting update.`
        );
        return;
    }

    if (
        stream.protocol === 'hls' &&
        stream.manifest?.summary?.hls &&
        updateData.newManifestObject?.summary?.hls
    ) {
        const oldSummary = stream.manifest.summary;
        const newSummary = updateData.newManifestObject.summary;

        if (
            newSummary.general.duration === null &&
            oldSummary.general.duration
        ) {
            newSummary.general.duration = oldSummary.general.duration;
            newSummary.hls.dvrWindow = oldSummary.hls.dvrWindow;
            newSummary.hls.targetDuration = oldSummary.hls.targetDuration;
            newSummary.hls.mediaPlaylistDetails =
                oldSummary.hls.mediaPlaylistDetails;
            appLog(
                'LiveUpdateProcessor',
                'info',
                'Hydrating new HLS summary with duration data from previous state.',
                { duration: newSummary.general.duration }
            );
        }
    }

    const newUpdate = {
        id: `${streamId}-${Date.now()}`,
        sequenceNumber: (stream.manifestUpdates[0]?.sequenceNumber || 0) + 1,
        timestamp: new Date().toLocaleTimeString(),
        diffHtml: updateData.diffHtml,
        rawManifest: updateData.newManifestString,
        complianceResults: updateData.complianceResults,
        hasNewIssues:
            (updateData.complianceResults || []).filter(
                (r) => r.status === 'fail' || r.status === 'warn'
            ).length >
            (stream.manifestUpdates[0]?.complianceResults || []).filter(
                (r) => r.status === 'fail' || r.status === 'warn'
            ).length,
        serializedManifest: updateData.serializedManifest,
        changes: updateData.changes,
    };

    const newDashRepresentationState = new Map(
        updateData.dashRepresentationState || []
    );
    const newHlsVariantState = new Map(updateData.hlsVariantState || []);

    const updatePayload = {
        manifest: updateData.newManifestObject,
        rawManifest: updateData.newManifestString,
        manifestUpdates: [newUpdate, ...stream.manifestUpdates].slice(
            0,
            MAX_MANIFEST_UPDATES_HISTORY
        ),
        adAvails: updateData.adAvails,
        dashRepresentationState: newDashRepresentationState,
        hlsVariantState: newHlsVariantState,
        inbandEventsToAdd: updateData.inbandEvents,
    };

    analysisActions.updateStream(streamId, updatePayload);

    // --- ARCHITECTURAL FIX: Trigger segment fetches AFTER state is updated ---
    const updatedStream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (updatedStream) {
        queueNewSegmentsForPolledReps(updatedStream);
    }
    // --- END FIX ---

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
            analysisActions.setStreamPolling(streamId, false);
            uiActions.setConditionalPollingStatus('found');
            eventBus.dispatch('ui:show-status', {
                message: `Feature "${conditionalPolling.featureName}" found in ${stream.name}! Polling stopped.`,
                type: 'pass',
                duration: 10000,
            });
            eventBus.dispatch('notify:seek-poll-success', {
                featureName: conditionalPolling.featureName,
                streamName: stream.name,
            });
            appLog(
                'LiveUpdateProcessor',
                'info',
                `Conditional poll target "${conditionalPolling.featureName}" found. Stopping poll for stream ${streamId}.`
            );
        }
    }

    const streamAfterPollingLogic = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);

    if (
        streamAfterPollingLogic &&
        streamAfterPollingLogic.protocol === 'hls' &&
        streamAfterPollingLogic.manifest?.isMaster
    ) {
        appLog(
            'LiveUpdateProcessor',
            'info',
            'HLS Master playlist updated. Triggering media playlist refreshes.'
        );
        for (const variantUri of streamAfterPollingLogic.hlsVariantState.keys()) {
            eventBus.dispatch('hls:media-playlist-fetch-request', {
                streamId: streamAfterPollingLogic.id,
                variantUri,
                isBackground: true,
            });
        }
    }
}

/**
 * Initializes the service by subscribing to the live manifest update event from the worker.
 */
export function initializeLiveUpdateProcessor() {
    eventBus.subscribe('livestream:manifest-updated', processLiveUpdate);
}