import { createStore } from 'zustand/vanilla';
import { TELEMETRY_LIMITS } from '@/features/srtSource/domain/telemetry.js';

/**
 * State for the local SRT helper bridge: probe status, published-manifest
 * compatibility, live sessions and their telemetry series (bounded rings).
 */

const createInitialSrtState = () => ({
    /** @type {{reachable: boolean, authorized: boolean, reason?: string, origin?: string, version?: object, health?: object}} */
    helper: { reachable: false, authorized: false },
    /** @type {{state: string, reason: string, update?: object} | null} */
    compatibility: null,
    /** @type {Record<string, object>} session id -> session summary */
    sessions: {},
    /** @type {Record<string, Array<object>>} session id -> normalized telemetry ring */
    telemetry: {},
    /** @type {Array<object>} SRT rule issues across sessions */
    issues: [],
    /** @type {Array<object>} threshold alert history (transitions only) */
    alerts: [],
    /** @type {boolean} */
    probing: false,
    /** @type {string | null} session id the monitor view should focus */
    focusedSessionId: null,
});

export const srtStore = createStore((set, get) => ({
    ...createInitialSrtState(),

    setProbing(probing) {
        set({ probing });
    },

    setHelper(helper) {
        set({ helper });
    },

    setCompatibility(compatibility) {
        set({ compatibility });
    },

    upsertSession(summary) {
        if (!summary?.id) return;
        set((s) => ({ sessions: { ...s.sessions, [summary.id]: summary } }));
    },

    removeSession(id) {
        set((s) => {
            const sessions = { ...s.sessions };
            delete sessions[id];
            return { sessions };
        });
    },

    setSessions(list) {
        const sessions = {};
        for (const item of Array.isArray(list) ? list : []) {
            if (item?.id) sessions[item.id] = item;
        }
        set({ sessions });
    },

    pushTelemetry(sessionId, normalized) {
        if (!sessionId || !normalized) return;
        set((s) => {
            const ring = [...(s.telemetry[sessionId] ?? []), normalized];
            if (ring.length > TELEMETRY_LIMITS.maxSeries) {
                ring.splice(0, ring.length - TELEMETRY_LIMITS.maxSeries);
            }
            return { telemetry: { ...s.telemetry, [sessionId]: ring } };
        });
    },

    setIssues(issues) {
        set({ issues });
    },

    pushAlert(alert) {
        if (!alert?.sessionId || !alert.metric) return;
        set((s) => {
            const alerts = [...s.alerts, alert];
            if (alerts.length > 200) alerts.splice(0, alerts.length - 200);
            return { alerts };
        });
    },

    focusSession(id) {
        set({ focusedSessionId: id });
    },

    /** Full reset keeps token state intact. */
    reset() {
        set({ ...createInitialSrtState(), helper: get().helper });
    },
}));

export const srtActions = {
    setProbing: (v) => srtStore.getState().setProbing(v),
    setHelper: (v) => srtStore.getState().setHelper(v),
    setCompatibility: (v) => srtStore.getState().setCompatibility(v),
    upsertSession: (v) => srtStore.getState().upsertSession(v),
    removeSession: (v) => srtStore.getState().removeSession(v),
    setSessions: (v) => srtStore.getState().setSessions(v),
    pushTelemetry: (a, b) => srtStore.getState().pushTelemetry(a, b),
    setIssues: (v) => srtStore.getState().setIssues(v),
    pushAlert: (v) => srtStore.getState().pushAlert(v),
    focusSession: (v) => srtStore.getState().focusSession(v),
    reset: () => srtStore.getState().reset(),
};
