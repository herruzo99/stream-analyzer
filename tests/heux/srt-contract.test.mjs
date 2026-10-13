import assert from 'node:assert/strict';
import test from 'node:test';
import {
    SRT_URL_LIMITS,
    isSrtUrl,
    parseSrtUrl,
    redactSrtUrl,
} from '../../src/infrastructure/srt/urlContract.js';
import {
    SRT_RULE_IDS,
    correlateLoss,
    deriveSignals,
    evaluateSrtRules,
    normalizeTelemetry,
} from '../../src/features/srtSource/domain/telemetry.js';

// --- URL contract -------------------------------------------------------------

test('AT-SRT-URL-01 valid URLs parse with their fields', () => {
    const r = parseSrtUrl(
        'srt://ingest.example.com:9000?streamid=live/abc&latency=250'
    );
    assert.equal(r.ok, true);
    assert.equal(r.url.host, 'ingest.example.com');
    assert.equal(r.url.port, 9000);
    assert.equal(r.url.mode, 'caller');
    assert.equal(r.url.streamid, 'live/abc');
    assert.equal(r.url.latency, 250);

    const l = parseSrtUrl('srt://:7000?mode=listener');
    assert.equal(l.ok, true);
    assert.equal(l.url.mode, 'listener');
    assert.equal(l.url.host, '');
});

test('AT-SRT-URL-02 invalid URLs rejected with actionable errors', () => {
    const bad = [
        ['', 'Enter an SRT URL'],
        ['http://host:9000', 'scheme'],
        ['srt://host', 'port'],
        ['srt://host:99999', 'port'],
        ['srt://host:9000?passphrase=short', 'passphrase'],
        ['srt://host:9000?mode=rendezvous', 'mode'],
        ['srt://host:9000?latency=-5', 'latency'],
        ['srt://host:9000?pbkeylen=17', 'pbkeylen'],
        ['srt://user:pw@host:9000', 'credentials'],
        ['  srt://host:9000  ', 'whitespace'],
        ['srt://host:9000?messageapi=true', 'message mode'],
    ];
    for (const [url, marker] of bad) {
        const r = parseSrtUrl(url);
        assert.equal(r.ok, false, url);
        assert.match(
            r.error.toLowerCase(),
            new RegExp(marker.toLowerCase()),
            url
        );
    }
});

test('AT-SRT-URL-03 redaction never leaks the passphrase', () => {
    const url =
        'srt://host:9000?streamid=live/x&passphrase=superSecret123&latency=200';
    const red = redactSrtUrl(url);
    assert.ok(!red.includes('superSecret123'));
    assert.ok(red.includes('passphrase=redacted'));
    assert.ok(red.includes('live%2Fx'));
});

test('AT-SRT-URL-04 limits are frozen and shared with the helper', () => {
    assert.equal(SRT_URL_LIMITS.minPassphrase, 10);
    assert.equal(Object.isFrozen(SRT_URL_LIMITS), true);
    assert.equal(isSrtUrl(' srt://x:1 '), true);
    assert.equal(isSrtUrl('http://x:1'), false);
});

// --- telemetry ----------------------------------------------------------------

const sample = (over = {}) => ({
    t: 1000,
    rttMs: 5,
    mbpsRecvRate: 6,
    pktRecv: 1000,
    pktRecvUnique: 990,
    pktRecvLost: 3,
    pktRetrans: 2,
    pktRecvDrop: 1,
    pktRecvBelated: 0,
    pktRecvUndecrypt: 0,
    msRecvBuf: 120,
    msSendBuf: 0,
    msRcvTsbpdDelay: 300,
    msSndTsbpdDelay: 0,
    pktRecvLossRate: 0.3,
    encrypted: true,
    ...over,
});

test('AT-SRT-TEL-01 normalization clamps non-finite and missing values', () => {
    const n = normalizeTelemetry(
        sample({ rttMs: NaN, pktRecv: undefined, t: -1 })
    );
    assert.equal(n.rttMs, 0);
    assert.equal(n.pktRecv, 0);
    assert.equal(n.t, 0);
    assert.equal(n.encrypted, true);
    assert.ok(n.pktRecvLost === 3);
});

test('AT-SRT-TEL-02 derived signals compute ratios over the series window', () => {
    const series = [
        sample({ pktRecv: 0, pktRetrans: 0, pktRecvLost: 0 }),
        sample({
            pktRecv: 1000,
            pktRetrans: 20,
            pktRecvLost: 10,
            pktRecvDrop: 3,
        }),
    ];
    const sig = deriveSignals(series);
    assert.ok(Math.abs(sig.retransRatio - 2) < 0.001);
    assert.ok(Math.abs(sig.dropRatio - 0.2) < 0.001);
    assert.equal(sig.lostTotal, 10);
    assert.equal(sig.maxRtt, 5);
});

test('AT-SRT-TEL-03 rules fire on the documented failure modes', () => {
    // Unencrypted + sub-minimum latency.
    let issues = evaluateSrtRules({ streamId: 'live/x' }, [
        sample({ encrypted: false, msRcvTsbpdDelay: 80 }),
    ]);
    const ids = issues.map((i) => i.id);
    assert.ok(ids.includes(SRT_RULE_IDS.ENCRYPTION_OFF));
    assert.ok(ids.includes(SRT_RULE_IDS.LATENCY_LOW));
    assert.equal(
        issues.find((i) => i.id === SRT_RULE_IDS.LATENCY_LOW).severity,
        'error'
    );

    // Healthy link: no issues at all.
    issues = evaluateSrtRules({ streamId: 'live/x' }, [
        sample(),
        sample({ t: 2000 }),
    ]);
    assert.deepEqual(issues, []);

    // Sustained loss.
    const lossy = [
        sample({ pktRecvLost: 0 }),
        sample({ pktRecvLost: 40, pktRecv: 1000 }),
    ];
    issues = evaluateSrtRules({ streamId: 'live/x' }, lossy);
    assert.ok(issues.some((i) => i.id === SRT_RULE_IDS.LOSS_RATE));
});

test('AT-SRT-TEL-04 correlation aligns TS continuity events to nearest telemetry', () => {
    const series = [
        sample({ t: 1000, rttMs: 5 }),
        sample({ t: 3000, rttMs: 15 }),
    ];
    const out = correlateLoss([{ t: 2100, continuityErrors: 4 }], series);
    assert.equal(out.length, 1);
    // t=2100 is 900ms from the 3000 sample, 1100ms from the 1000 sample.
    assert.equal(out[0].rttMs, 15);
    assert.equal(out[0].alignedWithinMs, 900);
    assert.deepEqual(correlateLoss([], series), []);
});
