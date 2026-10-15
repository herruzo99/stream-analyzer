import assert from 'node:assert/strict';
import test from 'node:test';
import {
    exampleStreams,
    routeExampleUrl,
} from '../../src/data/example-streams.js';
import { parseSrtUrl } from '../../src/infrastructure/srt/urlContract.js';

const ALLOWED_PROTOCOLS = new Set([
    'dash',
    'hls',
    'srt',
    'whep',
    'whip',
    'moq',
    'rtmp',
    'icecast',
]);

test('AT-EX-01 every entry is well-formed for its protocol', () => {
    assert.ok(
        exampleStreams.length >= 14,
        `expected >= 14 examples, got ${exampleStreams.length}`
    );
    for (const ex of exampleStreams) {
        assert.ok(
            ex.name && ex.url,
            `entry missing name/url: ${JSON.stringify(ex)}`
        );
        assert.ok(
            ALLOWED_PROTOCOLS.has(ex.protocol),
            `bad protocol ${ex.protocol}`
        );
        // `source` is optional on legacy entries but mandatory for anything
        // carrying the new verified standard.
        if (ex.verified) {
            assert.ok(
                ex.source,
                `${ex.name}: verified entries must declare a source`
            );
            assert.match(
                ex.verified,
                /^\d{4}-\d{2}-\d{2}$/,
                `${ex.name}: verified must be ISO date`
            );
        }
        assert.ok(ex.category, `${ex.name}: missing category`);
        assert.ok(
            ex.type === 'vod' || ex.type === 'live',
            `${ex.name}: bad type`
        );
        if (ex.protocol === 'srt') {
            assert.ok(
                ex.url.startsWith('srt://'),
                `${ex.name}: srt entry must use srt://`
            );
            assert.equal(
                parseSrtUrl(ex.url).ok,
                true,
                `${ex.name}: srt URL must parse`
            );
        } else if (ex.protocol === 'icecast') {
            // Curated mounts are verified live and may have no extension
            // (http://host/MountName); the declared protocol is authoritative.
            assert.match(
                ex.url,
                /^https?:\/\//,
                `${ex.name}: icecast entry must be http(s)`
            );
            assert.ok(
                ex.verified,
                `${ex.name}: icecast entry must be verified live`
            );
        } else if (ex.protocol === 'moq') {
            // The bundled relay uses moqt://; public relays behind WebTransport
            // use https:// (the token lives in the URL path).
            assert.ok(
                /^(moqt|https):\/\//.test(ex.url),
                `${ex.name}: moq entry must use moqt:// or https://`
            );
        } else {
            assert.match(
                ex.url,
                /^https?:\/\//,
                `${ex.name}: manifest entry must be http(s)`
            );
        }
    }
});

test('AT-EX-02 routing sends each scheme to its own pipeline', () => {
    assert.equal(routeExampleUrl('srt://host:9000?streamid=a').kind, 'srt');
    assert.equal(routeExampleUrl('moqt://host:4430/anon').kind, 'moq');
    assert.equal(routeExampleUrl('https://host/live/whep').kind, 'webrtc-pull');
    assert.equal(routeExampleUrl('https://host/live/whip').kind, 'webrtc-push');
    assert.equal(
        routeExampleUrl('https://host/live/index.m3u8').kind,
        'manifest'
    );
    assert.equal(routeExampleUrl('').kind, 'manifest');
});

test('AT-EX-03 the new technology examples are present and verified', () => {
    const srt = exampleStreams.filter((e) => e.protocol === 'srt');
    assert.ok(srt.length >= 2, 'at least two SRT beacon examples');
    for (const ex of srt) {
        assert.match(
            ex.url,
            /^srt:\/\/(de|usa)\.inoutsrt\.com:6999\?streamid=read:beacon/
        );
        assert.ok(ex.verified, 'SRT examples must carry a verified date');
        assert.equal(ex.type, 'live');
    }

    const ll = exampleStreams.filter((e) => e.category === 'Low Latency');
    assert.ok(ll.length >= 2, 'LL-HLS + LL-DASH examples');
    const llHls = ll.find((e) => e.name.includes('OvenMediaEngine'));
    assert.ok(llHls, 'OvenMediaEngine LL-HLS demo');
    assert.match(llHls.url, /llhls-demo\.ovenmediaengine\.com.*llhls\.m3u8$/);
    assert.match(llHls.notes, /EXT-X-PART/);
    const llDash = ll.find((e) => e.name.includes('Akamai'));
    assert.ok(llDash, 'Akamai LL-DASH reference');
    assert.match(llDash.url, /cmafref\.akamaized\.net.*out\.mpd$/);
    assert.match(llDash.notes, /ServiceDescription/);
});

test('AT-EX-04 no duplicate URLs in the curated list', () => {
    const urls = exampleStreams.map((e) => e.url);
    assert.equal(new Set(urls).size, urls.length);
});

test('AT-EX-04 the bundled MoQ relay example is present and actionable', () => {
    const local = exampleStreams.filter(
        (e) => e.url === 'moqt://127.0.0.1:4430/anon'
    );
    assert.equal(local.length, 1, 'exactly one bundled relay example');
    const ex = local[0];
    assert.equal(routeExampleUrl(ex.url).kind, 'moq');
    assert.match(ex.notes ?? '', /tools\/moq-testrelay/);
    assert.equal(ex.verified, '2026-10-14');
});

test('AT-EX-05 the public draft-16 MoQ example carries its namespace explicitly', () => {
    // Cloudflare's relay keeps the auth token in the URL path, so the broadcast
    // namespace must travel on the entry rather than be derived from the URL.
    const cf = exampleStreams.filter(
        (e) => e.protocol === 'moq' && e.namespace
    );
    assert.equal(cf.length, 1, 'exactly one explicit-namespace MoQ example');
    const [ex] = cf;
    assert.deepEqual(ex.namespace, ['bbb']);
    assert.match(
        ex.url,
        /draft-16\.cloudflare\.mediaoverquic\.com\/[A-Za-z0-9_.-]+$/
    );
    assert.equal(ex.type, 'live');
    assert.equal(ex.verified, '2026-10-14');
});
