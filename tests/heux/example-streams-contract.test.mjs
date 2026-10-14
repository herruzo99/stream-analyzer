import assert from 'node:assert/strict';
import test from 'node:test';
import {
    exampleStreams,
    routeExampleUrl,
} from '../../src/data/example-streams.js';
import { parseSrtUrl } from '../../src/infrastructure/srt/urlContract.js';

const ALLOWED_PROTOCOLS = new Set(['dash', 'hls', 'srt', 'whep', 'whip', 'moq']);

test('AT-EX-01 every entry is well-formed for its protocol', () => {
    assert.ok(exampleStreams.length >= 14, `expected >= 14 examples, got ${exampleStreams.length}`);
    for (const ex of exampleStreams) {
        assert.ok(ex.name && ex.url, `entry missing name/url: ${JSON.stringify(ex)}`);
        assert.ok(ALLOWED_PROTOCOLS.has(ex.protocol), `bad protocol ${ex.protocol}`);
        // `source` is optional on legacy entries but mandatory for anything
        // carrying the new verified standard.
        if (ex.verified) {
            assert.ok(ex.source, `${ex.name}: verified entries must declare a source`);
            assert.match(ex.verified, /^\d{4}-\d{2}-\d{2}$/, `${ex.name}: verified must be ISO date`);
        }
        assert.ok(ex.category, `${ex.name}: missing category`);
        assert.ok(ex.type === 'vod' || ex.type === 'live', `${ex.name}: bad type`);
        if (ex.protocol === 'srt') {
            assert.ok(ex.url.startsWith('srt://'), `${ex.name}: srt entry must use srt://`);
            assert.equal(parseSrtUrl(ex.url).ok, true, `${ex.name}: srt URL must parse`);
        } else if (ex.protocol === 'moq') {
            assert.ok(ex.url.startsWith('moqt://'), `${ex.name}: moq entry must use moqt://`);
        } else {
            assert.match(ex.url, /^https?:\/\//, `${ex.name}: manifest entry must be http(s)`);
        }
    }
});

test('AT-EX-02 routing sends each scheme to its own pipeline', () => {
    assert.equal(routeExampleUrl('srt://host:9000?streamid=a').kind, 'srt');
    assert.equal(routeExampleUrl('moqt://host:4430/anon').kind, 'moq');
    assert.equal(routeExampleUrl('https://host/live/whep').kind, 'webrtc-pull');
    assert.equal(routeExampleUrl('https://host/live/whip').kind, 'webrtc-push');
    assert.equal(routeExampleUrl('https://host/live/index.m3u8').kind, 'manifest');
    assert.equal(routeExampleUrl('').kind, 'manifest');
});

test('AT-EX-03 the new technology examples are present and verified', () => {
    const srt = exampleStreams.filter((e) => e.protocol === 'srt');
    assert.ok(srt.length >= 2, 'at least two SRT beacon examples');
    for (const ex of srt) {
        assert.match(ex.url, /^srt:\/\/(de|usa)\.inoutsrt\.com:6999\?streamid=read:beacon/);
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

test('AT-EX-04 the MoQ example is present, local, and documents why no public relay exists', () => {
    const moq = exampleStreams.filter((e) => e.protocol === 'moq');
    assert.equal(moq.length, 1, 'exactly one MoQ example');
    const [ex] = moq;
    assert.equal(ex.url, 'moqt://127.0.0.1:4430/anon');
    assert.equal(routeExampleUrl(ex.url).kind, 'moq');
    // The bundled relay must be named so the example is actionable.
    assert.match(ex.notes ?? '', /tools\/moq-testrelay/);
    assert.equal(ex.verified, '2026-10-14');
});
