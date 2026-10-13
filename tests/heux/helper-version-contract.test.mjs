import assert from 'node:assert/strict';
import test from 'node:test';
import {
    HELPER_STATES,
    compareSemver,
    computeHelperStatus,
    detectPlatform,
    parseSemver,
    validateManifest,
} from '../../src/infrastructure/helper/versionCompat.js';

// --- semver subset -----------------------------------------------------------

test('AT-SRT-VER-01 semver ordering follows the semver.org chain', () => {
    const chain = [
        '1.0.0-alpha',
        '1.0.0-alpha.1',
        '1.0.0-alpha.beta',
        '1.0.0-beta',
        '1.0.0-beta.2',
        '1.0.0-beta.11',
        '1.0.0-rc.1',
        '1.0.0',
    ];
    for (let i = 0; i + 1 < chain.length; i++) {
        assert.equal(
            compareSemver(parseSemver(chain[i]), parseSemver(chain[i + 1])),
            -1,
            `${chain[i]} < ${chain[i + 1]}`
        );
    }
});

test('AT-SRT-VER-02 build metadata ignored, core ordering holds', () => {
    assert.equal(
        compareSemver(parseSemver('1.2.3+abc'), parseSemver('1.2.3+xyz')),
        0
    );
    assert.equal(
        compareSemver(parseSemver('1.2.3+a'), parseSemver('1.2.3')),
        0
    );
    assert.equal(
        compareSemver(parseSemver('1.9.9'), parseSemver('1.10.0')),
        -1
    );
});

test('AT-SRT-VER-03 invalid versions rejected', () => {
    for (const bad of [
        '',
        '1.0',
        '1.0.0-',
        '1.0.0+',
        'a.b.c',
        '1.0.0-01',
        '-1.0.0',
    ]) {
        assert.equal(parseSemver(bad), null, bad);
    }
});

// --- manifest schema ----------------------------------------------------------

const manifest = (over = {}) => ({
    schema: 1,
    channel: 'stable',
    version: '1.3.0',
    helperProtocol: 1,
    minimumHelper: '1.1.0',
    minimumApp: '1.2.0',
    publishedAt: '2026-10-14T09:00:00Z',
    commit: 'abc1234',
    artifacts: {
        'linux/amd64': { url: '/helper/linux-amd64/h', sha256: 'a'.repeat(32) },
        'darwin/arm64': {
            url: '/helper/darwin-arm64/h',
            sha256: 'b'.repeat(32),
        },
    },
    ...over,
});

test('AT-SRT-VER-04 manifest validation accepts the published shape and rejects damage', () => {
    assert.equal(validateManifest(manifest()).ok, true);
    const bad = [
        null,
        manifest({ schema: 2 }),
        manifest({ version: '' }),
        manifest({ version: 'nope' }),
        manifest({ helperProtocol: 0 }),
        manifest({ minimumHelper: 'x' }),
        manifest({ artifacts: undefined }),
        manifest({
            artifacts: { 'linux/amd64': { url: '', sha256: 'c'.repeat(32) } },
        }),
        manifest({
            artifacts: { 'linux/amd64': { url: '/x', sha256: 'short' } },
        }),
    ];
    for (const m of bad) {
        assert.equal(validateManifest(m).ok, false);
    }
});

// --- compatibility state machine ---------------------------------------------

const base = {
    helperProtocolMin: 1,
    helperProtocolMax: 1,
    appVersion: '1.2.0',
};

test('AT-SRT-VER-05 helper missing when no /version payload', () => {
    const r = computeHelperStatus({
        ...base,
        manifest: manifest(),
        helperVersion: null,
    });
    assert.equal(r.state, HELPER_STATES.HELPER_MISSING);
});

test('AT-SRT-VER-06 current / update-available / outdated / ahead', () => {
    const hv = (v) => ({ version: v, helperProtocol: 1 });
    const opts = { ...base, manifest: manifest(), platform: 'linux/amd64' };
    assert.equal(
        computeHelperStatus({ ...opts, helperVersion: hv('1.3.0') }).state,
        HELPER_STATES.CURRENT
    );
    const up = computeHelperStatus({ ...opts, helperVersion: hv('1.2.0') });
    assert.equal(up.state, HELPER_STATES.UPDATE_AVAILABLE);
    assert.ok(up.update && up.update.sha256);
    assert.equal(up.update.url, '/helper/linux-amd64/h');
    assert.equal(
        computeHelperStatus({ ...opts, helperVersion: hv('1.0.0') }).state,
        HELPER_STATES.OUTDATED
    );
    assert.equal(
        computeHelperStatus({ ...opts, helperVersion: hv('2.0.0') }).state,
        HELPER_STATES.AHEAD
    );
});

test('AT-SRT-VER-07 dev builds never nag', () => {
    for (const v of ['0.0.0', '1.3.0-dev', '1.3.0+dev']) {
        assert.equal(
            computeHelperStatus({
                ...base,
                manifest: manifest(),
                helperVersion: { version: v, helperProtocol: 1 },
            }).state,
            HELPER_STATES.DEV_BUILD,
            v
        );
    }
});

test('AT-SRT-VER-08 protocol mismatch and app-stable boundaries', () => {
    assert.equal(
        computeHelperStatus({
            ...base,
            manifest: null,
            helperVersion: { version: '1.0.0', helperProtocol: 9 },
        }).state,
        HELPER_STATES.PROTOCOL_MISMATCH
    );
    const stale = computeHelperStatus({
        ...base,
        manifest: manifest({ minimumApp: '1.4.0' }),
        helperVersion: { version: '1.3.0', helperProtocol: 1 },
        appVersion: '1.2.0',
    });
    assert.equal(stale.state, HELPER_STATES.APP_STALE);
});

test('AT-SRT-VER-09 stale cached app still gets upgrade info; missing manifest never nags', () => {
    // Simulated stale-cache case: the helper is old but the manifest is fresh.
    assert.equal(
        computeHelperStatus({
            ...base,
            manifest: manifest({ version: '9.9.9', minimumHelper: '1.0.0' }),
            helperVersion: { version: '1.0.0', helperProtocol: 1 },
        }).state,
        HELPER_STATES.UPDATE_AVAILABLE
    );
    assert.equal(
        computeHelperStatus({
            ...base,
            manifest: null,
            helperVersion: { version: '1.0.0', helperProtocol: 1 },
        }).state,
        HELPER_STATES.CURRENT
    );
});

test('AT-SRT-VER-10 platform detection returns a usable key', () => {
    const key = detectPlatform();
    assert.match(
        key,
        /^(linux|darwin|windows)\/(amd64|arm64)$|^unknown\/unknown$/
    );
});
