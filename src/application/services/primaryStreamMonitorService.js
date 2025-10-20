import { eventBus } from '@/application/event-bus';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { workerService } from '@/infrastructure/worker/workerService';

const pollers = new Map();
const oneTimePollers = new Map();
let managerInterval = null;
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
        // Delegate fetching and parsing to the worker
        const updateResult = await workerService.postTask(
            'live-update-fetch-and-parse',
            {
                streamId: stream.id,
                url: stream.originalUrl,
                oldRawManifest: stream.rawManifest,
                protocol: stream.protocol,
                baseUrl: stream.baseUrl,
                auth: stream.auth,
                hlsDefinedVariables: stream.hlsDefinedVariables,
                oldManifestObjectForDelta: stream.manifest?.serializedManifest,
            }
        );

        // A null result means the manifest was unchanged, so we do nothing.
        if (updateResult) {
            eventBus.dispatch('livestream:manifest-updated', updateResult);
        }
    } catch (e) {
        console.error(
            `[Stream Monitor] Error during update cycle for stream ${stream.id}:`,
            e
        );
        // Optionally dispatch an error event to show a toast
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
        const pollerId = setInterval(
            () => monitorStream(stream.id),
            pollInterval
        );
        pollers.set(stream.id, { pollerId, pollInterval });
    }
}

function stopMonitoring(streamId) {
    if (pollers.has(streamId)) {
        clearInterval(pollers.get(streamId).pollerId);
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

    dynamicStreams.forEach((stream) => {
        const poller = pollers.get(stream.id);
        const isCurrentlyPolling = !!poller;
        const newPollInterval = calculatePollInterval(stream);

        if (stream.isPolling) {
            if (!isCurrentlyPolling) {
                startMonitoring(stream);
            } else if (poller.pollInterval !== newPollInterval) {
                // Interval has changed, restart the poller
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

    console.log(
        `[Monitor] Scheduling high-priority poll for stream ${streamId} in ${delay}ms. Reason: ${reason}`
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
        inactivityTimer = setTimeout(() => {
            analysisActions.setAllLiveStreamsPolling(false, {
                fromInactivity: true,
            });
        }, INACTIVITY_TIMEOUT_MS);
    } else {
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
    }
}

export function initializeLiveStreamMonitor() {
    if (managerInterval) {
        clearInterval(managerInterval);
    }
    managerInterval = setInterval(managePollers, 1000);
    eventBus.subscribe('state:stream-updated', managePollers);
    eventBus.subscribe('state:analysis-complete', managePollers);
    eventBus.subscribe('manifest:force-reload', ({ streamId }) =>
        monitorStream(streamId)
    );
    eventBus.subscribe('monitor:schedule-one-time-poll', scheduleOneTimePoll);

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

export function stopAllMonitoring() {
    if (managerInterval) {
        clearInterval(managerInterval);
        managerInterval = null;
    }
    for (const poller of pollers.values()) {
        clearInterval(poller.pollerId);
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
