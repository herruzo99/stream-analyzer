import { eventBus } from '@/application/event-bus';
import { playerService } from '@/features/playerSimulation/application/playerService';
import { workerService } from '@/infrastructure/worker/workerService';
import { appLog } from '@/shared/utils/debug';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';

const pollers = new Map();
const oneTimePollers = new Map();
let inactivityTimer = null;
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

const backoffState = new Map();

function getBackoffState(streamId) {
    if (!backoffState.has(streamId)) {
        backoffState.set(streamId, { unchangedCount: 0 });
    }
    return backoffState.get(streamId);
}

async function monitorStream(streamId) {
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream || (!stream.originalUrl && !stream.resolvedUrl)) {
        stopMonitoring(streamId);
        return;
    }

    try {
        const latestUpdate = stream.manifestUpdates[0];
        const oldRawManifestForDiff = latestUpdate
            ? latestUpdate.rawManifest
            : stream.rawManifest;

        const urlToPoll = stream.resolvedUrl || stream.originalUrl;

        appLog(
            'PrimaryMonitor',
            'info',
            `Polling stream ${streamId} at ${urlToPoll}.`
        );

        // ARCHITECTURAL FIX: Do NOT pass intervention rules here.
        // Chaos tools should only affect the Player Simulation, not the analyzer's monitoring.
        const workerTask = 'shaka-fetch-manifest';
        const payload = {
            streamId: stream.id,
            url: urlToPoll,
            auth: stream.auth,
            isLive: true,
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
    }
}

function calculatePollInterval(stream) {
    const { globalPollingIntervalOverride, pollingMode } =
        useUiStore.getState();

    let baseInterval = 2000;

    if (
        stream.pollingIntervalOverride !== undefined &&
        stream.pollingIntervalOverride !== null
    ) {
        baseInterval = Math.max(stream.pollingIntervalOverride * 1000, 1000);
    } else if (globalPollingIntervalOverride !== null) {
        baseInterval = Math.max(globalPollingIntervalOverride * 1000, 1000);
    } else {
        const updatePeriodSeconds =
            stream.manifest.minimumUpdatePeriod ||
            stream.manifest.targetDuration ||
            stream.manifest.minBufferTime ||
            2;
        baseInterval = Math.max(updatePeriodSeconds * 1000, 2000);
    }

    if (pollingMode === 'smart') {
        const state = getBackoffState(stream.id);
        if (state.unchangedCount > 0) {
            const multiplier = 1 + Math.min(state.unchangedCount * 0.1, 1.5);
            const adaptiveInterval = baseInterval * multiplier;

            if (state.unchangedCount % 5 === 0) {
                appLog(
                    'PrimaryMonitor',
                    'info',
                    `Smart Polling: Backing off stream ${stream.id} to ${adaptiveInterval.toFixed(0)}ms (Misses: ${state.unchangedCount})`
                );
            }

            return adaptiveInterval;
        }
    }

    return baseInterval;
}

function startMonitoring(stream) {
    if (pollers.has(stream.id)) {
        return;
    }
    if (
        stream.manifest?.type === 'dynamic' &&
        (stream.originalUrl || stream.resolvedUrl)
    ) {
        const pollInterval = calculatePollInterval(stream);
        appLog(
            'PrimaryMonitor',
            'info',
            `Starting poller for stream ${stream.id} with interval ${pollInterval}ms.`
        );

        const poller = {
            pollInterval,
            lastPollTime: 0,
            tickSubscription: null,
        };

        poller.tickSubscription = eventBus.subscribe(
            EVENTS.TICKER.ONE_SECOND,
            () => {
                if (
                    performance.now() - poller.lastPollTime >
                    poller.pollInterval
                ) {
                    poller.lastPollTime = performance.now();
                    monitorStream(stream.id);
                }
            }
        );

        pollers.set(stream.id, poller);
    }
}

function stopMonitoring(streamId) {
    if (pollers.has(streamId)) {
        appLog(
            'PrimaryMonitor',
            'info',
            `Stopping poller for stream ${streamId}.`
        );
        const poller = pollers.get(streamId);
        if (poller.tickSubscription) {
            poller.tickSubscription();
        }
        pollers.delete(streamId);
    }
    if (oneTimePollers.has(streamId)) {
        clearTimeout(oneTimePollers.get(streamId));
        oneTimePollers.delete(streamId);
    }
    if (backoffState.has(streamId)) {
        backoffState.set(streamId, { unchangedCount: 0 });
    }
}

export function managePollers() {
    const dynamicStreams = useAnalysisStore
        .getState()
        .streams.filter((s) => s.manifest?.type === 'dynamic');

    const singlePlayerActiveStreamIds = playerService.getActiveStreamIds();
    const multiPlayerActiveSourceStreamIds = new Set(
        Array.from(useMultiPlayerStore.getState().players.values())
            .filter((p) => p.state === 'playing' || p.state === 'buffering')
            .map((p) => p.sourceStreamId)
    );

    dynamicStreams.forEach((stream) => {
        const isHandledByPlayer =
            singlePlayerActiveStreamIds.has(stream.id) ||
            multiPlayerActiveSourceStreamIds.has(stream.id);

        if (isHandledByPlayer) {
            if (pollers.has(stream.id)) {
                appLog(
                    'PrimaryMonitor',
                    'info',
                    `Ceding polling control of stream ${stream.id} to a player service.`
                );
                stopMonitoring(stream.id);
            }
            return;
        }

        const poller = pollers.get(stream.id);
        const isCurrentlyPolling = !!poller;
        const newPollInterval = calculatePollInterval(stream);

        if (stream.isPolling) {
            if (!isCurrentlyPolling) {
                startMonitoring(stream);
            } else if (Math.abs(poller.pollInterval - newPollInterval) > 100) {
                appLog(
                    'PrimaryMonitor',
                    'info',
                    `Adjusting poller for stream ${stream.id} to ${newPollInterval.toFixed(0)}ms (Smart Mode)`
                );
                stopMonitoring(stream.id);
                startMonitoring(stream);
            }
        } else if (!stream.isPolling && isCurrentlyPolling) {
            stopMonitoring(stream.id);
        }
    });

    for (const streamId of pollers.keys()) {
        if (!dynamicStreams.some((s) => s.id === streamId)) {
            stopMonitoring(streamId);
        }
    }
}

function scheduleOneTimePoll({ streamId, pollTime, reason }) {
    const now = Date.now();
    const delay = pollTime - now;

    if (delay <= 0 || oneTimePollers.has(streamId)) {
        return;
    }

    appLog(
        'PrimaryMonitor',
        'info',
        `Scheduling high-priority poll for stream ${streamId} in ${delay}ms. Reason: ${reason}`
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
    const { streamId, changes } = payload;
    const state = getBackoffState(streamId);

    const isUnchanged =
        changes.additions === 0 &&
        changes.removals === 0 &&
        changes.modifications === 0;

    if (isUnchanged) {
        state.unchangedCount++;
    } else {
        state.unchangedCount = 0;
        managePollers();
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
        if (poller.tickSubscription) poller.tickSubscription();
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
