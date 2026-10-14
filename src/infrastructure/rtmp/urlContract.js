// RTMP URL contract (browser side).
//
// Mirrors the helper's Go rtmpurl package limits so the UI rejects obviously
// broken sources before handing anything to the local helper. Pure logic;
// heux-contract tested. See ai/rtmp-integration-analysis.md.

export const RTMP_URL_LIMITS = Object.freeze({
    maxChars: 2048,
    maxApp: 512,
    maxPlaypath: 512,
    defaultPort: 1935,
});

/**
 * @typedef {object} RtmpUrlParts
 * @property {'rtmp'|'rtmps'} protocol
 * @property {string} host
 * @property {number} port
 * @property {string} app
 * @property {string} playpath
 * @property {string} tcUrl connection target (scheme://host:port/app)
 * @property {Record<string, string>} params query parameters (token, live, ...)
 * @property {string} raw
 */

/** @typedef {{ok: true, url: RtmpUrlParts} | {ok: false, error: string}} RtmpUrlResult */

/**
 * Validate an rtmp:// or rtmps:// URL and extract its parts.
 *
 * RTMP URLs have no fragment and no userinfo; the first path segment is the
 * application and the remainder is the playpath (which may itself contain
 * '/' for sub-app schemes, so it is passed through verbatim).
 *
 * @param {string} value
 * @returns {RtmpUrlResult}
 */
export function parseRtmpUrl(value) {
    if (typeof value !== 'string') return { ok: false, error: 'Not a string' };
    const raw = value.trim();
    if (raw !== value)
        return { ok: false, error: 'Trim whitespace from the URL' };
    if (raw.length === 0) return { ok: false, error: 'Enter an RTMP URL' };
    if (raw.length > RTMP_URL_LIMITS.maxChars) {
        return {
            ok: false,
            error: `RTMP URL too long (max ${RTMP_URL_LIMITS.maxChars})`,
        };
    }
    if (/\s/.test(raw))
        return { ok: false, error: 'RTMP URL must not contain spaces' };
    if (raw.includes('#'))
        return { ok: false, error: 'RTMP URL must not contain a fragment' };

    const match = /^(rtmps?):\/\/([^/?#]+)(\/?[^?#]*)(\?[^#]*)?$/.exec(raw);
    if (!match)
        return { ok: false, error: 'Expected rtmp://host:port/app/playpath' };
    const [, protocol, authority, rawPath, rawQuery] = match;
    /** @type {'rtmp' | 'rtmps'} */
    const proto = /** @type {'rtmp' | 'rtmps'} */ (protocol);

    const host = parseHost(authority);
    if (!host) return { ok: false, error: 'Missing or invalid host' };

    const path = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
    if (path.length === 0) {
        return {
            ok: false,
            error: 'Missing application name (rtmp://host/app[/playpath])',
        };
    }
    const slash = path.indexOf('/');
    const app = slash === -1 ? path : path.slice(0, slash);
    const playpath = slash === -1 ? '' : path.slice(slash + 1);
    if (app.length > RTMP_URL_LIMITS.maxApp) {
        return {
            ok: false,
            error: `App name too long (max ${RTMP_URL_LIMITS.maxApp})`,
        };
    }
    if (playpath.length > RTMP_URL_LIMITS.maxPlaypath) {
        return {
            ok: false,
            error: `Playpath too long (max ${RTMP_URL_LIMITS.maxPlaypath})`,
        };
    }

    const port =
        host.port ?? (protocol === 'rtmps' ? 443 : RTMP_URL_LIMITS.defaultPort);
    const params = {};
    if (rawQuery) {
        for (const pair of rawQuery.slice(1).split('&')) {
            if (!pair) continue;
            const eq = pair.indexOf('=');
            const key = eq === -1 ? pair : pair.slice(0, eq);
            const val = eq === -1 ? '' : pair.slice(eq + 1);
            if (key) params[key] = val;
        }
    }

    return {
        ok: true,
        url: {
            protocol: proto,
            host: host.host,
            port,
            app,
            playpath,
            tcUrl: `${protocol}://${formatAuthority(host.host, port)}/${app}`,
            params: /** @type {Record<string, string>} */ (params),
            raw,
        },
    };
}

/** Split "host" / "host:port" / "[v6]" / "[v6]:port" without WHATWG's host rules. */
function parseHost(authority) {
    if (authority.length === 0) return null;
    if (authority.startsWith('[')) {
        const close = authority.indexOf(']');
        if (close === -1) return null;
        const host = authority.slice(1, close);
        if (host.length === 0) return null;
        const rest = authority.slice(close + 1);
        if (rest === '') return { host, port: undefined };
        const portMatch = /^:(\d{1,5})$/.exec(rest);
        if (!portMatch) return null;
        const port = Number(portMatch[1]);
        if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
        return { host, port };
    }
    const colon = authority.lastIndexOf(':');
    if (colon === -1) return { host: authority, port: undefined };
    const host = authority.slice(0, colon);
    if (host.length === 0) return null;
    const portText = authority.slice(colon + 1);
    if (!/^\d{1,5}$/.test(portText)) return null;
    const port = Number(portText);
    if (port < 1 || port > 65535) return null;
    return { host, port };
}

function formatAuthority(host, port) {
    return host.includes(':') ? `[${host}]:${port}` : `${host}:${port}`;
}
