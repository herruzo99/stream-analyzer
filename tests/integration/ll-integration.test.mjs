// Integration proof for protocol item 2: the REAL parsers (bundled from src
// via esbuild so the '@/' alias resolves exactly as in the app) feed the
// low-latency domain module. Guards the IR-shape contract between the
// parsers and llAnalysis.js.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import esbuild from 'esbuild';
import { analyzeLowLatency } from '../../src/features/lowLatency/domain/llAnalysis.js';

const ROOT = join(import.meta.dirname, '..', '..');

async function bundle(entry) {
    const dir = mkdtempSync(join(tmpdir(), 'll-integration-'));
    const out = join(dir, 'bundle.mjs');
    await esbuild.build({
        entryPoints: [join(ROOT, entry)],
        bundle: true,
        format: 'esm',
        platform: 'node',
        outfile: out,
        alias: { '@': join(ROOT, 'src') },
        define: { self: 'globalThis' },
        logLevel: 'error',
    });
    return import(out);
}

const LL_HLS_PLAYLIST = `#EXTM3U
#EXT-X-VERSION:9
#EXT-X-TARGETDURATION:2
#EXT-X-PART-INF:PART-TARGET=0.33334
#EXT-X-SERVER-CCONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0,CAN-SKIP-UNTIL=12.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:2.000,
#EXT-X-PART:URI="p1.mp4",DURATION=0.33334,INDEPENDENT=YES
#EXT-X-PART:URI="p2.mp4",DURATION=0.33334,INDEPENDENT=NO
#EXT-X-PART:URI="p3.mp4",DURATION=0.33334,INDEPENDENT=NO
#EXT-X-PART:URI="p4.mp4",DURATION=0.33334,INDEPENDENT=NO
#EXT-X-PART:URI="p5.mp4",DURATION=0.33334,INDEPENDENT=NO
#EXT-X-PART:URI="p6.mp4",DURATION=0.33334,INDEPENDENT=NO
seg100.mp4
#EXTINF:2.000,
#EXT-X-PART:URI="p7.mp4",DURATION=0.33334,INDEPENDENT=YES
#EXT-X-PART:URI="p8.mp4",DURATION=0.33334,INDEPENDENT=NO
#EXT-X-PART:URI="p9.mp4",DURATION=0.33334,INDEPENDENT=NO
#EXT-X-PART:URI="p10.mp4",DURATION=0.33334,INDEPENDENT=NO
#EXT-X-PART:URI="p11.mp4",DURATION=0.33334,INDEPENDENT=NO
#EXT-X-PART:URI="p12.mp4",DURATION=0.33334,INDEPENDENT=NO
seg101.mp4
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="p11.mp4"
`;

const LL_DASH_MPD = `<?xml version="1.0" encoding="utf-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="dynamic"
     availabilityStartTime="1970-01-01T00:00:00Z"
     minBufferTime="PT1S" publishTime="2026-01-01T00:00:00Z">
  <Period id="p0">
    <ServiceDescription id="sd0">
      <Scope schemeIdUri="urn:mpeg:dash:ll:dash:scope:2024"/>
      <Latency min="1000" target="2000" max="3000" referenceId="1"/>
      <PlaybackRate min="0.95" max="1.05"/>
    </ServiceDescription>
    <AdaptationSet mimeType="video/mp4">
      <Representation bandwidth="2000000"/>
    </AdaptationSet>
  </Period>
</MPD>
`;

test('IT-LL-01 real HLS parser output feeds the LL analysis end to end', async () => {
    const hls = await bundle('src/infrastructure/parsing/hls/index.js');
    const parsed = await hls.parseManifest(
        LL_HLS_PLAYLIST,
        'https://cdn.example/live.m3u8'
    );
    const ir = parsed.manifest;

    // The IR really carries what the domain module consumes.
    assert.ok(Array.isArray(ir.segments), 'parser must produce segments');
    assert.equal(
        ir.segments[0].parts.length,
        6,
        'parser must produce EXT-X-PART rows'
    );
    assert.ok(ir.partInf, 'parser must produce EXT-X-PART-INF');
    assert.equal(
        ir.preloadHints.length,
        1,
        'parser must produce preload hints'
    );

    const result = analyzeLowLatency({ type: 'hls', manifest: ir });
    assert.equal(result.isLowLatency, true);
    assert.equal(result.protocol, 'hls');
    assert.equal(result.timeline.partTargetMs, 333);
    assert.equal(result.timeline.totals.parts, 12);
    assert.equal(result.timeline.totals.independentParts, 2);
    assert.equal(result.accounting.partTargetMs, 333);
    assert.equal(result.accounting.avgPartsPerSegment, 6);
    // A conformant playlist yields at most info-level notes.
    assert.ok(
        result.issues.every((i) => i.severity === 'info'),
        JSON.stringify(result.issues)
    );
});

test('IT-LL-02 real DASH parser output feeds the LL analysis end to end', async () => {
    const dash = await bundle('src/infrastructure/parsing/dash/parser.js');
    const parsed = await dash.parseManifest(
        LL_DASH_MPD,
        'https://cdn.example/m.mpd'
    );
    const ir = parsed.manifest ?? parsed;
    const periods = ir.periods ?? parsed.periods ?? [];
    assert.equal(periods.length, 1, 'parser must produce periods');

    const sd = periods[0].serviceDescriptions?.[0];
    assert.ok(sd, 'parser must produce ServiceDescription');
    assert.equal(sd.latencies[0].target, 2000);
    assert.equal(sd.latencies[0].min, 1000);

    const result = analyzeLowLatency({ type: 'dash', periods });
    assert.equal(result.isLowLatency, true);
    assert.equal(result.protocol, 'dash');
    assert.equal(result.view.targets[0].targetMs, 2000);
    assert.ok(
        result.issues.every((i) => i.severity !== 'error'),
        JSON.stringify(result.issues)
    );
});

test('IT-LL-03 malformed variants still flow through the domain rules', async () => {
    const hls = await bundle('src/infrastructure/parsing/hls/index.js');
    const drifting = LL_HLS_PLAYLIST.replace(
        '#EXT-X-PART:URI="p2.mp4",DURATION=0.33334,INDEPENDENT=NO',
        '#EXT-X-PART:URI="p2.mp4",DURATION=0.90000,INDEPENDENT=NO'
    )
        .replace(
            '#EXT-X-PART:URI="p3.mp4",DURATION=0.33334,INDEPENDENT=NO',
            '#EXT-X-PART:URI="p3.mp4",DURATION=0.01000,INDEPENDENT=NO'
        )
        .replace(
            '#EXT-X-PART:URI="p4.mp4",DURATION=0.33334,INDEPENDENT=NO',
            '#EXT-X-PART:URI="p4.mp4",DURATION=0.01000,INDEPENDENT=NO'
        )
        .replace(
            '#EXT-X-PART:URI="p5.mp4",DURATION=0.33334,INDEPENDENT=NO',
            '#EXT-X-PART:URI="p5.mp4",DURATION=0.01000,INDEPENDENT=NO'
        );
    const parsed = await hls.parseManifest(
        drifting,
        'https://cdn.example/live.m3u8'
    );
    const ir = parsed.manifest;
    const result = analyzeLowLatency({ type: 'hls', manifest: ir });
    assert.ok(result.issues.some((i) => i.id === 'll-hls.part-target-drift'));
});

// Real-world ordering: EXT-X-PART appears AFTER the segment URI (this is
// how OvenMediaEngine and others emit LL-HLS; the parser must attach those
// parts to the segment that precedes them).
const LL_HLS_PARTS_AFTER_URI = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:4
#EXT-X-PART-INF:PART-TARGET=1.000000
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.006000
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:4.000000,
seg100.mp4
#EXT-X-PART:URI="p1.mp4",DURATION=1.000000,INDEPENDENT=YES
#EXT-X-PART:URI="p2.mp4",DURATION=1.000000,INDEPENDENT=NO
#EXT-X-PART:URI="p3.mp4",DURATION=1.000000,INDEPENDENT=NO
#EXT-X-PART:URI="p4.mp4",DURATION=1.000000,INDEPENDENT=NO
#EXTINF:4.000000,
seg101.mp4
#EXT-X-PART:URI="p5.mp4",DURATION=1.000000,INDEPENDENT=YES
#EXT-X-PART:URI="p6.mp4",DURATION=1.000000,INDEPENDENT=NO
`;

test('IT-LL-05 parser keeps segments open for trailing EXT-X-PART tags', async () => {
    const hls = await bundle('src/infrastructure/parsing/hls/index.js');
    const ir = (
        await hls.parseManifest(
            LL_HLS_PARTS_AFTER_URI,
            'https://cdn.example/live.m3u8'
        )
    ).manifest;
    assert.equal(ir.segments.length, 2);
    assert.equal(
        ir.segments[0].parts.length,
        4,
        'parts after the URI must attach to their segment'
    );
    assert.equal(ir.segments[1].parts.length, 2);
    assert.equal(ir.segments[0].resolvedUrl, 'https://cdn.example/seg100.mp4');

    const result = analyzeLowLatency({ type: 'hls', manifest: ir });
    assert.equal(result.isLowLatency, true);
    assert.equal(result.timeline.partTargetMs, 1000);
    assert.equal(result.timeline.totals.parts, 6);
    assert.ok(
        result.issues.every((i) => i.severity !== 'error'),
        JSON.stringify(result.issues)
    );
});

// MPD-level ServiceDescription is legal per ISO/IEC 23009-1 and is what the
// Akamai CMAF reference stream uses.
test('IT-LL-06 MPD-level ServiceDescription feeds the LL-DASH view', async () => {
    const mpd = `<?xml version="1.0" encoding="utf-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="dynamic" minBufferTime="PT1S">
  <ServiceDescription id="0">
    <Latency target="3000" referenceId="7"/>
  </ServiceDescription>
  <Period id="p0">
    <AdaptationSet mimeType="video/mp4"><Representation bandwidth="2000000"/></AdaptationSet>
  </Period>
</MPD>
`;
    const dash = await bundle('src/infrastructure/parsing/dash/parser.js');
    const ir = (await dash.parseManifest(mpd, 'https://cdn.example/m.mpd'))
        .manifest;
    const result = analyzeLowLatency({
        type: 'dash',
        periods: ir.periods,
        manifest: ir,
    });
    assert.equal(result.isLowLatency, true, 'MPD-level Latency must count');
    assert.equal(result.view.targets[0].targetMs, 3000);
    assert.equal(result.view.targets[0].periodId, null);
    assert.ok(result.issues.every((i) => i.severity !== 'error'));
});

// Sanity: the fixture writer is available for docs/regeneration.
test('IT-LL-04 fixtures are on disk for the record', () => {
    const dir = mkdtempSync(join(tmpdir(), 'll-fixtures-'));
    const hlsPath = join(dir, 'live.m3u8');
    writeFileSync(hlsPath, LL_HLS_PLAYLIST);
    assert.ok(hlsPath.length > 0);
});
