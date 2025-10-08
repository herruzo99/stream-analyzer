import { eventBus } from '@/application/event-bus.js';
import { useAnalysisStore } from '@/state/analysisStore.js';
import { workerService } from '@/infrastructure/worker/workerService.js';

const pollers = new Map();
const oneTimePollers = new Map();
let managerInterval = null;

async function monitorStream(streamId) {
    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === streamId);
    if (!stream || !stream.originalUrl) {
        stopMonitoring(streamId);
        return;
    }

    try {
        const response = await fetch(stream.originalUrl);
        if (!response.ok) return;
        const newManifestString = await response.text();

        if (newManifestString === stream.rawManifest) {
            return;
        }

        let workerPayload;
        if (stream.protocol === 'dash') {
            workerPayload = {
                streamId: stream.id,
                newManifestString,
                oldRawManifest: stream.rawManifest,
                protocol: stream.protocol,
                baseUrl: stream.baseUrl,
            };
        } else {
            // HLS protocol
            workerPayload = {
                streamId: stream.id,
                newManifestString,
                oldRawManifest: stream.rawManifest,
                protocol: stream.protocol,
                baseUrl: stream.baseUrl,
                hlsDefinedVariables: stream.hlsDefinedVariables,
                oldManifestObjectForDelta: stream.manifest?.serializedManifest,
            };
        }

        const updateResult = await workerService.postTask(
            'parse-live-update',
            workerPayload
        );

        eventBus.dispatch('livestream:manifest-updated', updateResult);
    } catch (e) {
        console.error(
            `[Stream Monitor] Error during update cycle for stream ${stream.id}:`,
            e
        );
    }
}

function startMonitoring(stream) {
    if (pollers.has(stream.id)) {
        return;
    }
    if (stream.manifest?.type === 'dynamic' && stream.originalUrl) {
        const updatePeriodSeconds =
            stream.manifest.minimumUpdatePeriod ||
            stream.manifest.minBufferTime ||
            2;
        const pollInterval = Math.max(updatePeriodSeconds * 1000, 2000);

        const pollerId = setInterval(
            () => monitorStream(stream.id),
            pollInterval
        );
        pollers.set(stream.id, pollerId);
    }
}

function stopMonitoring(streamId) {
    if (pollers.has(streamId)) {
        clearInterval(pollers.get(streamId));
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
        const isCurrentlyPolling = pollers.has(stream.id);
        if (stream.isPolling && !isCurrentlyPolling) {
            startMonitoring(stream);
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
}

export function stopAllMonitoring() {
    if (managerInterval) {
        clearInterval(managerInterval);
        managerInterval = null;
    }
    for (const pollerId of pollers.values()) {
        clearInterval(pollerId);
    }
    pollers.clear();
    for (const timerId of oneTimePollers.values()) {
        clearTimeout(timerId);
    }
    oneTimePollers.clear();
}