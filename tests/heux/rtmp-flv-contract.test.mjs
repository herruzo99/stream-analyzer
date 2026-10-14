// FLV + telemetry contract tests for RTMP — written before the implementation.
// The helper demuxes FLV and reports normalized descriptors; these modules own
// the analytics and the honest-null LinkTelemetry mapping.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
    FLV_SOUND_FORMAT,
    FLV_VIDEO_CODEC,
    summarizeAudio,
    summarizeVideo,
    deriveBitrateKbps,
    keyframeIntervalMs,
} from '../../src/features/rtmpSource/domain/flv.js';
import {
    normalizeRtmpTelemetry,
    RTMP_RULE_IDS,
    evaluateRtmpRules,
} from '../../src/features/rtmpSource/domain/telemetry.js';

// --- FLV analytics ---------------------------------------------------------------

test('AT-FL-01 audio inventory maps sound format ids to names', () => {
    const summary = summarizeAudio([
        {
            byteLength: 128,
            soundFormat: 10,
            soundRate: 3,
            soundSize: 1,
            soundType: 1,
            dts: 0,
        },
        {
            byteLength: 128,
            soundFormat: 10,
            soundRate: 3,
            soundSize: 1,
            soundType: 1,
            dts: 21,
        },
        {
            byteLength: 900,
            soundFormat: 2,
            soundRate: 3,
            soundSize: 1,
            soundType: 1,
            dts: 23,
        },
    ]);
    assert.equal(summary.count, 3);
    assert.equal(summary.bytes, 1156);
    assert.deepEqual(
        Object.keys(summary.formats)
            .map(Number)
            .sort((a, b) => a - b),
        [2, 10]
    );
    assert.equal(summary.formats[10].name, 'AAC');
    assert.equal(summary.formats[2].name, 'MP3');
    assert.equal(
        summary.formats[10].sampleRateHz,
        null,
        'AAC carries its real rate in the sequence header, not the legacy field'
    );
    assert.equal(
        summary.formats[2].sampleRateHz,
        44100,
        'MP3 uses the legacy rate table'
    );
    assert.equal(summary.formats[2].count, 1);
});

test('AT-FL-02 video inventory counts frame types and keyframes', () => {
    const summary = summarizeVideo([
        { byteLength: 2048, frameType: 1, codecId: 7, dts: 0 }, // key AVC
        { byteLength: 300, frameType: 2, codecId: 7, dts: 33 }, // inter AVC
        { byteLength: 250, frameType: 2, codecId: 7, dts: 66 },
        { byteLength: 2100, frameType: 1, codecId: 7, dts: 2000 }, // next GOP
    ]);
    assert.equal(summary.count, 4);
    assert.equal(summary.keyframes, 2);
    assert.equal(summary.codecs[7].name, 'AVC (H.264)');
    assert.equal(
        keyframeIntervalMs(summary.keyframeDtsMs),
        2000,
        'one interval from two keyframes'
    );
});

test('AT-FL-03 E-RTMP codec ids decode alongside legacy ones', () => {
    const summary = summarizeVideo([
        { byteLength: 100, frameType: 1, codecId: 12, dts: 0 }, // HEVC
        { byteLength: 100, frameType: 1, codecId: 13, dts: 0 }, // AV1 (E-RTMP)
        { byteLength: 100, frameType: 1, codecId: 14, dts: 0 }, // VP9 (E-RTMP)
    ]);
    assert.equal(summary.codecs[12].name, 'HEVC');
    assert.equal(summary.codecs[13].name, 'AV1');
    assert.equal(summary.codecs[14].name, 'VP9');
});

test('AT-FL-04 unknown codec ids are preserved, not guessed', () => {
    const s = summarizeVideo([
        { byteLength: 1, frameType: 1, codecId: 99, dts: 0 },
    ]);
    assert.equal(s.codecs[99].name, 'unknown (99)');
});

test('AT-FL-05 derived bitrate comes from byte counts over a time window', () => {
    // 128000 bytes over 8 s = 128 kbps.
    assert.equal(deriveBitrateKbps(128000, 8000), 128);
    assert.equal(deriveBitrateKbps(0, 0), 0, 'zero-time windows are safe');
});

// --- telemetry -------------------------------------------------------------------

test('AT-TEL-01 RTMP samples map onto LinkTelemetry with honest nulls', () => {
    const out = normalizeRtmpTelemetry({
        t: 5000,
        mbpsRecvRate: 2.5,
        bytesRecvTotal: 1_000_000,
        bytesSentTotal: 2048,
        chunkCount: 900,
        messageCount: 300,
        audioTags: 100,
        videoTags: 200,
        scriptTags: 2,
        ackSequence: 20,
        windowAckSize: 2500000,
        negotiatedChunkSize: 4096,
    });
    // RTMP has no RTT or loss channel at the protocol level.
    assert.equal(out.rttMs, null);
    assert.equal(typeof out.rttMsReason, 'string');
    assert.ok(/handshake|RTT|round-trip/i.test(out.rttMsReason));
    assert.equal(out.pktRecvLost, null);
    assert.equal(out.lossRate, null);
    assert.equal(out.mbpsRecv, 2.5);
    assert.equal(out.mbpsSend, 0, 'send-side rate is derived by the caller');
    assert.equal(out.rtmp.audioTags, 100);
    assert.equal(out.rtmp.videoTags, 200);
    assert.equal(out.rtmp.chunkCount, 900);
    assert.equal(out.rtmp.windowAckSize, 2500000);
    assert.equal(out.rtmp.negotiatedChunkSize, 4096);
});

test('AT-TEL-02 the RTMP rule family fires on documented failure modes', () => {
    const base = {
        t: 0,
        mbpsRecvRate: 1000,
        bytesRecvTotal: 0,
        chunkCount: 0,
        messageCount: 0,
        audioTags: 0,
        videoTags: 0,
        scriptTags: 0,
        ackSequence: 0,
        windowAckSize: 0,
        negotiatedChunkSize: 128,
    };
    const neg = normalizeRtmpTelemetry(base);
    const quiet = normalizeRtmpTelemetry({
        ...base,
        t: 1000,
        audioTags: 1,
        videoTags: 1,
    });
    // A stillborn session (no tags in either window) reports no-media.
    const ids = evaluateRtmpRules(neg, neg).map((a) => a.id);
    assert.ok(
        ids.includes(RTMP_RULE_IDS.NO_MEDIA),
        `expected no-media rule, got ${ids}`
    );
    // One tag arriving must NOT trip no-media.
    const arrived = evaluateRtmpRules(neg, quiet).map((a) => a.id);
    assert.ok(!arrived.includes(RTMP_RULE_IDS.NO_MEDIA), 'media arrived');
    assert.ok(
        arrived.includes(RTMP_RULE_IDS.CHUNK_SIZE_DEFAULT),
        'a 128-byte chunk size is never tuned'
    );

    // Counters are cumulative: a stall is frozen counters, not zero ones.
    const stalled = normalizeRtmpTelemetry({
        ...base,
        t: 2000,
        audioTags: 1,
        videoTags: 1,
        negotiatedChunkSize: 4096,
    });
    const ids2 = evaluateRtmpRules(quiet, stalled).map((a) => a.id);
    assert.ok(
        ids2.includes(RTMP_RULE_IDS.MEDIA_STALL),
        'media stopped flowing is a stall'
    );
    assert.ok(
        !ids2.includes(RTMP_RULE_IDS.CHUNK_SIZE_DEFAULT),
        'tuned chunk size'
    );
});
