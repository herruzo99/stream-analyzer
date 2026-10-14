// RTMP contract tests — written before the implementation (project convention).
// The helper owns the wire; the browser side owns URL validation, FLV-derived
// analytics, telemetry normalization and the RTMP rule family.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
    parseRtmpUrl,
    RTMP_URL_LIMITS,
} from '../../src/infrastructure/rtmp/urlContract.js';
import { routeExampleUrl } from '../../src/data/example-streams.js';

test('AT-RU-01 well-formed rtmp URLs parse with the documented defaults', () => {
    const r = parseRtmpUrl('rtmp://live.example.com/app/streamkey');
    assert.equal(r.ok, true, r.error);
    assert.equal(r.url.protocol, 'rtmp');
    assert.equal(r.url.host, 'live.example.com');
    assert.equal(r.url.port, RTMP_URL_LIMITS.defaultPort);
    assert.equal(r.url.app, 'app');
    assert.equal(r.url.playpath, 'streamkey');
    assert.equal(r.url.tcUrl, 'rtmp://live.example.com:1935/app');
    assert.deepEqual(r.url.params, {});
});

test('AT-RU-02 explicit port, multi-segment playpath and query params', () => {
    const r = parseRtmpUrl(
        'rtmps://edge.example.com:443/live/chan%201?token=abc&live=1'
    );
    assert.equal(r.ok, true, r.error);
    assert.equal(r.url.protocol, 'rtmps');
    assert.equal(r.url.port, 443);
    assert.equal(r.url.app, 'live');
    assert.equal(
        r.url.playpath,
        'chan%201',
        'the playpath is passed through verbatim'
    );
    assert.deepEqual(r.url.params, { token: 'abc', live: '1' });
    assert.equal(r.url.tcUrl, 'rtmps://edge.example.com:443/live');
});

test('AT-RU-03 an app without a playpath is valid at parse time', () => {
    // Listening endpoints (helper `rtmp listen`) only need host/port/app.
    const r = parseRtmpUrl('rtmp://127.0.0.1:1935/live');
    assert.equal(r.ok, true, r.error);
    assert.equal(r.url.app, 'live');
    assert.equal(r.url.playpath, '');
});

test('AT-RU-04 malformed inputs are rejected with actionable errors', () => {
    for (const [value, fragment] of [
        ['', 'empty'],
        ['   ', 'blank'],
        ['rtmp://', 'no host or app'],
        ['rtmp://host/', 'empty app'],
        ['rtmp://:1935/app', 'empty host'],
        ['http://host/app/key', 'wrong scheme'],
        [
            `rtmp://host/${'a'.repeat(RTMP_URL_LIMITS.maxApp + 1)}`,
            'app too long',
        ],
        [
            `rtmp://host/app/${'k'.repeat(RTMP_URL_LIMITS.maxPlaypath + 1)}`,
            'playpath too long',
        ],
        ['rtmp://host/app/key with spaces', 'raw space'],
        [
            `rtmp://host/app/${'k'.repeat(RTMP_URL_LIMITS.maxChars)}`,
            'url too long',
        ],
    ]) {
        const r = parseRtmpUrl(value);
        assert.equal(r.ok, false, `expected ${fragment} to be rejected`);
        assert.equal(typeof r.error, 'string');
        assert.ok(r.error.length > 0);
    }
});

test('AT-RU-05 leading/trailing whitespace is reported, not silently trimmed', () => {
    assert.equal(parseRtmpUrl(' rtmp://host/app/key').ok, false);
    assert.equal(parseRtmpUrl('rtmp://host/app/key ').ok, false);
});

test('AT-RU-06 scheme routing sends rtmp/rtmps to the monitor pipeline', () => {
    assert.equal(routeExampleUrl('rtmp://host/app/key').kind, 'rtmp');
    assert.equal(routeExampleUrl('rtmps://host:443/app/key').kind, 'rtmp');
});

test('AT-RU-07 IPv6 hosts keep their brackets and the default port', () => {
    const r = parseRtmpUrl('rtmp://[::1]/live/key');
    assert.equal(r.ok, true, r.error);
    assert.equal(r.url.host, '::1');
    assert.equal(r.url.port, 1935);
});
