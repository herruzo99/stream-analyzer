import assert from 'node:assert/strict';
import test from 'node:test';
import {
    DEFAULT_THRESHOLDS,
    describeBreach,
    evaluateAlerts,
    shouldClear,
    shouldFire,
    windowRatios,
} from '../../src/features/srtSource/domain/alerts.js';
import { adviseLinkConfig, adviceToQuery } from '../../src/features/srtSource/domain/advisor.js';
import { latencyBudget, srtFixedLatency } from '../../src/features/srtSource/domain/latencyBudget.js';
import { analyzeAvSync, summarizeDiscontinuities } from '../../src/features/srtSource/domain/avSync.js';
import { kWeight, measureLoudness } from '../../src/features/srtSource/domain/loudness.js';
import { alignSeries, compareTwo } from '../../src/features/srtSource/domain/failover.js';
import { buildSessionReport, reportToMarkdown } from '../../src/features/srtSource/domain/report.js';

const sample = (over = {}) => ({
    t: 1000, rttMs: 10, mbpsRecv: 6,
    pktRecv: 1000, pktRecvLost: 0, pktRetrans: 0, pktRecvDrop: 0,
    lossRate: 0, retransPercent: 0, dropPercent: 0,
    ...over,
});

// --- Tier 2 #7: alerts ---------------------------------------------------------

test('AT-T2-ALERT-01 thresholds classify ok/warn/critical', () => {
    assert.equal(evaluateAlerts(sample()).level, 'ok');
    assert.equal(evaluateAlerts(sample({ rttMs: 100 })).level, 'warn');
    assert.equal(evaluateAlerts(sample({ rttMs: 400 })).level, 'critical');
    // breaches carry the metric and threshold for the UI.
    const b = evaluateAlerts(sample({ rttMs: 100 })).breaches[0];
    assert.equal(b.metric, 'rttMs');
    assert.match(describeBreach(b), /RTT/);
});

test('AT-T2-ALERT-02 minimum-rate breach is inverted', () => {
    assert.equal(evaluateAlerts(sample({ mbpsRecv: 0.1 })).level, 'critical');
    assert.equal(evaluateAlerts(sample({ mbpsRecv: 2 })).level, 'ok');
    const b = evaluateAlerts(sample({ mbpsRecv: 0.5 })).breaches[0];
    assert.match(describeBreach(b), /below minimum/);
});

test('AT-T2-ALERT-03 transitions fire once per excursion', () => {
    // ok -> warn fires; warn -> warn does not; warn -> critical fires.
    assert.equal(shouldFire('ok', 'warn'), true);
    assert.equal(shouldFire('warn', 'warn'), false);
    assert.equal(shouldFire('warn', 'critical'), true);
    // clear when back to ok.
    assert.equal(shouldClear('warn', 'ok'), true);
    assert.equal(shouldClear('ok', 'ok'), false);
    // no previous state -> no fire (boot quiescence).
    assert.equal(shouldFire(null, 'critical'), false);
});

test('AT-T2-ALERT-04 window ratios over counter series', () => {
    const r = windowRatios([
        { pktRecv: 0, pktRetrans: 0, pktRecvDrop: 0, pktRecvLost: 0, mbpsRecv: 0, rttMs: 5 },
        { pktRecv: 1000, pktRetrans: 40, pktRecvDrop: 2, pktRecvLost: 10, mbpsRecv: 8, rttMs: 9 },
    ]);
    assert.ok(Math.abs(r.retransPercent - 4) < 0.001);
    assert.ok(Math.abs(r.dropPercent - 0.2) < 0.001);
});

// --- Tier 3 #14: advisor --------------------------------------------------------

test('AT-T3-ADV-01 latency follows the draft rule max(120, 4x RTT), rounded to 25ms', () => {
    const advice = adviseLinkConfig([sample({ rttMs: 12 }), sample({ rttMs: 40, mbpsRecv: 7.2 })]);
    assert.ok(advice.latencyMs >= 160); // 4 × 40 = 160
    assert.equal(advice.latencyMs % 25, 0);
    // Peak 7.2 Mbps × 1.3 headroom → inputbw bytes/s.
    assert.ok(Math.abs(advice.inputbwBps - Math.round(7.2 * 1048576 * 1.3)) < 1000);
    assert.equal(advice.pbkeylen, 16);
    assert.ok(advice.rationale.length >= 2);
});

test('AT-T3-ADV-02 sub-120ms RTT floors at 120; loss escalates to AES-256', () => {
    assert.equal(adviseLinkConfig([sample({ rttMs: 5 })]).latencyMs, 120);
    const lossy = adviseLinkConfig([sample({ rttMs: 10, lossRate: 8 })]);
    assert.equal(lossy.pbkeylen, 32);
    assert.equal(adviseLinkConfig([sample()], { highSecurity: true }).pbkeylen, 32);
    // Empty series → documented conservative defaults.
    const empty = adviseLinkConfig([]);
    assert.equal(empty.latencyMs, 250);
    assert.match(empty.rationale[0], /conservative defaults/);
});

test('AT-T3-ADV-03 advice renders as paste-ready query params', () => {
    const q = adviceToQuery(adviseLinkConfig([sample({ rttMs: 10, mbpsRecv: 5 })]));
    assert.match(q, /latency=120/);
    assert.match(q, /inputbw=\d+/);
    assert.match(q, /pbkeylen=16/);
});

// --- Tier 2 #10: latency budget ------------------------------------------------

test('AT-T2-BUDGET-01 staged budget with honest unknowns', () => {
    const b = latencyBudget({ rttMs: 40, tsbpdMs: 250, playerBufMs: 500 });
    // link 20 + tsbpd 250 + helper (96×2×2=384000) + player 500
    assert.equal(b.unknown, 0);
    assert.equal(b.totalMs, 20 + 250 + 384000 + 500);
    const noPlayer = latencyBudget({ rttMs: 40, tsbpdMs: 250 });
    assert.equal(noPlayer.unknown, 1);
    assert.equal(noPlayer.totalMs, null); // never fabricate a total
    assert.equal(noPlayer.stages.find((s) => s.id === 'player').reason, 'no player session loaded');
});

test('AT-T2-BUDGET-02 srt fixed latency per the draft formula', () => {
    assert.equal(srtFixedLatency(40, 250), 270); // RTT/2 + latency
    assert.equal(srtFixedLatency(null, 250), null);
});

// --- Tier 2 #9: A/V sync + loudness ---------------------------------------------

test('AT-T2-AVSYNC-01 offset and drift from PTS streams', () => {
    const av = analyzeAvSync(
        {
            ptsStreams: [
                { pid: 256, kind: 'video/h264', count: 2, first: 900000, last: 2_090_000 },
                { pid: 257, kind: 'audio/aac', count: 2, first: 903000, last: 2_093_000 },
            ],
        },
        { first: 0, last: 1_190_000 }
    );
    // video first - audio first = -3000 ticks = -33.33ms → video early? (negative = video early per module)
    assert.equal(av.offsetMs, -33.33);
    assert.equal(av.offsetDirection, 'video early');
    // drifts: both streams advance 1.19s over 1.19s PCR → ~0 ppm.
    for (const d of av.drifts) assert.ok(Math.abs(d.ppm) <= 1, `ppm ${d.ppm}`);
    assert.equal(av.warnings.length, 0);
});

test('AT-T2-AVSYNC-02 drift and missing streams are reported', () => {
    const av = analyzeAvSync(
        { ptsStreams: [{ pid: 256, kind: 'video/h264', count: 2, first: 0, last: 1_001_190 }] },
        { first: 0, last: 1_000_000 }
    );
    assert.equal(av.offsetMs, null);
    assert.ok(av.warnings.some((w) => /A\/V offset needs/.test(w)));
    assert.ok(av.drifts[0].ppm >= 1000); // video 1190 ppm fast
    assert.equal(summarizeDiscontinuities({ pts: { discontinuities: 12 } }).level, 'error');
});

test('AT-T2-LOUD-01 K-weighting and R128 on a synthetic 1 kHz tone', () => {
    const rate = 48000;
    const n = rate * 2;
    const amp = 0.5; // -6 dBFS peak; RMS -9 dBFS
    const pcm = new Float32Array(n);
    for (let i = 0; i < n; i++) pcm[i] = amp * Math.sin(2 * Math.PI * 1000 * (i / rate));
    const weighted = kWeight(pcm);
    assert.equal(weighted.length, n);
    // BS.1770 K-weighting at 1 kHz is a gentle rise (~+0.5..+1.5 dB); the
    // +4 dB shelf corner sits around 1.7-3 kHz.
    const rms = (a) => Math.sqrt([...a].reduce((s, v) => s + v * v, 0) / a.length);
    const gainDb = 20 * Math.log10(rms(weighted) / rms(pcm));
    assert.ok(gainDb > 0.3 && gainDb < 1.5, `K-weight gain at 1kHz = ${gainDb.toFixed(2)} dB`);

    const m = measureLoudness([pcm], rate);
    assert.ok(m.integratedLufs != null);
    // A -9.03 dBFS RMS 1 kHz sine reads ≈ -9.0 LUFS (K-gain ≈ +0.7 dB at
    // 1 kHz, then the -0.691 reference offset).
    assert.ok(m.integratedLufs > -10.5 && m.integratedLufs < -7.5, `integrated ${m.integratedLufs}`);
    assert.ok(m.ungatedLufs != null && m.gatedBlocks > 0);
    // Digital silence → no measurable loudness.
    assert.equal(measureLoudness([new Float32Array(rate)], rate).integratedLufs, null);
});

// --- Tier 2 #8: failover ---------------------------------------------------------

test('AT-T2-FAIL-01 alignment and two-session comparison', () => {
    const a = { id: 'main', start: 0, series: [sample({ t: 0, mbpsRecv: 10, rttMs: 5 }), sample({ t: 1000, mbpsRecv: 12, rttMs: 6 })] };
    const b = { id: 'backup', start: 500, series: [sample({ t: 500, mbpsRecv: 4, rttMs: 30 }), sample({ t: 1500, mbpsRecv: 5, rttMs: 28 })] };
    const rows = alignSeries([a, b], 'mbpsRecv');
    assert.ok(rows.length >= 2);
    const cmp = compareTwo(a, b);
    assert.ok(cmp.rateDeltaMbps > 0); // main faster
    assert.ok(cmp.rttDeltaMs < 0); // main closer
    assert.equal(cmp.betterRate, 'main');
    assert.equal(cmp.betterRtt, 'main');
    assert.ok(cmp.samples >= 1);
    assert.deepEqual(alignSeries([], 'mbpsRecv'), []);
});

// --- Tier 3 #12: report ------------------------------------------------------------

test('AT-T3-REP-01 report unifies transports and redacts SRT URLs', () => {
    const report = buildSessionReport({
        transport: 'srt',
        session: { id: 's1', mode: 'push', status: 'connected', url: 'srt://h:9?passphrase=supersecret123', streamId: 'live/x', encrypted: true },
        series: [sample(), sample({ t: 2000, rttMs: 12, mbpsRecv: 7, pktRecvLost: 3 })],
        issues: [{ id: 'srt.encryption-off', severity: 'warn', message: 'test' }],
    });
    assert.equal(report.schema, 1);
    assert.ok(!JSON.stringify(report).includes('supersecret123'));
    assert.ok(report.session.url.includes('redacted'));
    assert.equal(report.telemetry.samples, 2);
    assert.ok(report.advisor.latencyMs >= 120);
    assert.equal(report.issues.length, 1);
    const md = reportToMarkdown(report);
    assert.match(md, /# Session report — srt/);
    assert.match(md, /Telemetry/);
});

test('AT-T3-REP-02 DASH/HLS reports carry manifest summary', () => {
    const report = buildSessionReport({
        transport: 'dash',
        manifestSummary: { type: 'static', duration: 120, profiles: 'iso-main', adaptationSets: [{}, {}] },
    });
    assert.equal(report.manifest.duration, 120);
    assert.equal(report.manifest.adaptationSets, 2);
    assert.equal(report.telemetry, null);
    assert.equal(report.session, null);
});
