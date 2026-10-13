// Version compatibility for the local SRT helper.
//
// Pure logic (no DOM, no fetch): semver subset comparison per SemVer 2.0.0
// (build metadata ignored), published-manifest schema validation, and the
// eight-state compatibility machine described in
// ai/srt-integration-analysis.md §3.5. Everything here is heux-contract
// tested; keep it DOM-free.

/** @typedef {{ok: true, value: Record<string, any>} | {ok: false, error: string}} ManifestCheck */

const SEMVER_RE =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

export const HELPER_STATES = Object.freeze({
    HELPER_MISSING: 'helper-missing',
    CURRENT: 'current',
    UPDATE_AVAILABLE: 'update-available',
    OUTDATED: 'outdated',
    PROTOCOL_MISMATCH: 'protocol-mismatch',
    AHEAD: 'ahead',
    DEV_BUILD: 'dev-build',
    APP_STALE: 'app-stale',
});

export const MANIFEST_SCHEMA = 1;

/**
 * Parse a semver string. Returns null when invalid.
 * @param {string} input
 * @returns {{major:number,minor:number,patch:number,pre:string[],build:string}|null}
 */
export function parseSemver(input) {
    if (typeof input !== 'string') return null;
    const m = SEMVER_RE.exec(input.trim());
    if (!m) return null;
    const pre = m[4] ? m[4].split('.').filter((id) => id.length > 0) : [];
    if (m[4] && pre.length === 0) return null;
    for (const id of pre) {
        if (/^\d+$/.test(id) && id.length > 1 && id.startsWith('0')) {
            return null; // numeric identifiers must not have leading zeros
        }
    }
    return {
        major: Number(m[1]),
        minor: Number(m[2]),
        patch: Number(m[3]),
        pre,
        build: m[5] ?? '',
    };
}

/**
 * Compare two parsed versions: -1, 0, 1 (build metadata ignored).
 * @param {ReturnType<typeof parseSemver>} a
 * @param {ReturnType<typeof parseSemver>} b
 */
export function compareSemver(a, b) {
    if (!a || !b) return 0;
    for (const key of ['major', 'minor', 'patch']) {
        if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
    }
    const aPre = a.pre.length > 0;
    const bPre = b.pre.length > 0;
    if (aPre !== bPre) return aPre ? -1 : 1; // prerelease < release
    for (let i = 0; i < Math.min(a.pre.length, b.pre.length); i++) {
        const x = a.pre[i];
        const y = b.pre[i];
        const xNum = /^\d+$/.test(x);
        const yNum = /^\d+$/.test(y);
        if (xNum && yNum) {
            if (Number(x) !== Number(y)) return Number(x) < Number(y) ? -1 : 1;
        } else if (xNum !== yNum) {
            return xNum ? -1 : 1; // numeric < alphanumeric
        } else if (x !== y) {
            return x < y ? -1 : 1;
        }
    }
    return a.pre.length - b.pre.length === 0
        ? 0
        : a.pre.length < b.pre.length
          ? -1
          : 1;
}

/**
 * Validate the published manifest (served statically at /helper/manifest.json).
 * @param {unknown} manifest
 * @returns {ManifestCheck}
 */
export function validateManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') {
        return { ok: false, error: 'manifest is not an object' };
    }
    const m = /** @type {Record<string, unknown>} */ (manifest);
    if (m.schema !== MANIFEST_SCHEMA) {
        return {
            ok: false,
            error: `unsupported manifest schema ${String(m.schema)}`,
        };
    }
    if (typeof m.version !== 'string' || !parseSemver(m.version)) {
        return { ok: false, error: 'manifest version missing or not semver' };
    }
    if (typeof m.helperProtocol !== 'number' || m.helperProtocol < 1) {
        return {
            ok: false,
            error: 'helperProtocol must be a positive integer',
        };
    }
    if (typeof m.minimumHelper !== 'string' || !parseSemver(m.minimumHelper)) {
        return { ok: false, error: 'minimumHelper missing or not semver' };
    }
    const artifacts = m.artifacts;
    if (!artifacts || typeof artifacts !== 'object') {
        return { ok: false, error: 'manifest has no artifacts' };
    }
    for (const [platform, art] of Object.entries(artifacts)) {
        const a = /** @type {Record<string, unknown>} */ (art);
        if (typeof a?.url !== 'string' || a.url === '') {
            return { ok: false, error: `artifact ${platform} missing url` };
        }
        if (typeof a?.sha256 !== 'string' || a.sha256.length < 16) {
            return {
                ok: false,
                error: `artifact ${platform} missing a plausible sha256`,
            };
        }
    }
    return { ok: true, value: m };
}

const isDevVersion = (v) =>
    v === '0.0.0' || v.includes('-dev') || v.includes('+dev');

/**
 * Resolve the helper compatibility state.
 *
 * @param {object} input
 * @param {object | null} input.manifest       Published manifest (validated) or null.
 * @param {object | null} input.helperVersion  Payload from the helper's /version.
 * @param {number} input.helperProtocolMin     Lowest protocol the app speaks.
 * @param {number} input.helperProtocolMax     Highest protocol the app speaks.
 * @param {string} input.appVersion            The analyzer build's own version.
 * @param {string} [input.platform]            Override for manifest lookup key.
 * @returns {{state: string, reason: string, update?: {version:string,url:string,sha256:string}}}
 */
export function computeHelperStatus({
    manifest = null,
    helperVersion = null,
    helperProtocolMin = 1,
    helperProtocolMax = 1,
    appVersion = '0.0.0',
    platform = detectPlatform(),
}) {
    if (!helperVersion || typeof helperVersion.version !== 'string') {
        return {
            state: HELPER_STATES.HELPER_MISSING,
            reason: 'No helper detected on localhost yet.',
        };
    }

    const localRaw = helperVersion.version;
    const local = parseSemver(localRaw);

    if (helperVersion.helperProtocol != null) {
        const p = Number(helperVersion.helperProtocol);
        if (p < helperProtocolMin || p > helperProtocolMax) {
            return {
                state: HELPER_STATES.PROTOCOL_MISMATCH,
                reason: `Helper speaks protocol ${p}; this build speaks ${helperProtocolMin}-${helperProtocolMax}. Update both sides.`,
            };
        }
    }

    if (local && isDevVersion(localRaw)) {
        return {
            state: HELPER_STATES.DEV_BUILD,
            reason: `Development build ${localRaw}.`,
        };
    }

    if (!manifest) {
        return {
            state: HELPER_STATES.CURRENT,
            reason: 'No published manifest reachable; update checks disabled.',
        };
    }
    const check = validateManifest(manifest);
    if (!check.ok) {
        return {
            state: HELPER_STATES.CURRENT,
            reason: `Manifest ignored: ${'error' in check ? check.error : ''}`,
        };
    }
    const m = check.value;

    if (typeof m.minimumApp === 'string' && parseSemver(m.minimumApp)) {
        const app = parseSemver(appVersion);
        const minApp = parseSemver(m.minimumApp);
        if (app && minApp && compareSemver(app, minApp) < 0) {
            return {
                state: HELPER_STATES.APP_STALE,
                reason: `This analyzer build (${appVersion}) is older than the required ${m.minimumApp}. Reload for the latest build.`,
            };
        }
    }

    if (!local) {
        return {
            state: HELPER_STATES.CURRENT,
            reason: `Unparseable helper version ${localRaw}.`,
        };
    }
    const latest = parseSemver(m.version);
    const floor = parseSemver(m.minimumHelper);
    const cmpLatest = compareSemver(local, latest);
    const cmpFloor = compareSemver(local, floor);

    if (cmpFloor < 0) {
        return {
            state: HELPER_STATES.OUTDATED,
            reason: `Helper ${localRaw} is below the required minimum ${m.minimumHelper}.`,
            update: artifactFor(m, platform),
        };
    }
    if (cmpLatest < 0) {
        return {
            state: HELPER_STATES.UPDATE_AVAILABLE,
            reason: `Helper ${localRaw} → ${m.version} is available.`,
            update: artifactFor(m, platform),
        };
    }
    if (cmpLatest > 0) {
        return {
            state: HELPER_STATES.AHEAD,
            reason: `Helper ${localRaw} is newer than the published ${m.version}.`,
        };
    }
    return {
        state: HELPER_STATES.CURRENT,
        reason: `Helper ${localRaw} is current.`,
    };
}

function artifactFor(m, platform) {
    const art = m.artifacts?.[platform];
    if (!art) return undefined;
    return { version: m.version, url: art.url, sha256: art.sha256 };
}

/** Best-effort platform key ("linux/amd64" style) for manifest lookups. */
export function detectPlatform() {
    if (typeof navigator === 'undefined') return 'unknown/unknown';
    const ua = navigator.userAgent;
    let os = 'unknown';
    if (/Windows/i.test(ua)) os = 'windows';
    else if (/Mac OS X|Macintosh/i.test(ua)) os = 'darwin';
    else if (/Linux|X11/i.test(ua)) os = 'linux';
    let arch = 'unknown';
    if (/arm64|aarch64/i.test(ua)) arch = 'arm64';
    else if (/x86_64|x86-64|Win64|x64/i.test(ua)) arch = 'amd64';
    return `${os}/${arch}`;
}
