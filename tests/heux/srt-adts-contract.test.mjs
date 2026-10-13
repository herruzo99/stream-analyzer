import assert from 'node:assert/strict';
import test from 'node:test';
import {
    extractAdtsFrames,
    measureLoudnessFromTs,
} from '../../src/features/srtSource/domain/adts.js';

const TS_PACKET = 188;

function tsPacket(pid, opts = {}) {
    const p = new Uint8Array(188);
    p[0] = 0x47;
    p[1] = ((opts.pusi ? 0x40 : 0) | (pid >> 8)) & 0xff;
    p[2] = pid & 0xff;
    p[3] = ((opts.afc ?? 0x01) << 4) | (opts.cc ?? 0);
    if (opts.afc === 0x03) p[4] = 0;
    return p;
}

/** A minimal valid ADTS header + payload of the given length. */
function adtsFrame(payloadLen) {
    const frameLen = 7 + payloadLen;
    const f = new Uint8Array(frameLen);
    f[0] = 0xff;
    f[1] = 0xf1; // sync + MPEG-4 + layer 0 + protection absent
    f[2] = 0x40 | (4 << 2) | 0x01; // profile AAC-LC (1), 44.1kHz idx 4, private 0
    f[3] = ((frameLen >> 11) & 0x03) | 0x04; // 2-channel, frameLen high bits
    f[4] = (frameLen >> 3) & 0xff;
    f[5] = ((frameLen & 0x07) << 5) | 0x1f;
    f[6] = 0xfc;
    for (let i = 7; i < frameLen; i++) f[i] = (i * 7) & 0xff;
    return f;
}

function audioPesPacket(pid, payload, pusi = true) {
    const p = tsPacket(pid, { pusi });
    // PES header before the ADTS payload.
    const pes = [0x00, 0x00, 0x01, 0xc0, 0x00, 0x00, 0x80, 0x80, 0x05];
    p.set(pes, 4);
    const room = 188 - 4 - pes.length;
    p.set(payload.subarray(0, room), 4 + pes.length);
    return { packet: p, rest: payload.subarray(room) };
}

test('AT-T2-ADTS-01 extracts frames from a single-packet PES', () => {
    const frame = adtsFrame(50);
    const { packet } = audioPesPacket(0x0101, frame);
    const { frames } = extractAdtsFrames(packet, [0x0101]);
    assert.equal(frames.length, 1);
    assert.equal(frames[0].length, 57); // 7 + 50
    assert.equal(frames[0][0], 0xff);
});

test('AT-T2-ADTS-02 reassembles multi-packet PES and skips other PIDs', () => {
    const frame = adtsFrame(300); // spans two packets
    const first = audioPesPacket(0x0101, frame);
    const second = tsPacket(0x0101, { cc: 1 });
    second.set(first.rest, 4);
    const video = tsPacket(0x0100, { pusi: false, cc: 0 });
    video.set([0x00, 0x00, 0x01, 0xe0], 4);
    const out = new Uint8Array(TS_PACKET * 3);
    out.set(first.packet, 0);
    out.set(video, TS_PACKET);
    out.set(second, TS_PACKET * 2);

    const { frames, pesPayloadBytes } = extractAdtsFrames(out, [0x0101]);
    assert.equal(frames.length, 1, `frames=${frames.length}`);
    assert.equal(frames[0].length, 307);
    assert.ok(pesPayloadBytes > 0);
});

test('AT-T2-ADTS-03 garbage payloads never crash and yield no frames', () => {
    const junk = new Uint8Array(TS_PACKET * 4).fill(0x00);
    junk[0] = 0x47;
    const { frames } = extractAdtsFrames(junk, [0x0101]);
    assert.deepEqual(frames, []);
    // Empty input + no PIDs.
    assert.deepEqual(extractAdtsFrames(new Uint8Array(0), [0x0101]).frames, []);
    assert.deepEqual(extractAdtsFrames(junk, []).frames, []);
});

test('AT-T2-ADTS-04 resync skips non-ADTS garbage between frames', () => {
    const good = adtsFrame(40);
    const buf = new Uint8Array(10 + good.length + 10);
    buf.set(good, 10);
    const single = audioPesPacket(0x0101, buf);
    const { frames } = extractAdtsFrames(single.packet, [0x0101]);
    assert.equal(frames.length, 1);
    assert.equal(frames[0].length, 47);
});

test('AT-T2-ADTS-05 browser measure path degrades gracefully without WebAudio', async () => {
    // In Node there is no AudioContext: must return nulls, not throw.
    const frame = adtsFrame(20);
    const { packet } = audioPesPacket(0x0101, frame);
    const result = await measureLoudnessFromTs(packet, [0x0101]);
    assert.equal(result.integratedLufs, null);
});
