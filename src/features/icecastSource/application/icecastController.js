// Icecast session controller: streams a mount over fetch(), parses ICY framing
// and pushes mount info + metadata events + live bitrate into the shared
// transport store. No helper involved — Icecast is plain HTTP(S).
//
// The route into the store mirrors the MoQ controller so the SRT Monitor and
// its rules/exports work unchanged.

import {
    IcyStreamParser,
    parseIcyHeaders,
    summarizeMount,
} from '@/features/icecastSource/domain/icy.js';
import { srtStore } from '@/state/srtStore.js';

/** url → session handle */
const sessions = new Map();

/** Mount info + metadata timeline for the UI. */
export function getIcecastDetail(url) {
    return detailByUrl.get(url) ?? null;
}

const detailByUrl = new Map();

/**
 * @typedef {object} IcecastHandle
 * @property {string} url
 * @property {IcyStreamParser|null} parser
 * @property {ReadableStreamDefaultReader<Uint8Array>|null} reader
 * @property {AbortController} abort
 */

/**
 * Start listening to an Icecast/SHOUTcast mount.
 *
 * @param {string} url http(s)://host:port/mount
 * @returns {Promise<{ok: boolean, already?: boolean, error?: string, id?: string}>}
 */
export async function startIcecastSession(url) {
    if (sessions.has(url)) return { ok: true, already: true };

    const id = `icecast:${url}`;
    srtStore.setState((st) => ({
        sessions: {
            ...st.sessions,
            [id]: {
                id,
                mode: 'icecast',
                status: 'connecting',
                url,
                encrypted: url.startsWith('https://'),
                startedAt: new Date().toISOString(),
            },
        },
    }));

    const abort = new AbortController();
    /** @type {IcecastHandle} */
    /** @type {IcecastHandle} */
    const handle = { url, parser: null, reader: null, abort };
    sessions.set(url, handle);

    try {
        // Icy-MetaData: 1 asks for in-band metadata; stations that do not
        // support it simply omit icy-metaint from the response.
        let connectTimer;
        const connectDeadline = new Promise((_, reject) => {
            connectTimer = setTimeout(
                () => reject(new Error('Station did not answer within 10 s.')),
                10000
            );
        });
        let resp;
        try {
            resp = await Promise.race([
                fetch(url, {
                    headers: { 'Icy-MetaData': '1', Accept: 'audio/*' },
                    signal: abort.signal,
                    cache: 'no-store', // live streams are never cached
                }),
                connectDeadline,
            ]);
        } finally {
            clearTimeout(connectTimer);
        }

        if (!resp.ok) {
            throw new Error(`Station returned HTTP ${resp.status}.`);
        }
        if (!resp.body) {
            throw new Error('This station did not return a readable body.');
        }

        /** @type {Record<string, string>} */
        const bag = {};
        resp.headers.forEach((value, key) => {
            bag[key.toLowerCase()] = value;
        });
        const mount = parseIcyHeaders(bag);
        if (mount.codec === 'not-audio') {
            throw new Error(
                'That URL returned HTML, not an audio stream. Check the mount path.'
            );
        }
        if (
            mount.corsExposesIcy === false &&
            bag['access-control-allow-origin'] === undefined
        ) {
            // Browsers block the body read without CORS; the header check above
            // is the only way to know before reading.
        }

        handle.reader = resp.body.getReader();
        handle.parser = new IcyStreamParser(mount.metaIntBytes);
        const events = [];
        const state = {
            mount,
            bytesInWindow: 0,
            windowStartedAt: Date.now(),
            samples: [],
        };
        detailByUrl.set(url, { mount, events, live: null, state });

        srtStore.setState((st) => ({
            sessions: {
                ...st.sessions,
                [id]: { ...st.sessions[id], status: 'live' },
            },
        }));

        pump(url, handle, state, events);
        statsTick(url);
        return { ok: true, id };
    } catch (err) {
        sessions.delete(url);
        detailByUrl.delete(url);
        const message =
            err?.name === 'AbortError'
                ? 'Stopped.'
                : String(err?.message ?? err);
        srtStore.setState((st) => {
            const next = { ...st.sessions };
            delete next[id];
            return { sessions: next };
        });
        return { ok: false, error: message };
    }
}

async function pump(url, handle, state, events) {
    const reader = handle.reader;
    if (!reader) return;

    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!(value instanceof Uint8Array)) continue;
            const out = handle.parser.push(value);
            state.bytesInWindow += out.audioBytes;
            for (const ev of out.events) {
                events.push({ ...ev, atMs: Date.now() });
            }
        }
    } catch {
        // stream ended (CORS block, network drop, or abort)
        const detail = detailByUrl.get(url);
        if (detail) detail.endedAt = Date.now();
        srtStore.setState((st) => {
            const id = `icecast:${url}`;
            const s = st.sessions[id];
            if (!s) return st;
            return {
                sessions: {
                    ...st.sessions,
                    [id]: { ...s, status: 'stopped' },
                },
            };
        });
    }
}

/** 1 Hz live-stats tick while the session is alive. */
function statsTick(url) {
    if (statsTimers.has(url)) return;
    const timer = setInterval(() => {
        if (!sessions.has(url)) {
            clearInterval(timer);
            statsTimers.delete(url);
            return;
        }
        readIcecastLive(url);
    }, 1000);
    statsTimers.set(url, timer);
}

const statsTimers = new Map();

/** Live stats for the panel: measured bitrate over a sliding window. */
export function readIcecastLive(url) {
    const detail = detailByUrl.get(url);
    if (!detail) return null;
    const { state } = detail;
    const now = Date.now();
    const windowMs = Math.max(1, now - state.windowStartedAt);
    const live = summarizeMount(detail.mount, {
        bytesTotal: state.bytesInWindow,
        windowMs,
        events: detail.events,
    });
    state.bytesInWindow = 0;
    state.windowStartedAt = now;
    detail.live = live;

    srtStore.setState((st) => {
        const id = `icecast:${url}`;
        const s = st.sessions[id];
        if (!s) return st;
        return {
            sessions: {
                ...st.sessions,
                [id]: { ...s, latest: { ...live, t: now } },
            },
        };
    });
    return live;
}

export async function stopIcecastSession(url) {
    const handle = sessions.get(url);
    if (!handle) return { ok: false };
    handle.abort.abort();
    const timer = statsTimers.get(url);
    if (timer) {
        clearInterval(timer);
        statsTimers.delete(url);
    }
    sessions.delete(url);
    detailByUrl.delete(url);
    srtStore.setState((st) => {
        const next = { ...st.sessions };
        delete next[`icecast:${url}`];
        return { sessions: next };
    });
    return { ok: true };
}
