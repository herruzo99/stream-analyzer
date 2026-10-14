// RTMP controller: session lifecycle for helper-backed RTMP pull sessions.
// The helper owns the wire (browsers cannot speak raw TCP); this controller
// drives the helper's control plane and fans counters + command forensics
// into the shared SRT transport store, so RTMP sessions render in the same
// monitor, rules and exports as SRT/WebRTC/MoQ.

import {
    createSession,
    getRtmpDetail,
    stopSession,
} from '@/infrastructure/helper/bridgeClient.js';
import { parseRtmpUrl } from '@/infrastructure/rtmp/urlContract.js';
import {
    evaluateRtmpRules,
    normalizeRtmpTelemetry,
} from '@/features/rtmpSource/domain/telemetry.js';
import { srtStore } from '@/state/srtStore.js';

/** url → helper session id */
const active = new Map();
/** url → last normalized sample (for the stall rule) */
const lastSample = new Map();
/** url → last fetched detail (counters + AMF0 command log) */
const lastDetail = new Map();

export function getRtmpDetailFor(url) {
    return lastDetail.get(url) ?? null;
}

export function getRtmpAlerts(url) {
    return alertsByUrl.get(url) ?? [];
}

const alertsByUrl = new Map();

/**
 * Open an RTMP session through the helper.
 * @param {string} url rtmp://host:port/app/playpath
 */
export async function startRtmpSession(url) {
    if (active.has(url)) return { ok: true, already: true, url };

    const parsed = parseRtmpUrl(url);
    if (!parsed.ok) {
        return {
            ok: false,
            error: 'error' in parsed ? parsed.error : 'invalid URL',
        };
    }

    const id = `rtmp:${url}`;
    srtStore.setState((st) => ({
        sessions: {
            ...st.sessions,
            [id]: {
                id,
                mode: 'rtmp',
                status: 'connecting',
                url,
                encrypted: parsed.url.protocol === 'rtmps',
                startedAt: new Date().toISOString(),
            },
        },
    }));

    const started = await createSession(url, false);
    if (!started.ok) {
        srtStore.setState((st) => {
            const next = { ...st.sessions };
            delete next[id];
            return { sessions: next };
        });
        return { ok: false, error: started.error };
    }

    active.set(url, started.session.id);
    srtStore.setState((st) => ({
        sessions: {
            ...st.sessions,
            [id]: {
                ...st.sessions[id],
                status: 'connected',
                helperId: started.session.id,
            },
        },
    }));

    pollRtmp(url, started.session.id);
    return { ok: true, url, id: started.session.id };
}

/** Poll the helper for counters, commands and rule-relevant samples. */
async function pollRtmp(url, sessionId) {
    while (active.get(url) === sessionId) {
        let detail = null;
        try {
            detail = await getRtmpDetail(sessionId);
        } catch {
            detail = null;
        }
        if (!active.has(url)) return;
        if (!detail) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
        }

        lastDetail.set(url, detail);
        const raw = normalizeRtmpTelemetry({
            t: Date.now(),
            ...(detail.stats ?? {}),
        });
        const prev = lastSample.get(url) ?? null;
        lastSample.set(url, raw);

        if (prev) {
            const fired = evaluateRtmpRules(prev, raw);
            alertsByUrl.set(
                url,
                fired.map((a) => ({ ...a, at: new Date().toISOString() }))
            );
        }

        srtStore.setState((st) => {
            const session = st.sessions[`rtmp:${url}`];
            if (!session) return st;
            return {
                sessions: {
                    ...st.sessions,
                    [`rtmp:${url}`]: { ...session, latest: raw },
                },
            };
        });

        await new Promise((r) => setTimeout(r, 1000));
    }
}

export async function stopRtmpSession(url) {
    const sessionId = active.get(url);
    if (!sessionId) return { ok: false };
    active.delete(url);
    lastSample.delete(url);
    lastDetail.delete(url);
    alertsByUrl.delete(url);
    await stopSession(sessionId);
    srtStore.setState((st) => {
        const next = { ...st.sessions };
        delete next[`rtmp:${url}`];
        return { sessions: next };
    });
    return { ok: true };
}
