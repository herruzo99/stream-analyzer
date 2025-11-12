import { eventBus } from '@/application/event-bus';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { workerService } from '@/infrastructure/worker/workerService';
import { appLog } from '@/shared/utils/debug';
import { playerService } from '@/features/playerSimulation/application/playerService';
import { useUiStore } from '@/state/uiStore';

const pollers = new Map();
const oneTimePollers = new Map();
let inactivityTimer = null;
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

async function monitorStream(streamId) {
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream || !stream.originalUrl) {
        stopMonitoring(streamId);
        return;
    }

    try {
        const latestUpdate = stream.manifestUpdates[0];
        const oldRawManifestForDiff = latestUpdate
            ? latestUpdate.rawManifest
            : stream.rawManifest;

        appLog(
            'PrimaryMonitor',
            'info',
            `Polling stream ${streamId}. Using manifest from timestamp ${latestUpdate?.timestamp} for comparison.`
        );

        // --- UNIFICATION: Use the same worker task as the Shaka plugin ---
        const workerTask = 'shaka-fetch-manifest';
        const payload = {
            streamId: stream.id,
            url: stream.originalUrl,
            auth: stream.auth,
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
        eventBus.dispatch('ui:show-status', {
            message: `Live update failed for ${stream.name}: ${e.message}`,
            type: 'fail',
            duration: 5000,
        });
    }
}

function calculatePollInterval(stream) {
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
    if (stream.manifest?.type === 'dynamic' && stream.originalUrl) {
        const pollInterval = calculatePollInterval(stream);
        appLog(
            'PrimaryMonitor',
            'info',
            `Starting poller for stream ${stream.id} with interval ${pollInterval}ms.`
        );

        // The poller object now stores the interval and the last poll time.
        const poller = {
            pollInterval,
            lastPollTime: 0,
            tickSubscription: null,
        };

        // Subscribe to the unified ticker instead of using setInterval.
        poller.tickSubscription = eventBus.subscribe(
            'ticker:one-second-tick',
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
            poller.tickSubscription(); // Unsubscribe from the ticker
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

    const playerActiveStreamIds = playerService.getActiveStreamIds();

    dynamicStreams.forEach((stream) => {
        if (playerActiveStreamIds.has(stream.id)) {
            if (pollers.has(stream.id)) {
                appLog(
                    'PrimaryMonitor',
                    'info',
                    `Ceding polling control of stream ${stream.id} to PlayerService.`
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
            return; // User has disabled the timeout.
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
                eventBus.dispatch('notify:polling-disabled');
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
        'ticker:one-second-tick',
        managePollers
    );

    eventBus.subscribe('state:stream-updated', managePollers);
    eventBus.subscribe('state:analysis-complete', managePollers);
    eventBus.subscribe('player:active-streams-changed', managePollers);
    eventBus.subscribe('manifest:force-reload', ({ streamId }) =>
        monitorStream(streamId)
    );
    eventBus.subscribe('monitor:schedule-one-time-poll', scheduleOneTimePoll);

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