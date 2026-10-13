// SRT URL contract (browser side).
//
// Mirrors the helper's Go srturl package limits so the UI rejects obviously
// broken sources before handing anything to the local helper. Pure logic;
// heux-contract tested. See ai/srt-integration-analysis.md §3.

export const SRT_URL_LIMITS = Object.freeze({
    maxChars: 2048,
    maxStreamIdSize: 512,
    minPassphrase: 10,
    maxPassphrase: 80,
    minLatencyMs: 0,
    maxLatencyMs: 60000,
});

/**
 * @typedef {object} SrtUrlParts
 * @property {string} host
 * @property {number} port
 * @property {string} mode
 * @property {string} streamid
 * @property {boolean} hasPassphrase
 * @property {number|null} latency
 * @property {string} congestion
 * @property {string} raw
 */

/** @typedef {{ok: true, url: SrtUrlParts} | {ok: false, error: string}} SrtUrlResult */

const ENUM_OPTIONS = Object.freeze({
    mode: ['caller', 'listener'],
    congestion: ['live'],
});

/**
 * Validate an srt:// URL and extract its fields.
 * @param {string} value
 * @returns {SrtUrlResult}
 */
export function parseSrtUrl(value) {
    if (typeof value !== 'string') return { ok: false, error: 'Not a string' };
    const raw = value.trim();
    if (raw !== value)
        return { ok: false, error: 'Trim whitespace from the URL' };
    if (raw.length === 0) return { ok: false, error: 'Enter an SRT URL' };
    if (raw.length > SRT_URL_LIMITS.maxChars) {
        return {
            ok: false,
            error: `SRT URL too long (max ${SRT_URL_LIMITS.maxChars})`,
        };
    }

    let url;
    let raw2 = raw;
    // WHATWG URL rejects empty-host authorities (srt://:9000?mode=listener);
    // parse those through a placeholder and keep the user's intent.
    let emptyHost = false;
    const emptyHostMatch = /^srt:\/\/:(\d+)(\?.*)?$/.exec(raw);
    if (emptyHostMatch) {
        emptyHost = true;
        raw2 = `srt://0.0.0.0:${emptyHostMatch[1]}${emptyHostMatch[2] ?? ''}`;
    }
    try {
        url = new URL(raw2);
    } catch {
        return { ok: false, error: 'Enter a complete srt://host:port URL' };
    }
    if (url.protocol !== 'srt:')
        return { ok: false, error: 'Use the srt:// scheme' };
    if (url.username || url.password) {
        return {
            ok: false,
            error: 'Remove credentials; use streamid or passphrase options',
        };
    }

    const port = Number(url.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return { ok: false, error: 'SRT requires an explicit port (1-65535)' };
    }

    const q = url.searchParams;
    const streamid = q.get('streamid') ?? '';
    if (streamid.length > SRT_URL_LIMITS.maxStreamIdSize) {
        return {
            ok: false,
            error: `streamid exceeds ${SRT_URL_LIMITS.maxStreamIdSize} bytes`,
        };
    }

    const mode = (q.get('mode') ?? 'caller').toLowerCase();
    if (!ENUM_OPTIONS.mode.includes(mode)) {
        return { ok: false, error: 'mode must be caller or listener' };
    }
    const congestion = (q.get('congestion') ?? 'live').toLowerCase();
    if (!ENUM_OPTIONS.congestion.includes(congestion)) {
        return { ok: false, error: 'congestion must be live' };
    }

    const passphrase = q.get('passphrase');
    const hasPassphrase = passphrase !== null;
    if (hasPassphrase) {
        if (passphrase.length < SRT_URL_LIMITS.minPassphrase) {
            return {
                ok: false,
                error: `passphrase must be at least ${SRT_URL_LIMITS.minPassphrase} characters`,
            };
        }
        if (passphrase.length > SRT_URL_LIMITS.maxPassphrase) {
            return {
                ok: false,
                error: `passphrase must be at most ${SRT_URL_LIMITS.maxPassphrase} characters`,
            };
        }
    }

    const latency = q.get('latency');
    if (latency !== null) {
        const n = Number(latency);
        if (
            !Number.isInteger(n) ||
            n < SRT_URL_LIMITS.minLatencyMs ||
            n > SRT_URL_LIMITS.maxLatencyMs
        ) {
            return {
                ok: false,
                error: `latency must be an integer in [${SRT_URL_LIMITS.minLatencyMs}, ${SRT_URL_LIMITS.maxLatencyMs}] ms`,
            };
        }
    }

    const pbkeylen = q.get('pbkeylen');
    if (pbkeylen !== null && !['16', '24', '32'].includes(pbkeylen)) {
        return { ok: false, error: 'pbkeylen must be 16, 24, or 32' };
    }

    if ((q.get('messageapi') ?? '').toLowerCase() === 'true') {
        return {
            ok: false,
            error: 'message mode is not supported; buffer mode is required',
        };
    }

    return {
        ok: true,
        url: {
            host: emptyHost ? '' : url.hostname,
            port,
            mode,
            streamid,
            hasPassphrase,
            latency: latency === null ? null : Number(latency),
            congestion,
            raw,
        },
    };
}

/**
 * Render a display-safe URL with the passphrase redacted.
 * @param {string} value
 */
export function redactSrtUrl(value) {
    try {
        const url = new URL(value.trim());
        if (url.searchParams.has('passphrase')) {
            url.searchParams.set('passphrase', 'redacted');
        }
        return url.toString();
    } catch {
        return 'srt://[unparseable]';
    }
}

/** True when a value looks like an SRT source (for input sniffing). */
export function isSrtUrl(value) {
    return (
        typeof value === 'string' &&
        value.trim().toLowerCase().startsWith('srt://')
    );
}
