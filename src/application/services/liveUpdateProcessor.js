import { eventBus } from '@/application/event-bus';
import { generateFeatureAnalysis } from '@/features/featureAnalysis/domain/analyzer';
import { applyPatches } from '@/features/manifestPatcher/domain/patchService';
import { parseManifest as parseDash } from '@/infrastructure/parsing/dash/parser.js';
import { parseManifest as parseHls } from '@/infrastructure/parsing/hls/index.js';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { appLog } from '@/shared/utils/debug';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import { diffManifest } from '@/ui/shared/diff';

// --- MEMORY BUDGET SETTINGS ---
// Total number of update entries to keep in the list (metadata).
const MAX_TOTAL_HISTORY = 100;

// The "Window": Number of recent updates to keep fully hydrated with Raw Text & AST.
// Allows deep inspection/diffing of recent updates without OOMing on long sessions.
const FULL_FIDELITY_WINDOW = 10;

/**
 * Prunes heavy objects from updates that have fallen out of the fidelity window.
 * @param {Array} updates The current list of updates (newest first).
 * @returns {Array} The optimized list of updates.
 */
function optimizeUpdateHistory(updates) {
    return updates.slice(0, MAX_TOTAL_HISTORY).map((update, index) => {
        // IF inside the window, keep everything.
        if (index < FULL_FIDELITY_WINDOW) {
            return update;
        }

        // IF outside the window, check if we need to strip data to save RAM.
        if (update.serializedManifest || update.rawManifest) {
            return {
                ...update,
                // Strip the heavy Abstract Syntax Tree
                serializedManifest: null,
                // Strip the large string, but leave a marker.
                // Note: We intentionally set this to a small string rather than null
                // to prevent UI components expecting a string from crashing,
                // while reclaiming 99% of the memory.
                rawManifest: `[Memory Optimization] Content purged for update #${update.sequenceNumber}.`,
                // We keep complianceResults, changes, and timestamp as they are lightweight.
            };
        }

        return update;
    });
}

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

                eventBus.dispatch(EVENTS.SEGMENT.FETCH, {
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
 * Merges new feature analysis results into the existing state.
 * Features that are "used" remain "used" even if transiently absent.
 * @param {import('@/types').FeatureAnalysisState} currentState
 * @param {Record<string, import('@/types').FeatureAnalysisResult>} newResults
 */
function mergeFeatureAnalysis(currentState, newResults) {
    const mergedResults = new Map(currentState.results);

    for (const [key, newResult] of Object.entries(newResults)) {
        const existing = mergedResults.get(key);
        if (!existing || (!existing.used && newResult.used)) {
            // Update if new, or if it flipped from false -> true
            mergedResults.set(key, newResult);
        } else if (existing.used && newResult.used) {
            // Update details if both true (keep latest details)
            mergedResults.set(key, newResult);
        }
        // If existing was true and new is false, keep existing as true (feature detected in stream history)
    }

    return {
        results: mergedResults,
        manifestCount: (currentState.manifestCount || 0) + 1,
    };
}

/**
 * The main handler for processing a live manifest update.
 * @param {object} updateData The event data from the worker.
 */
async function processLiveUpdate(updateData) {
    const { streamId, finalUrl, updatedPlaylistId } = updateData;

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream) {
        return;
    }

    if (stream.patchRules && stream.patchRules.length > 0) {
        const patchedContent = applyPatches(
            updateData.newManifestString,
            stream.patchRules
        );
        updateData.newManifestString = patchedContent;

        const parsingOptions = {
            isPrimary: true,
            isLive: stream.manifest.type === 'dynamic',
            hls: {
                masterPlaylist: stream.manifest.isMaster,
            },
        };

        let parsedResult;
        if (stream.protocol === 'hls') {
            parsedResult = await parseHls(
                patchedContent,
                stream.patchedManifestUrl || stream.originalUrl,
                undefined,
                parsingOptions
            );
        } else {
            parsedResult = await parseDash(
                patchedContent,
                stream.patchedManifestUrl || stream.originalUrl,
                parsingOptions
            );
        }
        updateData.newManifestObject = parsedResult.manifest;
    }

    // --- FEATURE ANALYSIS UPDATE ---
    const newFeatureResults = generateFeatureAnalysis(
        updateData.newManifestObject,
        stream.protocol,
        updateData.serializedManifest
    );

    const updatedFeatureAnalysis = mergeFeatureAnalysis(
        stream.featureAnalysis,
        newFeatureResults
    );

    // --- AD AVAIL MERGE (FIXED) ---
    const workerAdAvails = updateData.adAvails || [];
    const existingAdAvails = stream.adAvails || [];

    // 1. Use existing avails as the base to ensure history is preserved.
    // This protects against race conditions where the worker might have processed a stale state.
    const mergedMap = new Map();
    existingAdAvails.forEach((a) => mergedMap.set(a.id, a));

    // 2. Overlay worker avails. These are either new detections or updates to existing ones.
    workerAdAvails.forEach((a) => mergedMap.set(a.id, a));

    // 3. Cleanup 'unconfirmed' placeholder if real SCTE-35 events are now present.
    // The worker attempts this, but if we merge stale+fresh, we might re-introduce it.
    const finalAvailsList = Array.from(mergedMap.values());
    const hasRealScte35 = finalAvailsList.some(
        (a) =>
            a.id !== 'unconfirmed-inband-scte35' &&
            a.detectionMethod === 'SCTE35_INBAND'
    );

    let mergedAdAvails = finalAvailsList;
    if (hasRealScte35) {
        mergedAdAvails = finalAvailsList.filter(
            (a) => a.id !== 'unconfirmed-inband-scte35'
        );
    }

    // Sort by start time for UI consistency
    mergedAdAvails.sort((a, b) => a.startTime - b.startTime);

    const updatePayload = {
        dashRepresentationState: new Map(
            updateData.dashRepresentationState || []
        ),
        hlsVariantState: new Map(updateData.hlsVariantState || []),
        adAvails: mergedAdAvails,
        inbandEventsToAdd: updateData.inbandEvents,
        featureAnalysis: updatedFeatureAnalysis, // Apply the merged feature analysis
    };

    if (stream.protocol === 'hls') {
        const newMediaPlaylistsMap = new Map(stream.mediaPlaylists);

        // --- MASTER PLAYLIST UPDATE LOGIC ---
        // Only update master state if explicitly updating master OR
        // if this is the first load and we want to populate it.
        if (updatedPlaylistId === 'master' || !updatedPlaylistId) {
            const oldMasterData = newMediaPlaylistsMap.get('master');
            const newMasterRaw = updateData.newManifestString;
            const isMasterUnchanged =
                oldMasterData &&
                oldMasterData.rawManifest.trim() === newMasterRaw.trim();

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
                let diffModel = updateData.diffModel;
                let changes = updateData.changes;
                if (!diffModel) {
                    const diffRes = diffManifest(
                        oldMasterData?.rawManifest || '',
                        newMasterRaw
                    );
                    diffModel = diffRes.diffModel;
                    changes = diffRes.changes;
                }

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
                newMasterUpdates = optimizeUpdateHistory([
                    newUpdate,
                    ...newMasterUpdates,
                ]);
                if (!newMasterActiveUpdateId)
                    newMasterActiveUpdateId = newUpdate.id;
            }

            newMediaPlaylistsMap.set('master', {
                manifest: updateData.newManifestObject,
                rawManifest: newMasterRaw,
                lastFetched: new Date(),
                updates: newMasterUpdates,
                activeUpdateId: newMasterActiveUpdateId,
            });

            updatePayload.manifest = updateData.newManifestObject;
            updatePayload.rawManifest = newMasterRaw;
        }

        // --- MEDIA PLAYLIST (VARIANT) UPDATE LOGIC ---
        if (updateData.newMediaPlaylists) {
            const incomingMediaPlaylists = new Map(
                updateData.newMediaPlaylists
            );
            for (const [
                variantId,
                newPlaylistData,
            ] of incomingMediaPlaylists.entries()) {
                const oldPlaylistData = stream.mediaPlaylists.get(variantId);
                const prevData = oldPlaylistData || {
                    updates: [],
                    activeUpdateId: null,
                };

                const oldRaw = prevData.rawManifest || '';
                const newRaw = newPlaylistData.rawManifest || '';

                const isMediaUnchanged = oldRaw.trim() === newRaw.trim();
                const oldUpdates = prevData.updates || [];
                let newMediaUpdates = oldUpdates;
                let newActiveUpdateId = prevData.activeUpdateId;

                if (isMediaUnchanged && oldUpdates[0]) {
                    const latest = oldUpdates[0];
                    const newSeq =
                        (latest.endSequenceNumber || latest.sequenceNumber) + 1;
                    const mergedUpdate = {
                        ...latest,
                        endSequenceNumber: newSeq,
                        endTimestamp: new Date().toLocaleTimeString(),
                    };
                    newMediaUpdates = [mergedUpdate, ...oldUpdates.slice(1)];
                } else {
                    const { diffModel, changes } = diffManifest(oldRaw, newRaw);

                    const newUpdate = {
                        id: `${streamId}-${variantId}-${Date.now()}`,
                        sequenceNumber:
                            (oldUpdates[0]?.endSequenceNumber ||
                                oldUpdates[0]?.sequenceNumber ||
                                0) + 1,
                        timestamp: new Date().toLocaleTimeString(),
                        diffModel,
                        rawManifest: newRaw,
                        complianceResults: [],
                        hasNewIssues: false,
                        serializedManifest:
                            newPlaylistData.manifest.serializedManifest,
                        changes,
                    };

                    newMediaUpdates = optimizeUpdateHistory([
                        newUpdate,
                        ...newMediaUpdates,
                    ]);
                    if (!newActiveUpdateId) newActiveUpdateId = newUpdate.id;
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
        // DASH Update Logic (remains valid)
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
            // ARCHITECTURAL FIX: Use worker-provided diff model if available.
            let diffModel = updateData.diffModel;
            let changes = updateData.changes;

            if (!diffModel) {
                const diffRes = diffManifest(
                    stream.rawManifest,
                    updateData.newManifestString
                );
                diffModel = diffRes.diffModel;
                changes = diffRes.changes;
            }

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

            // Apply Optimization Strategy
            const optimizedUpdates = optimizeUpdateHistory([
                newUpdate,
                ...stream.manifestUpdates,
            ]);

            Object.assign(updatePayload, {
                manifest: updateData.newManifestObject,
                rawManifest: updateData.newManifestString,
                manifestUpdates: optimizedUpdates,
            });
        }
    }

    if (
        finalUrl &&
        finalUrl !== stream.resolvedUrl &&
        finalUrl !== stream.originalUrl
    ) {
        updatePayload.resolvedUrl = finalUrl;
    }

    analysisActions.updateStream(streamId, updatePayload);

    const updatedStream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (updatedStream) {
        queueNewSegmentsForPolledReps(updatedStream);
    }

    // --- Conditional Polling Check ---
    const { conditionalPolling } = useUiStore.getState();
    if (
        conditionalPolling.status === 'active' &&
        conditionalPolling.streamId === streamId
    ) {
        const targetFeature = newFeatureResults[conditionalPolling.featureName];

        if (targetFeature && targetFeature.used) {
            analysisActions.setStreamPolling(streamId, false);
            uiActions.setConditionalPollingStatus('found');
            eventBus.dispatch(EVENTS.UI.SHOW_STATUS, {
                message: `Feature "${conditionalPolling.featureName}" found in ${stream.name}! Polling stopped.`,
                type: 'pass',
                duration: 10000,
            });
            eventBus.dispatch(EVENTS.NOTIFY.SEEK_POLL_SUCCESS, {
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

export function initializeLiveUpdateProcessor() {
    eventBus.subscribe(EVENTS.LIVESTREAM.MANIFEST_UPDATED, processLiveUpdate);
}
