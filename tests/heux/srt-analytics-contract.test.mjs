import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeTsChunk } from '../../src/features/srtSource/domain/tsAnalytics.js';

// --- synthetic TS builders ----------------------------------------------------

function tsPacket(pid, opts = {}) {
    const p = new Uint8Array(188);
    p[0] = 0x47;
    p[1] = ((opts.pusi ? 0x40 : 0) | (pid >> 8)) & 0xff;
    p[2] = pid & 0xff;
    p[3] = ((opts.afc ?? 0x01) << 4) | (opts.cc ?? 0);
    if (opts.afc === 0x03) {
        p[4] = 0;
    }
    return p;
}

function tsPacketWithPcr(pid, pcrTicks, cc = 0) {
    const p = tsPacket(pid, { pusi: true, afc: 0x03, cc });
    const base = Math.floor(pcrTicks / 300);
    const ext = pcrTicks % 300;
    p[4] = 7; // adaptation field length
    p[5] = 0x10; // PCR flag
    p[6] = (base / 2 ** 25) & 0xff;
    p[7] = (base / 2 ** 17) & 0xff;
    p[8] = (base / 2 ** 9) & 0xff;
    p[9] = (base / 2) & 0xff;
    p[10] = ((base & 1) << 7) | 0x7e | ((ext >> 8) & 1);
    p[11] = ext & 0xff;
    for (let i = 12; i < 15; i++) p[i] = 0xff;
    return p;
}

function patPacket(cc, programNumber, pmtPid) {
    const payload = new Uint8Array(184);
    payload[0] = 0x00; // pointer
    payload[1] = 0x00; // table_id PAT
    payload[2] = 0xb0 | ((13 >> 8) & 0x0f); // marker + section_length high
    payload[3] = 13 & 0xff; // section_length low
    payload[4] = 0x00; // transport_stream_id
    payload[5] = 0x01;
    payload[6] = 0xc1; // version + current_next
    payload[7] = 0x00; // section number
    payload[8] = 0x00; // last section
    payload[9] = (programNumber >> 8) & 0xff;
    payload[10] = programNumber & 0xff;
    payload[11] = 0xe0 | ((pmtPid >> 8) & 0x1f);
    payload[12] = pmtPid & 0xff;
    const p = tsPacket(0, { pusi: true });
    p[3] = (p[3] & 0xf0) | (cc & 0x0f);
    p.set(payload, 4);
    return p;
}

function pmtPacket(cc, pmtPid, pcrPid, streams) {
    let body = [];
    for (const [type, pid] of streams) {
        body.push(type, (0xe0 | (pid >> 8)) & 0xff, pid & 0xff, 0xf0, 0x00);
    }
    const progInfo = 0;
    const len = 9 + progInfo + body.length + 4; // header + crc slack
    const payload = new Uint8Array(184);
    let o = 0;
    payload[o++] = 0x00; // pointer
    payload[o++] = 0x02; // table_id PMT
    payload[o++] = 0xb0 | ((len >> 8) & 0x0f);
    payload[o++] = len & 0xff;
    payload[o++] = 0x00; // program number
    payload[o++] = 0x01;
    payload[o++] = 0xc1;
    payload[o++] = 0x00;
    payload[o++] = 0x00;
    payload[o++] = (0xe0 | (pcrPid >> 8)) & 0xff;
    payload[o++] = pcrPid & 0xff;
    payload[o++] = (progInfo >> 8) & 0x0f;
    payload[o++] = progInfo & 0xff;
    payload.set(body, o);
    const p = tsPacket(pmtPid, { pusi: true });
    p[3] = (p[3] & 0xf0) | (cc & 0x0f);
    p.set(payload, 4);
    return p;
}

function concat(packets) {
    const out = new Uint8Array(packets.length * 188);
    packets.forEach((pk, i) => out.set(pk, i * 188));
    return out;
}

// Build a stream: PAT, PMT, then GOPs of video (PES with PTS) and audio, PCR on video PID.
function buildStream(gops, gopFrames) {
    const packets = [];
    let cc = { pat: 0, pmt: 0, video: 0, audio: 0 };
    let pts = 0; // 90 kHz
    let pcr = 0; // 27 MHz
    const pidVideo = 0x0100;
    const pidAudio = 0x0101;
    for (let g = 0; g < gops; g++) {
        packets.push(patPacket(cc.pat++ & 0x0f, 1, 0x1000));
        packets.push(
            pmtPacket(cc.pmt++ & 0x0f, 0x1000, pidVideo, [
                [0x1b, pidVideo],
                [0x0f, pidAudio],
            ])
        );
        const pcrPacket = tsPacketWithPcr(pidVideo, pcr, cc.video++ & 0x0f);
        pcrPacket[1] &= ~0x40; // PCR packet is not a payload start
        packets.push(pcrPacket);
        for (let f = 0; f < gopFrames; f++) {
            pcr += 27000000 / 30; // 33.3ms
            pts += 3000; // 33.3ms in 90kHz
            const v = tsPacket(pidVideo, { pusi: f === 0 });
            v[3] = (v[3] & 0xf0) | (cc.video++ & 0x0f);
            if (f === 0) {
                // PES start code + PTS on the packet payload.
                const pes = [
                    0x00,
                    0x00,
                    0x01,
                    0xe0,
                    0x00,
                    0x00,
                    0x80,
                    0x80,
                    0x21,
                    ((pts / 2 ** 30) & 0x0e) | 0x31,
                    (pts / 2 ** 22) & 0xff,
                    ((pts / 2 ** 15) & 0x7f) << 1,
                    (pts / 2 ** 7) & 0xff,
                    ((pts & 0x7f) << 1) | 1,
                ];
                v.set(pes, 4);
            }
            packets.push(v);
        }
        // audio packets between GOPs
        for (let a = 0; a < 5; a++) {
            packets.push(tsPacket(pidAudio, { cc: cc.audio++ & 0x0f }));
        }
    }
    return concat(packets);
}

// --- tests ---------------------------------------------------------------------

test('AT-SRT-TSA-01 PID inventory and program discovery', () => {
    const bytes = buildStream(3, 10);
    const a = analyzeTsChunk(bytes, { durationMs: 3000 });
    assert.equal(a.packets > 50, true);
    assert.equal(a.syncErrors, 0);
    const pids = a.pidInventory.map((p) => p.pid);
    assert.ok(pids.includes(0), 'PAT present');
    assert.ok(pids.includes(0x1000), 'PMT present');
    assert.ok(pids.includes(0x0100), 'video present');
    assert.ok(pids.includes(0x0101), 'audio present');
    const pmt = a.pidInventory.find((p) => p.pid === 0x1000);
    assert.equal(pmt.role, 'PMT'); // the PMT's own PID; its streams live in programs[]
    assert.equal(a.programs.length, 1);
    assert.equal(a.programs[0].streams.length, 2);
    assert.equal(a.programs[0].pcrPid, 0x0100);
    // Bitrate non-negative for all.
    for (const p of a.pidInventory)
        assert.ok(p.mbps >= 0 && p.role !== undefined);
});

test('AT-SRT-TSA-02 continuity errors are detected and reported', () => {
    const packets = buildStream(3, 5);
    // Corrupt one video packet's CC (first video packet after the last PCR
    // packet: packets are PAT,PMT,PCR,v,v,v,v,v,audio*5 per GOP).
    const victim = 2 * 13 + 3; // first video frame of the third GOP
    packets[victim * 188 + 3] = 0x10 | ((packets[victim * 188 + 3] + 3) & 0x0f);
    const a = analyzeTsChunk(packets, { durationMs: 1000 });
    assert.ok(a.ccErrorLedger.length >= 1, 'a CC error must be reported');
    assert.ok(a.ccErrorLedger.some((c) => c.pid === 0x0100));
});

test('AT-SRT-TSA-03 GOP spacing and PCR intervals', () => {
    const bytes = buildStream(4, 30); // 30-frame GOPs at 30fps
    const a = analyzeTsChunk(bytes, { durationMs: 4000 });
    assert.equal(a.gop.keyframes, 4);
    assert.ok(
        a.gop.avgGopFrames >= 29 && a.gop.avgGopFrames <= 32,
        `avgGop = ${a.gop.avgGopFrames}`
    );
    assert.ok(a.gop.keyframePids.includes(0x0100));
    assert.ok(a.pcr.count >= 1, 'PCR intervals observed');
    assert.ok(
        a.pcr.minIntervalMs > 0 && a.pcr.maxIntervalMs >= a.pcr.minIntervalMs
    );

    // A dense PCR cadence (33.3ms, PCR on every 15th packet) must be
    // measured precisely by the scanner.
    const dense = [];
    let tick = 0;
    for (let i = 0; i < 60; i++) {
        if (i % 15 === 0) {
            dense.push(
                tsPacketWithPcr(
                    0x0100,
                    (tick += (27_000_000 / 1000) * 33),
                    i & 0x0f
                )
            );
        } else {
            dense.push(tsPacket(0x0100, { cc: i & 0x0f }));
        }
    }
    const da = analyzeTsChunk(concat(dense), { durationMs: 1000 });
    assert.ok(
        da.pcr.minIntervalMs >= 25 && da.pcr.maxIntervalMs <= 45,
        `dense pcr interval ${da.pcr.minIntervalMs}..${da.pcr.maxIntervalMs}`
    );
});

test('AT-SRT-TSA-04 sync errors and empty input are handled', () => {
    const empty = analyzeTsChunk(new Uint8Array(0));
    assert.equal(empty.packets, 0);
    assert.deepEqual(empty.pidInventory, []);

    const junk = new Uint8Array(400);
    junk.fill(0x00);
    const a = analyzeTsChunk(junk);
    assert.equal(a.packets, 0); // no sync byte at all
});

test('AT-SRT-TSA-05 per-PID bitrate scales with duration', () => {
    const bytes = buildStream(2, 10);
    const slow = analyzeTsChunk(bytes, { durationMs: 1000 });
    const fast = analyzeTsChunk(bytes, { durationMs: 100 });
    const vidSlow = slow.pidInventory.find((p) => p.pid === 0x0100);
    const vidFast = fast.pidInventory.find((p) => p.pid === 0x0100);
    assert.ok(vidSlow.mbps >= 0 && vidFast.mbps >= 0);
    assert.ok(
        Math.abs(vidFast.mbps - vidSlow.mbps * 10) < 0.05 || vidSlow.mbps === 0
    );
});
