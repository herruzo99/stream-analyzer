import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { eventBus } from '@/application/event-bus';
import { appLog } from '@/shared/utils/debug';
import { useUiStore, uiActions } from '@/state/uiStore';
import { generateFeatureAnalysis } from '@/features/featureAnalysis/domain/analyzer';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { runChecks } from '@/features/compliance/domain/engine';
import { diffManifest } from '@/ui/shared/diff';

const MAX_MANIFEST_UPDATES_HISTORY = 1000;

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
                            ? 'isobff'
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
 * The main handler for processing a live manifest update.
 * @param {object} updateData The event data from the worker.
 */
async function processLiveUpdate(updateData) {
    appLog(
        'LiveUpdateProcessor',
        'info',
        'Received "livestream:manifest-updated" event from worker.',
        updateData
    );
    const { streamId, finalUrl } = updateData;

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

    const updatePayload = {
        dashRepresentationState: new Map(
            updateData.dashRepresentationState || []
        ),
        hlsVariantState: new Map(updateData.hlsVariantState || []),
        adAvails: updateData.adAvails,
        inbandEventsToAdd: updateData.inbandEvents,
    };

    if (stream.protocol === 'hls') {
        const newMediaPlaylistsMap = new Map(stream.mediaPlaylists);

        // 1. Process Master Playlist update
        const oldMasterData = newMediaPlaylistsMap.get('master');
        const newMasterRaw = updateData.newManifestString;
        const isMasterUnchanged =
            oldMasterData && oldMasterData.rawManifest.trim() === newMasterRaw.trim();

        let newMasterUpdates = oldMasterData ? oldMasterData.updates : [];
        let newMasterActiveUpdateId = oldMasterData
            ? oldMasterData.activeUpdateId
            : null;

        if (isMasterUnchanged && newMasterUpdates[0]) {
            const latestMasterUpdate = newMasterUpdates[0];
            const newSeq =
                (latestMasterUpdate.endSequenceNumber ||
                    latestMasterUpdate.sequenceNumber) + 1;
            const mergedUpdate = {
                ...latestMasterUpdate,
                endSequenceNumber: newSeq,
                endTimestamp: new Date().toLocaleTimeString(),
            };
            newMasterUpdates = [mergedUpdate, ...newMasterUpdates.slice(1)];
        } else {
            const { diffModel, changes } = diffManifest(
                oldMasterData?.rawManifest || '',
                newMasterRaw
            );
            const newUpdate = {
                id: `${streamId}-master-${Date.now()}`,
                sequenceNumber:
                    (newMasterUpdates[0]?.endSequenceNumber ||
                        newMasterUpdates[0]?.sequenceNumber ||
                        0) + 1,
                timestamp: new Date().toLocaleTimeString(),
                diffModel,
                rawManifest: newMasterRaw,
                complianceResults: updateData.complianceResults,
                hasNewIssues: false,
                serializedManifest: updateData.serializedManifest,
                changes,
            };
            newMasterUpdates = [newUpdate, ...newMasterUpdates].slice(
                0,
                MAX_MANIFEST_UPDATES_HISTORY
            );
            newMasterActiveUpdateId = newUpdate.id;
        }

        newMediaPlaylistsMap.set('master', {
            manifest: updateData.newManifestObject,
            rawManifest: newMasterRaw,
            lastFetched: new Date(),
            updates: newMasterUpdates,
            activeUpdateId: newMasterActiveUpdateId,
        });

        // Update top-level stream properties with latest master info
        updatePayload.manifest = updateData.newManifestObject;
        updatePayload.rawManifest = newMasterRaw;

        // 2. Process Media Playlist updates
        if (updateData.newMediaPlaylists) {
            const incomingMediaPlaylists = new Map(updateData.newMediaPlaylists);
            for (const [
                variantId,
                newPlaylistData,
            ] of incomingMediaPlaylists.entries()) {
                const oldPlaylistData = stream.mediaPlaylists.get(variantId);
                if (!oldPlaylistData) continue;

                const oldRaw = oldPlaylistData.rawManifest || '';
                const newRaw = newPlaylistData.rawManifest || '';
                const isMediaUnchanged = oldRaw.trim() === newRaw.trim();
                const oldUpdates = oldPlaylistData.updates || [];
                let latestMediaUpdate = oldUpdates[0];
                let newMediaUpdates = oldUpdates;
                let newActiveUpdateId = oldPlaylistData.activeUpdateId;

                if (isMediaUnchanged && latestMediaUpdate) {
                    const newSeq =
                        (latestMediaUpdate.endSequenceNumber ||
                            latestMediaUpdate.sequenceNumber) + 1;
                    const mergedUpdate = {
                        ...latestMediaUpdate,
                        endSequenceNumber: newSeq,
                        endTimestamp: new Date().toLocaleTimeString(),
                    };
                    newMediaUpdates = [mergedUpdate, ...oldUpdates.slice(1)];
                } else if (!isMediaUnchanged) {
                    const { diffModel, changes } = diffManifest(oldRaw, newRaw);
                    const complianceResults = runChecks(
                        newPlaylistData.manifest,
                        'hls'
                    );
                    const newUpdate = {
                        id: `${streamId}-${variantId}-${Date.now()}`,
                        sequenceNumber:
                            (latestMediaUpdate?.endSequenceNumber ||
                                latestMediaUpdate?.sequenceNumber ||
                                0) + 1,
                        timestamp: new Date().toLocaleTimeString(),
                        diffModel,
                        rawManifest: newRaw,
                        complianceResults,
                        hasNewIssues: false,
                        serializedManifest:
                            newPlaylistData.manifest.serializedManifest,
                        changes,
                    };
                    newMediaUpdates = [
                        newUpdate,
                        ...newMediaUpdates,
                    ].slice(0, MAX_MANIFEST_UPDATES_HISTORY);
                    newActiveUpdateId = newUpdate.id;
                }
                newMediaPlaylistsMap.set(variantId, {
                    ...newPlaylistData,
                    updates: newMediaUpdates,
                    activeUpdateId: newActiveUpdateId,
                });
            }
        }
        updatePayload.mediaPlaylists = newMediaPlaylistsMap;
    } else {
        // DASH logic
        const latestUpdate = stream.manifestUpdates[0];
        const isUnchanged =
            latestUpdate &&
            latestUpdate.rawManifest.trim() ===
                updateData.newManifestString.trim();

        if (isUnchanged) {
            const newSequenceNumber =
                (latestUpdate.endSequenceNumber ||
                    latestUpdate.sequenceNumber) + 1;
            updatePayload.manifestUpdates = [
                {
                    ...latestUpdate,
                    endSequenceNumber: newSequenceNumber,
                    endTimestamp: new Date().toLocaleTimeString(),
                },
                ...stream.manifestUpdates.slice(1),
            ];
        } else {
            const { diffModel, changes } = diffManifest(
                stream.rawManifest,
                updateData.newManifestString
            );
            const newUpdate = {
                id: `${streamId}-${Date.now()}`,
                sequenceNumber:
                    (latestUpdate?.endSequenceNumber ||
                        latestUpdate?.sequenceNumber ||
                        0) + 1,
                timestamp: new Date().toLocaleTimeString(),
                diffModel,
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
                changes,
            };
            Object.assign(updatePayload, {
                manifest: updateData.newManifestObject,
                rawManifest: updateData.newManifestString,
                manifestUpdates: [newUpdate, ...stream.manifestUpdates].slice(
                    0,
                    MAX_MANIFEST_UPDATES_HISTORY
                ),
            });
        }
    }

    if (
        finalUrl &&
        finalUrl !== stream.resolvedUrl &&
        finalUrl !== stream.originalUrl
    ) {
        updatePayload.resolvedUrl = finalUrl;
        appLog(
            'LiveUpdateProcessor',
            'info',
            `Stream ${streamId} manifest redirected during update. New resolvedUrl: ${finalUrl}`
        );
    }

    analysisActions.updateStream(streamId, updatePayload);

    const updatedStream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (updatedStream) {
        queueNewSegmentsForPolledReps(updatedStream);
    }

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
}

/**
 * Initializes the service by subscribing to the live manifest update event from the worker.
 */
export function initializeLiveUpdateProcessor() {
    eventBus.subscribe('livestream:manifest-updated', processLiveUpdate);
}