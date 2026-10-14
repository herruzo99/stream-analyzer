import assert from 'node:assert/strict';
import test from 'node:test';
import {
    analyzeLowLatency,
    buildDashLatencyView,
    buildHlsPartTimeline,
    dashLatencyCompliance,
    hlsLatencyAccounting,
    hlsLlCompliance,
} from '../../src/features/lowLatency/domain/llAnalysis.js';

// IR builders mirroring parsing/hls/parser.js output shapes.
const llHls = (over = {}) => ({
    url: 'https://cdn.example/live.m3u8',
    partInf: { 'PART-TARGET': '0.33334', ...(over.partInf ?? {}) },
    serverControl: {
        'CAN-BLOCK-RELOAD': 'YES',
        'CAN-SKIP-UNTIL': '12.0',
        'PART-HOLD-BACK': '3.0',
        'HOLD-BACK': '9.0',
        ...(over.serverControl ?? {}),
    },
    preloadHints: [{ TYPE: 'PART', URI: 'part.mp4' }, ...(over.preloadHints ?? [])],
    segments: over.segments ?? [
        segment(0, 2.0, [
            part('p1.mp4', 0.33334, true),
            part('p2.mp4', 0.33334, false),
            part('p3.mp4', 0.33334, false),
            part('p4.mp4', 0.33334, false),
            part('p5.mp4', 0.33334, false),
            part('p6.mp4', 0.33334, false),
        ]),
        segment(1, 2.0, [
            part('p7.mp4', 0.33334, true),
            part('p8.mp4', 0.33334, false),
            part('p9.mp4', 0.33334, false),
            part('p10.mp4', 0.33334, false),
            part('p11.mp4', 0.33332, false),
            part('p12.mp4', 0.33332, false),
        ]),
    ],
});

function segment(index, duration, parts) {
    return {
        index,
        uri: `seg${index}.mp4`,
        duration: String(duration),
        parts,
    };
}

function part(uri, duration, independent) {
    return {
        URI: uri,
        DURATION: String(duration),
        INDEPENDENT: independent ? 'YES' : 'NO',
        resolvedUri: new URL(uri, 'https://cdn.example/').href,
        lineNumber: 10,
    };
}

test('AT-LL-HLS-01 part timeline normalizes IR into rows with totals', () => {
    const tl = buildHlsPartTimeline(llHls());
    assert.equal(tl.isLowLatency, true);
    assert.equal(tl.partTargetMs, 333);
    assert.equal(tl.partTargetSource, 'EXT-X-PART-INF');
    assert.equal(tl.segments.length, 2);
    assert.equal(tl.totals.parts, 12);
    assert.equal(tl.totals.independentParts, 2);
    assert.equal(tl.segments[0].partCount, 6);
    assert.equal(tl.segments[0].partsTotalSec, 2.0);
    assert.equal(tl.segments[0].parts[0].independent, true);
    assert.equal(tl.segments[0].parts[0].uri, 'https://cdn.example/p1.mp4');
    assert.equal(tl.preloadHints.length, 1);
    assert.equal(tl.serverControl.canBlockReload, true);
    assert.equal(tl.serverControl.partHoldBack, 3.0);
});

test('AT-LL-HLS-02 conformant LL playlist produces only info-level notes', () => {
    const tl = buildHlsPartTimeline(llHls());
    const issues = hlsLlCompliance(tl);
    assert.ok(issues.every((i) => i.severity === 'info'), JSON.stringify(issues));
});

test('AT-LL-HLS-03 non-conformant cases are caught', () => {
    // 1) parts way off PART-TARGET
    const m = llHls();
    m.segments[0].parts[1].DURATION = '0.9';
    m.segments[0].parts[2].DURATION = '0.9';
    m.segments[0].parts[3].DURATION = '0.9';
    m.segments[0].parts[4].DURATION = '0.9';
    const off = hlsLlCompliance(buildHlsPartTimeline(m));
    assert.ok(off.some((i) => i.id === 'll-hls.part-target-drift' && i.severity === 'error'));

    // 2) no independent parts
    const noIndep = llHls();
    for (const p of noIndep.segments.flatMap((s) => s.parts)) p.INDEPENDENT = 'NO';
    assert.ok(hlsLlCompliance(buildHlsPartTimeline(noIndep)).some((i) => i.id === 'll-hls.no-independent-parts'));

    // 3) parts summing past EXTINF
    const mismatch = llHls();
    mismatch.segments[0].parts[5].DURATION = '1.5';
    assert.ok(hlsLlCompliance(buildHlsPartTimeline(mismatch)).some((i) => i.id === 'll-hls.part-sum-mismatch'));

    // 4) EXT-X-PART without EXT-X-PART-INF
    const noInf = llHls({ partInf: undefined });
    noInf.partInf = undefined;
    assert.ok(hlsLlCompliance(buildHlsPartTimeline(noInf)).some((i) => i.id === 'll-hls.part-inf-missing'));

    // 5) PART-TARGET unset -> default applies
    const noTarget = llHls();
    noTarget.partInf = {}; // PART-TARGET unset
    assert.ok(hlsLlCompliance(buildHlsPartTimeline(noTarget)).some((i) => i.id === 'll-hls.part-target-unset'));
});

test('AT-LL-HLS-04 plain HLS is not low latency and gets no LL issues', () => {
    const plain = { segments: [segment(0, 6.0, [])] };
    const tl = buildHlsPartTimeline(plain);
    assert.equal(tl.isLowLatency, false);
    assert.deepEqual(hlsLlCompliance(tl), []);
    const r = analyzeLowLatency({ type: 'hls', manifest: plain });
    assert.equal(r.isLowLatency, false);
    assert.deepEqual(r.issues, []);
});

test('AT-LL-HLS-05 accounting reports playlist-declared bounds only', () => {
    const tl = buildHlsPartTimeline(llHls());
    const acc = hlsLatencyAccounting(tl);
    assert.equal(acc.partTargetMs, 333);
    assert.equal(acc.avgPartsPerSegment, 6);
    assert.equal(acc.playlistMinBoundSec, 1.998); // 333ms * 6 parts
    assert.equal(acc.serverControlHoldBackSec, 9.0);
    assert.equal(acc.partHoldBackSec, 3.0);
    assert.match(acc.note, /Playlist-declared bounds only/);
});

test('AT-LL-DASH-01 ServiceDescription latency view and ranges', () => {
    const periods = [
        {
            id: 'p0',
            serviceDescriptions: [
                {
                    scopes: [{ schemeIdUri: 'urn:mpeg:dash:ll:dash:scope:2024' }],
                    latencies: [{ min: 1000, target: 2000, max: 3000, referenceId: 1 }],
                    playbackRates: [{ min: 0.95, max: 1.05 }],
                },
            ],
        },
        { id: 'p1', serviceDescriptions: [{ scopes: [], latencies: [{ target: 500, min: 900, max: 3000 }] }] },
        { id: 'p2', serviceDescriptions: [{ scopes: [], latencies: [{ target: 500 }] }] },
    ];
    const view = buildDashLatencyView(periods);
    assert.equal(view.isLowLatency, true);
    assert.equal(view.targets.length, 3);
    assert.equal(view.targets[0].targetMs, 2000);
    assert.equal(view.targets[0].minMs, 1000);
    assert.equal(view.playbackRates.length, 1);

    const issues = dashLatencyCompliance(view);
    assert.ok(issues.some((i) => i.id === 'll-dash.latency-range-invalid' && i.severity === 'error'));
    assert.ok(issues.some((i) => i.id === 'll-dash.latency-range-incomplete' && i.severity === 'warn'));
});

test('AT-LL-DASH-02 absent ServiceDescription is informational, not an error', () => {
    const view = buildDashLatencyView([{ id: 'p0' }]);
    assert.equal(view.isLowLatency, false);
    const issues = dashLatencyCompliance(view);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'info');
    const r = analyzeLowLatency({ type: 'dash', periods: [{ id: 'p0' }] });
    assert.equal(r.isLowLatency, false);
});

test('AT-LL-DISPATCH-01 analyzeLowLatency routes by stream shape', () => {
    const hls = analyzeLowLatency({ type: 'hls', manifest: llHls() });
    assert.equal(hls.protocol, 'hls');
    assert.equal(hls.isLowLatency, true);
    assert.ok(hls.accounting.partTargetMs > 0);
    const dash = analyzeLowLatency({
        type: 'dash',
        periods: [{ serviceDescriptions: [{ scopes: [], latencies: [{ min: 1, target: 2, max: 3 }] }] }],
    });
    assert.equal(dash.protocol, 'dash');
    assert.equal(dash.isLowLatency, true);
    const empty = analyzeLowLatency({});
    assert.equal(empty.isLowLatency, false);
    assert.equal(empty.protocol, null);
});
