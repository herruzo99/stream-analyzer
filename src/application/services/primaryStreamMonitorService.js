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
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

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
            `Polling stream ${streamId} at ${urlToPoll}. Using manifest from timestamp ${latestUpdate?.timestamp} for comparison.`
        );

        // --- UNIFICATION: Use the same worker task as the Shaka plugin ---
        const workerTask = 'shaka-fetch-manifest';
        const payload = {
            streamId: stream.id,
            url: urlToPoll,
            auth: stream.auth,
            isLive: true, // <-- ARCHITECTURAL FIX: Explicitly flag as a live poll.
            oldRawManifest: oldRawManifestForDiff,
            protocol: stream.protocol,
            baseUrl: stream.baseUrl,
            hlsDefinedVariables: stream.hlsDefinedVariables,
            oldManifestObjectForDelta: stream.manifest?.serializedManifest,
            // Pass current segment and ad state to the worker for diffing
            oldDashRepresentationState: Array.from(
                stream.dashRepresentationState.entries()
            ),
            oldHlsVariantState: Array.from(stream.hlsVariantState.entries()),
            oldAdAvails: stream.adAvails || [],
            segmentPollingReps: Array.from(stream.segmentPollingReps || []),
        };

        // This task now triggers a 'livestream:manifest-updated' message on the main thread,
        // which is handled by the LiveUpdateProcessor service.
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
    const { globalPollingIntervalOverride } = useUiStore.getState();

    // Precedence: Per-stream -> Global -> Auto-calculated
    if (
        stream.pollingIntervalOverride !== undefined &&
        stream.pollingIntervalOverride !== null
    ) {
        return Math.max(stream.pollingIntervalOverride * 1000, 2000);
    }

    if (globalPollingIntervalOverride !== null) {
        return Math.max(globalPollingIntervalOverride * 1000, 2000);
    }

    const updatePeriodSeconds =
        stream.manifest.minimumUpdatePeriod ||
        stream.manifest.targetDuration || // HLS
        stream.manifest.minBufferTime || // DASH fallback
        2;
    return Math.max(updatePeriodSeconds * 1000, 2000);
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
            } else if (poller.pollInterval !== newPollInterval) {
                appLog(
                    'PrimaryMonitor',
                    'info',
                    `Restarting poller for stream ${stream.id} due to interval change.`
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
            appLog(
                'PrimaryMonitor',
                'info',
                'Inactivity timeout disabled by user override. Polling will continue in background.'
            );
            return;
        }

        const timeoutMs =
            inactivityTimeoutOverride === null
                ? INACTIVITY_TIMEOUT_MS
                : inactivityTimeoutOverride;

        appLog(
            'PrimaryMonitor',
            'info',
            `Tab is hidden. Setting inactivity timer for ${timeoutMs / 1000} seconds.`
        );

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

let tickerSubscription = null;

export function initializeLiveStreamMonitor() {
    if (tickerSubscription) tickerSubscription();
    tickerSubscription = eventBus.subscribe(
        EVENTS.TICKER.ONE_SECOND,
        managePollers
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
    for (const poller of pollers.values()) {
        if (poller.tickSubscription) poller.tickSubscription();
    }
    pollers.clear();
    for (const timerId of oneTimePollers.values()) {
        clearTimeout(timerId);
    }
    oneTimePollers.clear();
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
}
