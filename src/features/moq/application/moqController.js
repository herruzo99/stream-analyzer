// MoQ controller: session lifecycle wired into the shared SRT transport
// store, so MoQ sessions render in the same monitor, rules, and exports
// as SRT/WebRTC sessions.

import { connectMoq } from '@/infrastructure/moq/session.js';
import { evaluateMoqRules } from '@/features/moq/domain/telemetry.js';
import { normalizeTelemetry } from '@/features/srtSource/domain/telemetry.js';
import { srtActions, srtStore } from '@/state/srtStore.js';

const moqSessions = new Map(); // url → { session, alertLevel }
const moqCatalogs = new Map(); // url → catalog model
const moqSubscriptions = new Map(); // url → subscription list

export function getMoqCatalog(url) {
    return moqCatalogs.get(url) ?? null;
}

export function getMoqSubscriptions(url) {
    return moqSubscriptions.get(url) ?? [];
}

/** Subscribe to an additional track on a live MoQ session. */
export async function subscribeMoqTrack(url, namespace, name) {
    const entry = moqSessions.get(url);
    if (!entry) return { ok: false, error: 'no live MoQ session' };
    const ns = String(namespace || '')
        .split('/')
        .filter(Boolean);
    await entry.session.subscribe(null, ns.length ? ns : ['anon'], name);
    return { ok: true };
}

/**
 * Open a MoQ session and fan its events into the shared transport store.
 * @param {string} url moqt://host/namespace
 */
export async function startMoqSession(url) {
    if (moqSessions.has(url)) return { ok: true, already: true, url };

    const id = `moq:${url}`;
    srtStore.setState((st) => ({
        sessions: {
            ...st.sessions,
            [id]: {
                id,
                mode: 'moq',
                status: 'connecting',
                url,
                encrypted: true,
                startedAt: new Date().toISOString(),
            },
        },
    }));

    try {
        const { session } = await connectMoq(url, {
            onEvent: (ev) => {
                if (ev.type === 'telemetry') {
                    const sample = normalizeTelemetry(ev.sample);
                    srtActions.pushTelemetry(id, sample);
                    const level = moqAlertLevel(id, sample);
                    if (level) trackMoqAlert(id, level, sample);
                } else if (ev.type === 'catalog') {
                    moqCatalogs.set(url, ev.catalog);
                    srtActions.setMoqCatalog(url, ev.catalog);
                } else if (ev.type === 'subscription') {
                    moqSubscriptions.set(url, session.subscriptionList());
                    srtActions.setMoqSubscriptions(
                        url,
                        session.subscriptionList()
                    );
                } else if (
                    ev.type === 'goaway' ||
                    ev.type === 'request-error'
                ) {
                    srtActions.setMoqIssues(
                        url,
                        evaluateMoqRules(
                            {
                                setupComplete: true,
                                goaway: ev.type === 'goaway',
                                requestError:
                                    ev.type === 'request-error'
                                        ? { code: ev.code, reason: ev.reason }
                                        : null,
                            },
                            srtStore.getState().telemetry[id] ?? []
                        )
                    );
                }
            },
            onState: (state) => {
                srtStore.setState((st) => ({
                    sessions: {
                        ...st.sessions,
                        [id]: {
                            ...(st.sessions[id] ?? {}),
                            id,
                            mode: 'moq',
                            url,
                            status: state,
                        },
                    },
                }));
            },
        });
        moqSessions.set(url, { session, level: 'ok' });
        srtActions.setMoqSubscriptions(url, session.subscriptionList());
        return { ok: true, url };
    } catch (err) {
        srtActions.removeSession(id);
        return { ok: false, error: String(err?.message ?? err) };
    }
}

export async function stopMoqSession(url) {
    const entry = moqSessions.get(url);
    if (!entry) return { ok: false };
    await entry.session.close();
    moqSessions.delete(url);
    srtActions.removeSession(`moq:${url}`);
    return { ok: true };
}

/** Map a sample onto a normalized alert level (raw signal, no thresholds yet). */
function moqAlertLevel(id, sample) {
    return sample;
}

function trackMoqAlert(id, level, sample) {
    // Rule evaluation runs at a lower cadence; the SRT threshold family is
    // reused through the shared store alerts.
    const session = { setupComplete: true, catalog: null };
    const issues = evaluateMoqRules(
        session,
        srtStore.getState().telemetry[id] ?? []
    );
    srtActions.setIssues([
        ...(srtStore.getState().issues ?? []).filter((i) => i.sessionId !== id),
        ...issues.map((i) => ({ sessionId: id, ...i })),
    ]);
    void level;
}

/** Registry of live sessions for teardown. */
export function stopAllMoqSessions() {
    for (const [url, entry] of moqSessions) {
        void entry.session.close();
        moqSessions.delete(url);
    }
}
