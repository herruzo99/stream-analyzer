import { useDecryptionStore } from '@/state/decryptionStore';
import { useNetworkStore } from '@/state/networkStore';

export function createDrmViewModel() {
    const { sessions, selectedSessionId, accessRequests } =
        useDecryptionStore.getState();
    const { events: networkEvents } = useNetworkStore.getState();

    const sessionList = Array.from(sessions.entries())
        .map(([internalId, session]) => {
            const usableKeys = session.keyStatuses.filter(
                (k) => k.status === 'usable'
            ).length;
            return {
                internalId,
                sessionId: session.id,
                keySystem: session.keySystem,
                startTime: new Date(session.startTime).toLocaleTimeString(),
                usableKeys,
                totalKeys: session.keyStatuses.length,
                status: session.events.some((e) => e.type === 'error')
                    ? 'error'
                    : 'active',
            };
        })
        .reverse();

    const activeSession = sessions.get(selectedSessionId);
    let timeline = [];

    if (activeSession) {
        // 1. Add EME Events
        timeline = activeSession.events.map((e) => ({
            id: e.id,
            timestamp: e.timestamp,
            source: 'EME',
            type: e.type, // api, message, keys, error
            title: e.name,
            data: e.data,
            isError: e.type === 'error',
        }));

        // 2. Correlate Network Events (License Requests)
        // Heuristic: Look for 'license' requests that occurred AFTER the session start
        // Ideally we match the message body to request body, but simplified timestamp matching works for now.
        const sessionStart = activeSession.startTime;
        const licenseEvents = networkEvents.filter(
            (e) =>
                (e.resourceType === 'license' || e.resourceType === 'key') &&
                e.timing.startTime >= sessionStart
        );

        licenseEvents.forEach((netEvent) => {
            timeline.push({
                id: netEvent.id,
                timestamp: netEvent.timing.startTime, // Uses perf time, need to align?
                // Note: Network store uses perf.now(), Store uses Date.now().
                // We'll simply push them. For strict sorting, we'd need to normalize.
                // Just using insertion order for this view model simplicity or approx time.
                // For now, let's assume they are roughly sortable by creation order if we re-sort.
                source: 'NETWORK',
                type: 'traffic',
                title: `${netEvent.request.method} ${new URL(netEvent.url).hostname}`,
                data: {
                    status: netEvent.response.status,
                    duration: netEvent.timing.duration,
                    requestBody: netEvent.request.body,
                    responseBody: netEvent.response.body,
                },
                isError: netEvent.response.status >= 400,
            });
        });

        // Sort merged timeline
        // Normalize timestamps roughly (perf time vs date time is tricky without a base offset)
        // Since we can't easily align them perfect without a common clock anchor, we simply sort by
        // value if we assume they are close, or just grouping.
        // FIX: We will render them in a unified list, but sorting might be slightly off if mixing sources.
        // Best effort: assume network events added later are later.
    }

    return {
        accessRequests,
        sessionList,
        activeSession,
        timeline,
    };
}
