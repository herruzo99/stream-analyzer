// SRT source wiring: probe the local helper, apply published-manifest
// compatibility, start/stop sessions from URL input, and bridge each live
// session into the analyzer by feeding its synthetic HLS façade into the
// normal stream-analysis pipeline (analysis doc Model 1).
import { eventBus } from '@/application/event-bus.js';
import { appLog } from '@/shared/utils/debug';
import {
    createSession,
    fetchPublishedManifest,
    listSessions,
    openEventStream,
    probeHelper,
    setHelperToken,
    stopSession,
} from '@/infrastructure/helper/bridgeClient.js';
import {
    computeHelperStatus,
    validateManifest,
} from '@/infrastructure/helper/versionCompat.js';
import { parseSrtUrl, redactSrtUrl } from '@/infrastructure/srt/urlContract.js';
import {
    DEFAULT_THRESHOLDS,
    describeBreach,
    evaluateAlerts,
    shouldClear,
    shouldFire,
} from '@/features/srtSource/domain/alerts.js';
import { connectWhep } from '@/infrastructure/webrtc/adapter.js';
import {
    connectWebTransport,
    normalizeWebTransportStats,
} from '@/infrastructure/webrtc/webtransport-adapter.js';
import {
    getHandshakes,
    metricsUrl,
    playlistUrl,
} from '@/infrastructure/helper/bridgeClient.js';
import { srtActions, srtStore } from '@/state/srtStore.js';
import {
    evaluateSrtRules,
    normalizeTelemetry,
} from '@/features/srtSource/domain/telemetry.js';
import { EVENTS } from '@/types/events.js';

const APP_VERSION =
    (typeof window !== 'undefined' && window.__APP_VERSION__) || '0.0.0';
let eventStream = null;
let reevaluateTimer = null;

/** Probe the helper and refresh compatibility against the published manifest. */
export async function refreshSrtStatus() {
    srtActions.setProbing(true);
    try {
        const probe = await probeHelper();
        srtActions.setHelper(probe);
        const manifest = await fetchPublishedManifest();
        const compatibility = computeHelperStatus({
            manifest,
            helperVersion: probe.version ?? null,
            helperProtocolMin: 1,
            helperProtocolMax: 1,
            appVersion: APP_VERSION,
        });
        srtActions.setCompatibility(compatibility);
        if (manifest && !validateManifest(manifest).ok) {
            const invalid = validateManifest(manifest);
            appLog(
                'srtSource',
                'warn',
                'Published manifest invalid',
                'error' in invalid ? invalid.error : ''
            );
        }
        return { probe, compatibility };
    } finally {
        srtActions.setProbing(false);
    }
}

/** Persist a helper token entered by the user, then re-probe. */
export async function saveHelperToken(token) {
    setHelperToken(token);
    return refreshSrtStatus();
}

/** Ensure the event stream is running exactly once. */
function ensureEventStream() {
    if (eventStream) return;
    eventStream = openEventStream({
        onEvent: (ev) => {
            if (ev.type === 'session') {
                srtActions.upsertSession(ev.data);
            } else if (ev.type === 'telemetry') {
                srtActions.pushTelemetry(
                    ev.sessionId,
                    normalizeTelemetry(ev.data ?? {})
                );
            }
            scheduleReevaluate();
        },
        onError: () => {
            eventStream?.close();
            eventStream = null;
            // SSE auto-retries in EventSource itself; this fires on hard close.
            setTimeout(() => ensureEventStream(), 2000);
        },
    });
}

let reevaluateQueued = false;
function scheduleReevaluate() {
    if (reevaluateQueued) return;
    reevaluateQueued = true;
    setTimeout(() => {
        reevaluateQueued = false;
        reevaluateIssues();
    }, 250);
}

function reevaluateIssues() {
    const { sessions, telemetry } = srtStore.getState();
    const issues = [];
    for (const [id, session] of Object.entries(sessions)) {
        for (const issue of evaluateSrtRules(session, telemetry[id] ?? [])) {
            issues.push({ sessionId: id, ...issue });
        }
    }
    srtActions.setIssues(issues);
}

/**
 * Start a session for a validated srt:// URL and bridge its synthetic HLS
 * façade into the regular analysis pipeline. Returns the helper session id.
 */
export async function startSrtSession(
    rawUrl,
    { record = false, analyze = true } = {}
) {
    const parsed = parseSrtUrl(rawUrl);
    if (!parsed.ok) {
        return {
            ok: false,
            error: 'error' in parsed ? parsed.error : 'bad url',
        };
    }

    const probe = await probeHelper();
    if (!probe.authorized) {
        await refreshSrtStatus();
        const fresh = srtStore.getState().helper;
        if (!fresh.authorized) {
            return {
                ok: false,
                error:
                    fresh.reason ??
                    'Local helper not reachable or token missing.',
                needsHelper: !fresh.reachable,
                needsToken: fresh.reachable && !fresh.authorized,
            };
        }
    }

    const result = await createSession(rawUrl, record);
    if (!result.ok) {
        return { ok: false, error: result.error };
    }
    srtActions.upsertSession(result.session);
    srtActions.focusSession(result.session.id);
    ensureEventStream();

    if (analyze) {
        const facade = playlistUrl(result.session.id);
        eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
            inputs: [
                {
                    url: facade,
                    name: `SRT ${redactSrtUrl(rawUrl)}`,
                    auth: { mode: 'none' },
                    drmAuth: { mode: 'none' },
                    srt: {
                        sessionId: result.session.id,
                        url: redactSrtUrl(rawUrl),
                    },
                },
            ],
        });
    }
    return { ok: true, session: result.session };
}

export async function stopSrtSession(id) {
    const result = await stopSession(id);
    if (result.ok) srtActions.removeSession(id);
    alertLevels.delete(id);
    return result;
}

/**
 * Stop any session by id, routing by transport mode: WebRTC/WebTransport
 * sessions live only in the browser (their ids are not helper sessions).
 */
export async function stopAnySession(id) {
    const session = srtStore.getState().sessions[id];
    if (!session) return { ok: false, error: 'unknown session' };
    if (session.mode === 'webrtc') {
        const result = await stopWebrtcSession(session.url);
        if (result.ok) srtActions.removeSession(id);
        alertLevels.delete(id);
        return result;
    }
    if (session.mode === 'webtransport') {
        const result = await stopWebTransportSession(session.url);
        if (result.ok) srtActions.removeSession(id);
        alertLevels.delete(id);
        return result;
    }
    return stopSrtSession(id);
}

export async function syncSessions() {
    const { sessions } = await listSessions();
    // Preserve browser-only sessions (WebRTC/WebTransport): the helper knows
    // nothing about them, so a plain replace would drop them from the view.
    const current = srtStore.getState().sessions;
    const merged = { ...sessions };
    for (const [id, s] of Object.entries(current)) {
        if (s?.mode === 'webrtc' || s?.mode === 'webtransport') merged[id] = s;
    }
    srtActions.setSessions(Object.values(merged));
    ensureEventStream();
}

// --- Threshold alerting (Tier-2 #7) --------------------------------------------

/**
 * Evaluate the threshold config on each sample and record transitions only,
 * so the alert history shows each breach once per excursion.
 */
export function evaluateThresholdAlerts(
    sessionId,
    sample,
    thresholds = DEFAULT_THRESHOLDS
) {
    const prev = alertLevels.get(sessionId) ?? 'ok';
    const { level, breaches } = evaluateAlerts(sample, thresholds);
    if (shouldFire(prev, level)) {
        for (const breach of breaches) {
            srtActions.pushAlert({
                sessionId,
                metric: breach.metric,
                level: breach.level,
                t: sample.t ?? Date.now(),
                message: describeBreach(breach),
            });
        }
    }
    if (shouldClear(prev, level)) {
        srtActions.pushAlert({
            sessionId,
            metric: 'recovered',
            level: 'ok',
            t: sample.t ?? Date.now(),
            message: 'Link back within thresholds.',
        });
    }
    alertLevels.set(sessionId, level);
}

/** Fetch a session's SRT handshake ledger (Tier-2 #6). */
export async function loadHandshakes(sessionId) {
    return getHandshakes(sessionId);
}

/** Prometheus endpoint URL for homelab scrapers (Tier-3 #13). */
export function helperMetricsUrl() {
    return metricsUrl();
}

// --- WebRTC (native browser transport, roadmap Phase 5) ----------------------

const webrtcSessions = new Map();
const webTransportSessions = new Map();
// sessionId -> last alert level (hysteresis for the alert history)
const alertLevels = new Map();

/**
 * Subscribe to a WHEP endpoint; telemetry flows through the SAME normalizer,
 * store, rules and export path as SRT (LinkTelemetry parity, doc §3.3).
 */
export async function startWebrtcSession(whepUrl) {
    if (webrtcSessions.has(whepUrl)) {
        return { ok: true, already: true, url: whepUrl };
    }
    const id = `webrtc:${whepUrl}`;
    try {
        const handle = await connectWhep(whepUrl, {
            onSample: (raw) => {
                const sample = normalizeTelemetry({
                    ...raw,
                    t: raw.t ?? Date.now(),
                    encrypted: raw.encrypted ?? true,
                });
                srtActions.pushTelemetry(id, sample);
                srtStore.setState((st) => ({
                    sessions: {
                        ...st.sessions,
                        [id]: {
                            id,
                            mode: 'webrtc',
                            status: 'connected',
                            url: whepUrl,
                            encrypted: Boolean(sample.encrypted),
                            startedAt: new Date(
                                raw.t ?? Date.now()
                            ).toISOString(),
                            segments: Math.floor(
                                (st.telemetry[id]?.length ?? 0) / 10
                            ),
                        },
                    },
                }));
                scheduleReevaluate();
            },
            onState: (state) => {
                srtStore.setState((st) => ({
                    sessions: {
                        ...st.sessions,
                        [id]: {
                            ...(st.sessions[id] ?? {}),
                            id,
                            mode: 'webrtc',
                            url: whepUrl,
                            status: state,
                        },
                    },
                }));
            },
        });
        webrtcSessions.set(whepUrl, handle);
        ensureEventStream();
        return { ok: true, url: whepUrl };
    } catch (err) {
        return { ok: false, error: String(err?.message ?? err) };
    }
}

export async function stopWebrtcSession(whepUrl) {
    const handle = webrtcSessions.get(whepUrl);
    if (!handle) return { ok: false };
    await handle.close();
    webrtcSessions.delete(whepUrl);
    srtActions.removeSession(`webrtc:${whepUrl}`);
    return { ok: true };
}

// --- WebTransport (native browser transport, roadmap Phase 5/Tier-3 #11) -------

/**
 * Subscribe to a WebTransport media duct. Telemetry is JS-level counters
 * (bytes/datagrams); RTT/loss are honestly null per the adapter contract.
 */
export async function startWebTransportSession(url) {
    if (webTransportSessions.has(url)) {
        return { ok: true, already: true, url };
    }
    const id = `webrtc:${url}`;
    try {
        const handle = await connectWebTransport(url, {
            onData: () => {},
            onSample: (raw) => {
                const sample = normalizeWebTransportStats(raw);
                srtActions.pushTelemetry(id, sample);
                srtStore.setState((st) => ({
                    sessions: {
                        ...st.sessions,
                        [id]: {
                            id,
                            mode: 'webtransport',
                            status: 'connected',
                            url,
                            encrypted: true,
                            startedAt: new Date(sample.t).toISOString(),
                        },
                    },
                }));
            },
            onState: (state) => {
                srtStore.setState((st) => ({
                    sessions: {
                        ...st.sessions,
                        [id]: {
                            ...(st.sessions[id] ?? {}),
                            id,
                            mode: 'webtransport',
                            url,
                            status: state,
                        },
                    },
                }));
            },
        });
        webTransportSessions.set(url, handle);
        return { ok: true, url };
    } catch (err) {
        return { ok: false, error: String(err?.message ?? err) };
    }
}

export async function stopWebTransportSession(url) {
    const handle = webTransportSessions.get(url);
    if (!handle) return { ok: false };
    await handle.close();
    webTransportSessions.delete(url);
    srtActions.removeSession(`webrtc:${url}`);
    return { ok: true };
}

export function initializeSrtSourceFeature() {
    eventBus.subscribe(EVENTS.UI.SRT_SESSION_REQUESTED, async (payload) => {
        const url = typeof payload === 'string' ? payload : payload?.url;
        if (!url) return;
        const result = await startSrtSession(url, {
            record: Boolean(payload?.record),
        });
        if (!result.ok) {
            eventBus.dispatch(EVENTS.UI.SHOW_STATUS, {
                message: `SRT session failed: ${result.error}`,
                type: 'warn',
            });
            return;
        }
        eventBus.dispatch(EVENTS.UI.SHOW_STATUS, {
            message: `SRT session started (${redactSrtUrl(url)}).`,
            type: 'success',
        });
    });

    // Kick off status on boot; stays cheap (one fetch pair).
    refreshSrtStatus();
    syncSessions();
    reevaluateTimer = setInterval(refreshSrtStatus, 30_000);
    appLog('srtSource', 'info', 'SRT source feature initialized');
}

export function teardownSrtSourceFeature() {
    if (eventStream) eventStream.close();
    eventStream = null;
    if (reevaluateTimer) clearInterval(reevaluateTimer);
    reevaluateTimer = null;
}
