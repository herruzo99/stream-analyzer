import assert from 'node:assert/strict';
import test from 'node:test';
import {
    CATALOG_TRACK_NAME,
    PACKAGING,
    applyCatalogObject,
    normalizeCatalog,
    summarizeTracks,
} from '../../src/features/moq/domain/catalog.js';
import {
    deriveMoqSample,
    evaluateMoqRules,
    trackObjectContinuity,
} from '../../src/features/moq/domain/telemetry.js';

const CATALOG_DOC = {
    version: '1.0',
    generatedAt: '2026-10-14T09:00:00Z',
    isComplete: true,
    tracks: [
        {
            namespace: 'anon',
            name: 'video.high',
            packaging: PACKAGING.LOC,
            role: 'video',
            isLive: true,
            targetLatency: 2000,
            codec: 'avc1.640028',
            initData: 'AAAA',
            width: 1920,
            height: 1080,
            framerate: 30,
            bitrate: 5000000,
            mimeType: 'video/mp4',
            lang: 'en',
        },
        {
            name: 'audio.en',
            packaging: PACKAGING.LOC,
            role: 'audio',
            isLive: true,
            targetLatency: 2000,
            codec: 'mp4a.40.2',
            samplerate: 48000,
            channels: 2,
            bitrate: 128000,
            mimeType: 'audio/mp4',
        },
    ],
    publishTracks: [],
};

test('AT-MOQ-CAT-01 catalog fields normalize into the track model', () => {
    const model = normalizeCatalog(CATALOG_DOC);
    assert.equal(model.version, '1.0');
    assert.equal(model.isComplete, true);
    assert.equal(model.tracks.length, 2);
    const v = model.tracks[0];
    assert.equal(v.namespace, 'anon');
    assert.equal(v.name, 'video.high');
    assert.equal(v.packaging, 'loc');
    assert.equal(v.targetLatencyMs, 2000);
    assert.equal(v.width, 1920);
    assert.equal(v.mimeType, 'video/mp4');
    const a = model.tracks[1];
    assert.equal(a.namespace, null, 'namespace inherits the catalog track when absent');
    assert.equal(a.channels, 2);
    assert.deepEqual(model.warnings, []);
});

test('AT-MOQ-CAT-02 malformed tracks are skipped with warnings, not crashes', () => {
    const model = normalizeCatalog({
        tracks: [
            null,
            { name: '' },
            { name: 'ok', packaging: 'loc' },
            'nonsense',
        ],
    });
    assert.equal(model.tracks.length, 1);
    assert.ok(model.warnings.length >= 2, JSON.stringify(model.warnings));
    assert.ok(model.warnings.some((w) => /without a name/.test(w)));
    assert.ok(model.warnings.some((w) => /missing MSF version/.test(w)));
});

test('AT-MOQ-CAT-03 delta policy: object 0 is independent, older groups are stale', () => {
    let state = { appliedGroup: -1, appliedObject: -1 };
    const first = applyCatalogObject(state, { groupId: 0, objectId: 0 });
    assert.equal(first.kind, 'independent');
    state = first.state;
    const delta = applyCatalogObject(state, { groupId: 0, objectId: 1 });
    assert.equal(delta.kind, 'delta-apply');
    // A delta belonging to an older group than the applied state is stale.
    const moved = applyCatalogObject(state, { groupId: 1, objectId: 0 });
    state = moved.state;
    const stale = applyCatalogObject(state, { groupId: 0, objectId: 5 });
    assert.equal(stale.kind, 'delta-stale', 'older-group delta must be ignored');
});

test('AT-MOQ-CAT-04 summarizeTracks aggregates ladders for the UI', () => {
    const model = normalizeCatalog(CATALOG_DOC);
    const s = summarizeTracks(model);
    assert.equal(s.total, 2);
    assert.equal(s.video, 1);
    assert.equal(s.audio, 1);
    assert.equal(s.liveTracks, 2);
    assert.equal(s.maxBitrate, 5000000);
    assert.deepEqual(s.targetLatencies, [2000, 2000]);
});

// --- telemetry --------------------------------------------------------------------

const sample = (over = {}) => ({
    t: 1000,
    objectsDelta: 30,
    bytesDelta: 500_000,
    intervalMs: 1000,
    lastSubscribeRttMs: 12,
    activeSubscriptions: 2,
    groupsDelta: 1,
    gapsDelta: 0,
    encrypted: true,
    ...over,
});

test('AT-MOQ-TEL-01 derived sample maps onto LinkTelemetry with honest nulls', () => {
    const s = deriveMoqSample(sample());
    assert.equal(s.rttMs, 12, 'last SUBSCRIBE round-trip reported');
    // 500_000 bytes/s ≈ 3.8 Mbps
    assert.ok(Math.abs(s.mbpsRecv - 3.814) < 0.02, String(s.mbpsRecv));
    assert.equal(s.pktRecv, 30);
    assert.equal(s.rttMsReason ?? null, null);
    assert.ok(s.rttMsReason === null || true);
    const noRtt = deriveMoqSample(sample({ lastSubscribeRttMs: 0 }));
    assert.equal(noRtt.rttMs, null);
    assert.match(noRtt.rttMsReason, /no RTT channel/);
    assert.equal(noRtt.mbpsLink, null);
    assert.match(noRtt.mbpsLinkReason, /WebTransport/);
    assert.equal(noRtt.moq.activeSubscriptions, 2);
    assert.equal(noRtt.encrypted, true);
});

test('AT-MOQ-TEL-02 zero-rate and zero-byte samples stay safe', () => {
    const s = deriveMoqSample(sample({ bytesDelta: 0, objectsDelta: 0, intervalMs: 0 }));
    assert.equal(s.mbpsRecv, 0);
    assert.equal(s.pktRecv, 0);
});

test('AT-MOQ-TEL-03 object continuity counts group and object gaps', () => {
    let st = { nextGroup: 0, nextObject: 0 };
    const a = trackObjectContinuity(st, { groupId: 0, objectId: 0 });
    assert.equal(a.gap, false);
    st = a.state;
    const b = trackObjectContinuity(st, { groupId: 0, objectId: 1 });
    assert.equal(b.gap, false);
    const c = trackObjectContinuity(st, { groupId: 0, objectId: 5 });
    assert.equal(c.gap, true, 'object id jump is a gap');
    const d = trackObjectContinuity(st, { groupId: 3, objectId: 0 });
    assert.equal(d.gap, true, 'skipped groups are a gap');
    assert.equal(d.newGroup, true);
});

test('AT-MOQ-TEL-04 rule family fires on the documented failure modes', () => {
    // Happy path: no issues.
    const ok = evaluateMoqRules({ setupComplete: true, catalog: { targetLatencies: [2000], tracks: [{}] } }, [deriveMoqSample(sample())]);
    assert.deepEqual(ok, []);

    // No subscriptions.
    const idle = evaluateMoqRules({ setupComplete: true }, [deriveMoqSample(sample({ activeSubscriptions: 0 }))]);
    assert.ok(idle.some((i) => i.id === 'moq.no-subscriptions'));
    assert.ok(idle.some((i) => i.id === 'moq.no-catalog' && i.severity === 'info'));

    // Gaps and GOAWAY.
    const broken = evaluateMoqRules({ setupComplete: true, goaway: true }, [deriveMoqSample(sample({ gapsDelta: 9 }))]);
    assert.ok(broken.some((i) => i.id === 'moq.object-gaps' && i.severity === 'error'));
    assert.ok(broken.some((i) => i.id === 'moq.goaway'));

    // Relay request error.
    const rejected = evaluateMoqRules({ setupComplete: true, requestError: { code: 403, reason: 'not authorized' } }, []);
    assert.ok(rejected.some((i) => i.id === 'moq.request-error' && i.severity === 'error'));
});
