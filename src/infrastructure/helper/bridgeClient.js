// Browser client for the local SRT helper control plane.
//
// The helper speaks plain HTTP+SSE on 127.0.0.1 with a bearer token. From a
// public HTTPS origin, Chrome's Private Network Access may block direct
// fetches; the analyzer degrades gracefully (helper-missing + extension
// hint) rather than failing analysis. Everything here returns promises and
// never throws for network conditions — callers inspect the result objects.

const DEFAULT_ORIGIN = 'http://127.0.0.1:7231';
const TOKEN_KEY = 'stream-analyzer.helper.token';
const PROBE_TIMEOUT_MS = 1500;

function origin() {
    if (typeof window !== 'undefined' && window.STREAM_ANALYZER_HELPER_ORIGIN) {
        return String(window.STREAM_ANALYZER_HELPER_ORIGIN).replace(/\/$/, '');
    }
    return DEFAULT_ORIGIN;
}

export function getHelperToken() {
    try {
        return localStorage.getItem(TOKEN_KEY) ?? '';
    } catch {
        return '';
    }
}

export function setHelperToken(token) {
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    } catch {
        /* storage unavailable (private mode): probe will keep failing cleanly */
    }
    return token ?? '';
}

async function fetchWithTimeout(
    url,
    options = {},
    timeoutMs = PROBE_TIMEOUT_MS
) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function authHeaders(extra = {}) {
    const token = getHelperToken();
    return {
        ...extra,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/**
 * Probe the helper: reachability + health + version.
 * Never rejects; resolves a status object.
 */
export async function probeHelper() {
    const base = origin();
    try {
        const resp = await fetchWithTimeout(
            `${base}/health`,
            { headers: await authHeaders() },
            900
        );
        if (resp.status === 401) {
            return {
                reachable: true,
                authorized: false,
                reason: 'Token missing or invalid.',
            };
        }
        if (!resp.ok) {
            return {
                reachable: true,
                authorized: false,
                reason: `Helper returned ${resp.status}.`,
            };
        }
        const version = await fetchWithTimeout(`${base}/version`, {
            headers: await authHeaders(),
        }).then((r) => (r.ok ? r.json() : null));

        return {
            reachable: true,
            authorized: true,
            origin: base,
            health: await resp.json(),
            version,
        };
    } catch (err) {
        return {
            reachable: false,
            authorized: false,
            origin: base,
            reason:
                err?.name === 'AbortError'
                    ? 'Helper did not respond.'
                    : String(err?.message ?? err),
        };
    }
}

/** Fetch the published manifest from the analyzer's own origin (static file). */
export async function fetchPublishedManifest() {
    try {
        const resp = await fetchWithTimeout(
            '/helper/manifest.json',
            { cache: 'no-store' },
            4000
        );
        if (!resp.ok) return null;
        return await resp.json();
    } catch {
        return null;
    }
}

export function playlistUrl(sessionId) {
    return `${origin()}/sessions/${sessionId}/playlist.m3u8`;
}

export function chunkUrl(sessionId, index) {
    return `${origin()}/sessions/${sessionId}/chunks/${index}.ts`;
}

export async function createSession(url, record = false) {
    const resp = await fetchWithTimeout(
        `${origin()}/sessions`,
        {
            method: 'POST',
            headers: await authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ url, record }),
        },
        8000
    );
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        return {
            ok: false,
            error: body.error ?? `Helper returned ${resp.status}.`,
        };
    }
    return { ok: true, session: body };
}

export async function stopSession(id) {
    const resp = await fetchWithTimeout(`${origin()}/sessions/${id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
    });
    return { ok: resp.ok };
}

export async function listSessions() {
    const resp = await fetchWithTimeout(`${origin()}/sessions`, {
        headers: await authHeaders(),
    });
    if (!resp.ok) return { sessions: [] };
    return await resp.json();
}

/** Counters + AMF0 command log for a helper-side RTMP session. */
export async function getRtmpDetail(sessionId) {
    const resp = await fetchWithTimeout(
        `${origin()}/sessions/${sessionId}/rtmp`,
        {
            headers: await authHeaders(),
        }
    );
    if (!resp.ok) return null;
    return await resp.json();
}

export async function getHandshakes(sessionId) {
    const resp = await fetchWithTimeout(
        `${origin()}/sessions/${sessionId}/handshake`,
        {
            headers: await authHeaders(),
        }
    );
    if (!resp.ok) return { handshakes: [] };
    return await resp.json();
}

/** URL of the helper's Prometheus exporter (Tier-3 #13). */
export function metricsUrl() {
    return `${origin()}/metrics`;
}

/**
 * Open the SSE event stream. EventSource cannot set headers, so the token
 * travels in the query string. Returns a handle with close().
 */
export function openEventStream(handlers = {}) {
    const onEvent =
        /** @type {(ev: {type: string, sessionId?: string, data?: any}) => void} */ (
            handlers.onEvent
        );
    const onError = /** @type {() => void} */ (handlers.onError);
    const token = getHelperToken();
    const es = new EventSource(
        `${origin()}/events?token=${encodeURIComponent(token)}`
    );
    const wrap = (handler) => (ev) => {
        try {
            handler?.(JSON.parse(ev.data));
        } catch {
            /* ignore malformed frames */
        }
    };
    es.addEventListener('session', wrap(onEvent));
    es.addEventListener('telemetry', wrap(onEvent));
    es.addEventListener('segment', wrap(onEvent));
    es.addEventListener('error', () => onError?.());
    return {
        close: () => es.close(),
    };
}
