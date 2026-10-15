// MSS (Smooth Streaming) contract tests — written before the implementation.
// Fixtures are two real public client manifests fetched live:
//   tests/fixtures/mss/tears-of-steel.ismc  (Unified Streaming, audio+video, 5+2 QLs)
//   tests/fixtures/mss/superspeedway.ismc   (DirectTaps/IIS-style, H264, 8 QLs)

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    parseManifest,
    isMssManifest,
} from '../../src/infrastructure/parsing/mss/parser.js';
import {
    adaptMssToIr,
    aacCodecFromConfig,
    avcCodecFromRecord,
    expandChunkTimeline,
    expandFragmentUrl,
    mssCodecString,
} from '../../src/infrastructure/parsing/mss/adapter.js';
import { XMLParser } from 'fast-xml-parser';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURES = join(ROOT, 'tests', 'fixtures', 'mss');

const read = (name) => readFileSync(join(FIXTURES, name), 'utf8');
const parseXml = (xml) => {
    const p = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        attributesGroupName: ':@',
        textNodeName: '#text',
        alwaysCreateTextNode: true,
        removeNSPrefix: true,
        isArray: (t) => ['StreamIndex', 'QualityLevel', 'c'].includes(t),
    });
    return p.parse(xml).SmoothStreamingMedia;
};

// --- fixtures are real and parseable ----------------------------------------------

test('AT-MSS-01b the worker routes MSS before the DASH fallback', () => {
    // analysisHandler's branch order: #EXTM3U → hls, <MPD → dash, MSS → mss,
    // everything else → dash. A SmoothStreamingMedia document must never fall
    // through to the DASH parser.
    const sample = read('superspeedway.ismc');
    assert.equal(sample.startsWith('#EXTM3U'), false);
    assert.equal(
        /<MPD/i.test(sample),
        false,
        'an MSS manifest is not a DASH document'
    );
    assert.equal(isMssManifest(sample), true, 'so it reaches the mss branch');
});

test('AT-MSS-01 both public fixtures are detected as MSS manifests', () => {
    for (const name of ['tears-of-steel.ismc', 'superspeedway.ismc']) {
        const xml = read(name);
        assert.equal(isMssManifest(xml), true, name);
        assert.match(xml, /<SmoothStreamingMedia[\s>]/);
    }
    assert.equal(
        isMssManifest('<MPD>nope</MPD>'),
        false,
        'a DASH manifest is not MSS'
    );
    assert.equal(isMssManifest('#EXTM3U'), false);
});

test('AT-MSS-02 Unified Streaming manifest: two streams, 5+2 quality levels', async () => {
    const { manifest } = await parseManifest(
        read('tears-of-steel.ismc'),
        'https://x/tears-of-steel.ism/Manifest'
    );
    assert.equal(manifest.smoothStreaming.timeScale, 10_000_000);
    assert.equal(manifest.duration, 734, 'Duration is in TimeScale ticks');
    assert.equal(manifest.type, 'static');

    const sets = manifest.periods[0].adaptationSets;
    assert.equal(sets.length, 2);
    const video = sets.find((s) => s.contentType === 'video');
    const audio = sets.find((s) => s.contentType === 'audio');
    assert.ok(video && audio);

    assert.equal(video.smoothStreaming.qualityLevelCount, 5);
    assert.equal(audio.representations.length, 2);
    assert.equal(
        video.representations[0].fourCC,
        'AVC1',
        'Unified Streaming uses AVC1'
    );
    assert.equal(audio.representations[0].fourCC, 'AACL');
    // Bitrate ladder ascending.
    const ladder = video.smoothStreaming.bitrateLadder;
    assert.equal(ladder.length, 5);
    assert.deepEqual(
        ladder,
        [...ladder].sort((a, b) => a - b)
    );
    // Audio properties carried through.
    assert.equal(audio.representations[0].audioSamplingRate, 48000);
    assert.equal(audio.representations[0].numChannels, 2);
    assert.equal(audio.lang, 'eng');
});

test('AT-MSS-03 DirectTaps manifest: 8 H264 levels, hex CodecPrivateData', async () => {
    const { manifest } = await parseManifest(
        read('superspeedway.ismc'),
        'https://x/SuperSpeedway_720.ism/Manifest'
    );
    const sets = manifest.periods[0].adaptationSets;
    assert.equal(sets.length, 2, 'video + audio');
    const video = sets.find((s) => s.contentType === 'video');
    assert.ok(video);
    assert.equal(video.smoothStreaming.qualityLevelCount, 8);
    assert.equal(
        video.smoothStreaming.timeScale,
        10_000_000,
        'TimeScale defaults to 10 MHz'
    );
    assert.equal(
        video.representations[0].fourCC,
        'H264',
        'DirectTaps uses H264'
    );
    assert.equal(
        video.representations[0].codecs,
        'avc1.64001f',
        'derived from the AVC record'
    );
    assert.equal(video.width, 1280);
    assert.equal(video.height, 720);
    // The audio stream is present too: AACL with a sampling rate.
    const audio = sets.find((s) => s.contentType === 'audio');
    assert.ok(audio);
    assert.equal(audio.representations[0].fourCC, 'AACL');
    assert.equal(audio.representations[0].audioSamplingRate, 44100);
});

// --- codec derivation ---------------------------------------------------------------

test('AT-MSS-04 AVC codec string comes from the decoder configuration record', () => {
    // Length-prefixed (Annex-B) layout, as IIS/Wowza-style servers emit:
    // 00000001 67 64 00 1F → avc1.64001f (High, level 3.1).
    assert.equal(avcCodecFromRecord('000000016764001FAC2CA5'), 'avc1.64001f');
    assert.equal(avcCodecFromRecord('000000016742C00DA6110E3F'), 'avc1.42c00d');
    // Classic AVCDecoderConfigurationRecord layout: 01 64 00 1F FF …
    assert.equal(avcCodecFromRecord('0164001FFFE000016765'), 'avc1.64001f');
    assert.equal(avcCodecFromRecord(null), null);
    assert.equal(avcCodecFromRecord('zzzz'), null, 'non-hex degrades to null');
});

test('AT-MSS-05 AAC codec string comes from the AudioSpecificConfig', () => {
    assert.equal(aacCodecFromConfig('1190'), 'mp4a.40.2');
    assert.equal(
        aacCodecFromConfig('1188'),
        'mp4a.40.2',
        'AOT is what matters, not the rate index'
    );
    assert.equal(aacCodecFromConfig(null), null);
    assert.equal(aacCodecFromConfig('1'), null, 'too short');
});

test('AT-MSS-06 unknown FourCCs are reported, not guessed', () => {
    assert.equal(mssCodecString('ZZZZ', null), 'ZZZZ');
    assert.equal(mssCodecString(null, null), 'unknown');
    assert.equal(mssCodecString('HEV1', null), 'hev1');
    assert.equal(mssCodecString('EC-3', null), 'ec-3');
});

// --- fragment timeline --------------------------------------------------------------

test('AT-MSS-07 chunk runs expand with r semantics and derived timestamps', () => {
    const { fragments, totalDuration } = expandChunkTimeline([
        { ':@': { t: '0', d: '1000' } },
        { ':@': { d: '2000', r: '2' } },
        { ':@': { n: '9', d: '500' } },
    ]);
    assert.deepEqual(
        fragments.map((f) => [f.n, f.t, f.d]),
        [
            [0, 0, 1000],
            [1, 1000, 2000],
            [2, 3000, 2000],
            [3, 5000, 2000],
            [9, 7000, 500],
        ]
    );
    assert.equal(totalDuration, 7500);
    assert.equal(fragments[2].repeated, true);
    assert.equal(fragments[0].repeated, false);
});

test('AT-MSS-08 a d-only manifest (classic IIS style) still yields a timeline', async () => {
    const { manifest } = await parseManifest(
        read('superspeedway.ismc'),
        'https://x/Manifest'
    );
    const video = manifest.periods[0].adaptationSets[0];
    const tl = video.smoothStreaming.fragmentTimeline;
    assert.equal(
        tl.fragments.length,
        61,
        'declared Chunks == expanded fragments'
    );
    assert.equal(tl.hasExplicitStartTimes, false, 'IIS-style: no t attributes');
    assert.equal(tl.fragments[0].d, 20_020_000);
    assert.equal(tl.fragments[60].t, 60 * 20_020_000, 'timestamps accumulate');
});

test('AT-MSS-09 explicit start times are respected, not re-derived', () => {
    const { fragments } = expandChunkTimeline([
        { ':@': { t: '100', d: '50' } },
        { ':@': { t: '900', d: '50' } },
    ]);
    assert.deepEqual(
        fragments.map((f) => f.t),
        [100, 900]
    );
});

// --- fragment URLs -------------------------------------------------------------------

test('AT-MSS-10 fragment URL templates expand (both placeholder spellings)', () => {
    assert.equal(
        expandFragmentUrl(
            'QualityLevels({bitrate})/Fragments(video={start time})',
            {
                bitrate: 2962000,
                startTime: 400400000,
            }
        ),
        'QualityLevels(2962000)/Fragments(video=400400000)'
    );
    // Name-qualified placeholder (Unified Streaming) and the ExoPlayer quirk.
    assert.equal(
        expandFragmentUrl(
            'QualityLevels({bitrate})/Fragments(audio_eng={start time})',
            {
                bitrate: 128002,
                startTime: 0,
            }
        ),
        'QualityLevels(128002)/Fragments(audio_eng=0)'
    );
    assert.equal(
        expandFragmentUrl('Fragments(video={start_time})', {
            bitrate: 1,
            startTime: 5,
        }),
        'Fragments(video=5)'
    );
    assert.equal(expandFragmentUrl('', { bitrate: 1, startTime: 2 }), '');
});

test('AT-MSS-11 live manifests expose the DVR window and lookahead', () => {
    const ir = adaptMssToIr(
        parseXml(`
        <SmoothStreamingMedia MajorVersion="2" MinorVersion="0" Duration="0" TimeScale="10000000"
            IsLive="TRUE" LookaheadCount="4" DVRWindowLength="600000000" />
    `),
        'https://x/Manifest'
    );
    assert.equal(ir.type, 'dynamic');
    assert.equal(
        ir.timeShiftBufferDepth,
        60,
        'DVRWindowLength 600000000 ticks = 60 s'
    );
    assert.equal(ir.smoothStreaming.lookaheadCount, 4);
});

test('AT-MSS-12 a manifest with no StreamIndex yields an empty but valid IR', async () => {
    const { manifest } = await parseManifest(
        '<SmoothStreamingMedia MajorVersion="2" MinorVersion="0" Duration="0" />',
        'https://x/Manifest'
    );
    assert.equal(manifest.periods[0].adaptationSets.length, 0);
    assert.equal(manifest.duration, 0);
});

test('AT-MSS-13 parsing a non-MSS XML throws an actionable error', async () => {
    await assert.rejects(
        () => parseManifest('<MPD><Period/></MPD>', 'https://x/Manifest'),
        /SmoothStreamingMedia/
    );
});
