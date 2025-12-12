import { eventBus } from '@/application/event-bus';
import { workerService } from '@/infrastructure/worker/workerService';
import { appLog } from '@/shared/utils/debug';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';

// Map<streamId, { timerId: number, pollInterval: number, lastPollTime: number }>
const pollers = new Map();
const oneTimePollers = new Map();
let inactivityTimer = null;
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

// Tracks adaptive state: { unchangedStreak: number, missedSegmentStreak: number }
const backoffState = new Map();

function getBackoffState(streamId) {
    if (!backoffState.has(streamId)) {
        backoffState.set(streamId, {
            unchangedStreak: 0,
            missedSegmentStreak: 0,
        });
    }
    return backoffState.get(streamId);
}

async function monitorStream(streamId) {
    // 1. Identity Check: Capture the current poller instance.
    const activePoller = pollers.get(streamId);
    if (!activePoller) return;

    // --- ARCHITECTURAL FIX: Decoupling ---
    // We no longer check getStreamPollingMode() to yield control.
    // The Analyzer polling must run independently to maintain global state freshness.

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);

    if (!stream || (!stream.originalUrl && !stream.resolvedUrl)) {
        stopMonitoring(streamId);
        return;
    }

    activePoller.lastPollTime = performance.now();

    try {
        const latestUpdate = stream.manifestUpdates[0];
        const oldRawManifestForDiff = latestUpdate
            ? latestUpdate.rawManifest
            : stream.rawManifest;

        const urlToPoll = stream.resolvedUrl || stream.originalUrl;

        const workerTask = 'shaka-fetch-manifest';
        const payload = {
            streamId: stream.id,
            url: urlToPoll,
            auth: stream.auth,
            isLive: true,
            // ARCHITECTURAL FIX: Explicitly identify as analysis polling
            purpose: 'analysis',
            oldRawManifest: oldRawManifestForDiff,
            protocol: stream.protocol,
            baseUrl: stream.baseUrl,
            hlsDefinedVariables: stream.hlsDefinedVariables,
            oldManifestObjectForDelta: stream.manifest?.serializedManifest,
            oldDashRepresentationState: Array.from(
                stream.dashRepresentationState.entries()
            ),
            oldHlsVariantState: Array.from(stream.hlsVariantState.entries()),
            oldAdAvails: stream.adAvails || [],
            segmentPollingReps: Array.from(stream.segmentPollingReps || []),
        };

        await workerService.postTask(workerTask, payload).promise;
    } catch (e) {
        console.error(
            `[Stream Monitor] Error during update cycle for stream ${stream.id}:`,
            e
        );
        eventBus.dispatch(EVENTS.UI.SHOW_STATUS, {
            message: `Live update failed for ${stream.name}: ${e.message}`,
            type: 'fail',
            duration: 5000,
        });
    } finally {
        const currentPoller = pollers.get(streamId);
        if (currentPoller === activePoller) {
            scheduleNextPoll(streamId);
        }
    }
}

// ... [getBasePollInterval and calculatePollInterval remain unchanged] ...
function getBasePollInterval(manifest, override = null) {
    if (override !== null && override !== undefined) {
        return Math.max(override * 1000, 200);
    }
    if (!manifest) return 2000;
    let updatePeriodSeconds = manifest.minimumUpdatePeriod;
    if (!updatePeriodSeconds && manifest.type === 'dynamic') {
        const lastSegDur =
            manifest.summary?.hls?.mediaPlaylistDetails?.lastSegmentDuration;
        if (typeof lastSegDur === 'number' && lastSegDur > 0) {
            updatePeriodSeconds = lastSegDur;
        } else {
            updatePeriodSeconds = manifest.summary?.hls?.targetDuration;
        }
    }
    if (!updatePeriodSeconds) {
        updatePeriodSeconds =
            manifest.summary?.hls?.targetDuration ||
            manifest.minBufferTime ||
            2;
    }
    return Math.max(updatePeriodSeconds * 1000, 500);
}

function calculatePollInterval(stream) {
    const { globalPollingIntervalOverride, pollingMode } =
        useUiStore.getState();

    const baseInterval = getBasePollInterval(
        stream.manifest,
        stream.pollingIntervalOverride !== undefined
            ? stream.pollingIntervalOverride
            : globalPollingIntervalOverride
    );

    if (pollingMode === 'smart') {
        const state = getBackoffState(stream.id);
        if (state.missedSegmentStreak > 0) {
            const speedFactor = 0.1 * state.missedSegmentStreak;
            const cappedFactor = Math.min(speedFactor, 0.8);
            const reducedInterval = Math.floor(
                baseInterval * (1 - cappedFactor)
            );
            return Math.max(200, reducedInterval);
        }
        if (state.unchangedStreak > 0) {
            const slowFactor = 0.05 * state.unchangedStreak;
            const cappedFactor = Math.min(slowFactor, 1.5);
            const increasedInterval = Math.floor(
                baseInterval * (1 + cappedFactor)
            );
            return increasedInterval;
        }
    }
    return baseInterval;
}

function scheduleNextPoll(streamId) {
    const poller = pollers.get(streamId);
    if (!poller) return;

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);

    if (!stream || !stream.isPolling) {
        stopMonitoring(streamId);
        return;
    }

    const nextInterval = calculatePollInterval(stream);
    poller.pollInterval = nextInterval;

    const now = performance.now();
    const timeSinceLastPoll = now - poller.lastPollTime;
    const delay = Math.max(0, nextInterval - timeSinceLastPoll);

    if (poller.timerId) clearTimeout(poller.timerId);

    poller.timerId = setTimeout(() => {
        monitorStream(streamId);
    }, delay);
}

function startMonitoring(stream, lastPollTime = 0) {
    if (pollers.has(stream.id)) {
        return;
    }
    if (
        stream.manifest?.type === 'dynamic' &&
        (stream.originalUrl || stream.resolvedUrl)
    ) {
        const pollInterval = calculatePollInterval(stream);

        const poller = {
            pollInterval,
            lastPollTime: lastPollTime || performance.now(),
            timerId: null,
        };

        pollers.set(stream.id, poller);
        scheduleNextPoll(stream.id);
    }
}

function stopMonitoring(streamId) {
    if (pollers.has(streamId)) {
        const poller = pollers.get(streamId);
        if (poller.timerId) {
            clearTimeout(poller.timerId);
        }
        pollers.delete(streamId);
    }
    if (oneTimePollers.has(streamId)) {
        clearTimeout(oneTimePollers.get(streamId));
        oneTimePollers.delete(streamId);
    }
    if (backoffState.has(streamId)) {
        backoffState.set(streamId, {
            unchangedStreak: 0,
            missedSegmentStreak: 0,
        });
    }
}

export function managePollers() {
    const dynamicStreams = useAnalysisStore
        .getState()
        .streams.filter((s) => s.manifest?.type === 'dynamic');

    dynamicStreams.forEach((stream) => {
        // --- ARCHITECTURAL FIX: Decoupling ---
        // We do NOT check getStreamPollingMode() here. The `stream.isPolling` flag
        // is the sole source of truth for the Analyzer.

        const poller = pollers.get(stream.id);
        const isCurrentlyPolling = !!poller;
        const targetInterval = calculatePollInterval(stream);

        if (stream.isPolling) {
            if (!isCurrentlyPolling) {
                startMonitoring(stream);
            } else if (Math.abs(poller.pollInterval - targetInterval) > 200) {
                const previousLastPollTime = poller.lastPollTime;
                stopMonitoring(stream.id);
                startMonitoring(stream, previousLastPollTime);
            }
        } else if (!stream.isPolling && isCurrentlyPolling) {
            stopMonitoring(stream.id);
        }
    });

    // Cleanup zombies
    for (const streamId of pollers.keys()) {
        if (!dynamicStreams.some((s) => s.id === streamId)) {
            stopMonitoring(streamId);
        }
    }
}

// ... [scheduleOneTimePoll, handleVisibilityChange, onManifestUpdated, init/stop functions remain unchanged] ...
function scheduleOneTimePoll({ streamId, pollTime, reason }) {
    const now = Date.now();
    const delay = pollTime - now;

    if (delay <= 0 || oneTimePollers.has(streamId)) {
        return;
    }

    appLog(
        'PrimaryMonitor',
        'info',
        `Scheduling priority poll for ${streamId} in ${delay}ms (${reason})`
    );

    const timerId = setTimeout(() => {
        monitorStream(streamId);
        oneTimePollers.delete(streamId);
    }, delay);

    oneTimePollers.set(streamId, timerId);
}

function handleVisibilityChange() {
    if (document.hidden) {
        if (inactivityTimer) clearTimeout(inactivityTimer);

        const { inactivityTimeoutOverride } = useUiStore.getState();

        if (inactivityTimeoutOverride === Infinity) {
            return;
        }

        const timeoutMs =
            inactivityTimeoutOverride === null
                ? INACTIVITY_TIMEOUT_MS
                : inactivityTimeoutOverride;

        inactivityTimer = setTimeout(() => {
            const isAnyPolling = useAnalysisStore
                .getState()
                .streams.some(
                    (s) => s.manifest?.type === 'dynamic' && s.isPolling
                );

            if (isAnyPolling) {
                analysisActions.setAllLiveStreamsPolling(false, {
                    fromInactivity: true,
                });
                eventBus.dispatch(EVENTS.NOTIFY.POLLING_DISABLED);
            }
        }, timeoutMs);
    } else {
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
    }
}

function onManifestUpdated(payload) {
    const {
        streamId,
        changes,
        dashRepresentationState,
        hlsVariantState,
        newMediaPlaylists,
        newManifestObject,
    } = payload;
    const state = getBackoffState(streamId);
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    const isHls = stream?.protocol === 'hls';

    if (stream && newManifestObject) {
        const oldBase = getBasePollInterval(stream.manifest);
        const newBase = getBasePollInterval(newManifestObject);

        if (Math.abs(oldBase - newBase) > 100) {
            state.unchangedStreak = 0;
            state.missedSegmentStreak = 0;
            stream.manifest = newManifestObject;
        }
    }

    let maxNewSegments = 0;
    let isEffectiveChange = false;

    const rootHasChanges =
        changes.additions > 0 ||
        changes.removals > 0 ||
        changes.modifications > 0;

    if (rootHasChanges) {
        isEffectiveChange = true;
    }

    if (isHls && newMediaPlaylists && newMediaPlaylists.length > 0) {
        for (const [, playlistData] of newMediaPlaylists) {
            const updates = playlistData.updates || [];
            if (updates.length > 0) {
                const latest = updates[0];
                if (
                    latest.changes.additions > 0 ||
                    latest.changes.removals > 0 ||
                    latest.changes.modifications > 0
                ) {
                    isEffectiveChange = true;
                }
            }
        }

        if (hlsVariantState) {
            for (const [, variantData] of hlsVariantState) {
                const newCount = variantData.newlyAddedSegmentUrls
                    ? variantData.newlyAddedSegmentUrls.size
                    : 0;
                if (newCount > maxNewSegments) maxNewSegments = newCount;
            }
        }
    } else if (dashRepresentationState) {
        for (const [, repData] of dashRepresentationState) {
            const newCount = repData.newlyAddedSegmentUrls
                ? repData.newlyAddedSegmentUrls.size
                : 0;
            if (newCount > maxNewSegments) maxNewSegments = newCount;
        }
        if (maxNewSegments > 0) {
            isEffectiveChange = true;
        }
    }

    if (maxNewSegments > 1) {
        state.missedSegmentStreak++;
        state.unchangedStreak = 0;
    } else if (maxNewSegments === 1 || isEffectiveChange) {
        state.missedSegmentStreak = Math.max(0, state.missedSegmentStreak - 1);
        state.unchangedStreak = 0;
    } else {
        state.unchangedStreak++;
        state.missedSegmentStreak = 0;
    }

    if (stream) {
        const currentManifest = newManifestObject || stream.manifest;
        const nextInterval = calculatePollInterval({
            ...stream,
            manifest: currentManifest,
        });

        if (stream.smartPollingInterval !== nextInterval) {
            analysisActions.updateStream(streamId, {
                smartPollingInterval: nextInterval,
            });
        }
    }
}

let tickerSubscription = null;
let manifestUpdateSubscription = null;

export function initializeLiveStreamMonitor() {
    if (tickerSubscription) tickerSubscription();
    if (manifestUpdateSubscription) manifestUpdateSubscription();

    tickerSubscription = eventBus.subscribe(
        EVENTS.TICKER.ONE_SECOND,
        managePollers
    );

    manifestUpdateSubscription = eventBus.subscribe(
        EVENTS.LIVESTREAM.MANIFEST_UPDATED,
        onManifestUpdated
    );

    eventBus.subscribe(EVENTS.STATE.STREAM_UPDATED, managePollers);
    eventBus.subscribe(EVENTS.STATE.ANALYSIS_COMPLETE, managePollers);
    eventBus.subscribe(EVENTS.MANIFEST.FORCE_RELOAD, ({ streamId }) =>
        monitorStream(streamId)
    );
    eventBus.subscribe(
        EVENTS.MONITOR.SCHEDULE_ONE_TIME_POLL,
        scheduleOneTimePoll
    );

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

export function stopAllMonitoring() {
    if (tickerSubscription) {
        tickerSubscription();
        tickerSubscription = null;
    }
    if (manifestUpdateSubscription) {
        manifestUpdateSubscription();
        manifestUpdateSubscription = null;
    }
    for (const poller of pollers.values()) {
        if (poller.timerId) clearTimeout(poller.timerId);
    }
    pollers.clear();
    for (const timerId of oneTimePollers.values()) {
        clearTimeout(timerId);
    }
    oneTimePollers.clear();
    backoffState.clear();
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
}
