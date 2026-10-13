// TS stream-content analytics for SRT sessions (capability plan items 1-3).
//
// Pure byte-scanner over the façade chunks the helper already serves:
// PID inventory from PAT/PMT, per-PID bitrate, continuity-counter ledger,
// GOP spacing on video PIDs, and PCR interval statistics. No DOM; heux
// contract-tested.

const TS_PACKET = 188;
const PAT_PID = 0;
const VIDEO_STREAM_TYPES = new Set([0x01, 0x02, 0x1b, 0x24, 0x10, 0x11]);

const CC_MAX = 15;

/**
 * Scan a TS payload and return stream-content analytics.
 *
 * @param {Uint8Array} bytes
 * @param {{durationMs?: number, syncStart?: number}} [options]
 * @returns {{
 *   packets: number, bytes: number, syncErrors: number,
 *   pidInventory: Array<{pid:number, pidHex:string, bytes:number, packets:number, mbps:number, role:string|null, ccErrors:number}>,
 *   programs: Array<{programNumber:number, pcrPid:number, pmtPid:number, streams:Array<{streamType:number, pid:number, kind:string}>}>,
 *   ccErrorLedger: Array<{pid:number, errors:number}>,
 *   gop: {keyframes:number, avgGopFrames:number|null, keyframePids:number[]},
 *   pcr: {count:number, minIntervalMs:number|null, maxIntervalMs:number|null, avgIntervalMs:number|null, first:number|null, last:number|null},
 *   pts: {discontinuities:number, streams:Array<{pid:number,kind:string,count:number,first:number,last:number}>}
 * }}
 */
export function analyzeTsChunk(bytes, options = {}) {
    const durationMs = Number(options.durationMs ?? 0) || 0;
    const result = {
        packets: 0,
        bytes: bytes.length,
        syncErrors: 0,
        pidInventory: [],
        programs: [],
        ccErrorLedger: [],
        gop: { keyframes: 0, avgGopFrames: null, keyframePids: [] },
        pcr: {
            count: 0,
            minIntervalMs: null,
            maxIntervalMs: null,
            avgIntervalMs: null,
            first: null,
            last: null,
        },
        pts: { discontinuities: 0, streams: [] },
    };
    if (!bytes || bytes.length === 0) return result;

    // Align to the first sync byte (helpers deliver PAT-aligned chunks, but
    // be tolerant of a scanner that receives a mid-stream slice).
    let off = 0;
    while (off < bytes.length && bytes[off] !== 0x47) {
        off++;
        result.syncErrors++;
    }

    const perPid = new Map(); // pid -> {bytes, packets, ccErrors, lastCC}
    const pat = new Map(); // program_number -> pcr+pmt pids
    let pmtPids = new Map(); // pmtPid -> {pcrPid, streams[]}
    const pcrTimes = []; // ms (90kHz ticks converted at walk time)
    const ptsByPid = new Map(); // video pid -> last PTS (90kHz)
    const gopLengths = [];
    let lastKeyframePid = -1;
    let framesSinceKey = 0;

    while (off + TS_PACKET <= bytes.length) {
        if (bytes[off] !== 0x47) {
            result.syncErrors++;
            // Realign.
            let next = off + 1;
            while (next + TS_PACKET <= bytes.length && bytes[next] !== 0x47)
                next++;
            off = next;
            continue;
        }
        const p = off;
        const pid = ((bytes[p + 1] & 0x1f) << 8) | bytes[p + 2];
        const tei = (bytes[p + 1] & 0x80) !== 0;
        const pusi = (bytes[p + 1] & 0x40) !== 0;
        const cc = bytes[p + 3] & 0x0f;

        let entry = perPid.get(pid);
        if (!entry) {
            entry = { bytes: 0, packets: 0, ccErrors: 0, lastCC: null };
            perPid.set(pid, entry);
        }
        entry.bytes += TS_PACKET;
        entry.packets += 1;
        if (entry.lastCC !== null && !tei) {
            const expected = (entry.lastCC + 1) & CC_MAX;
            if (cc !== expected) {
                // Duplicate packets (same CC) are not counted as errors.
                if (cc !== entry.lastCC) entry.ccErrors += 1;
            }
        }
        entry.lastCC = cc;
        result.packets += 1;

        // Adaptation field PCR.
        const afc = (bytes[p + 3] >> 4) & 0x03;
        if (afc === 0x02 || afc === 0x03) {
            const afLen = bytes[p + 4];
            if (afLen >= 7 && bytes[p + 5] & 0x10) {
                const base =
                    (bytes[p + 6] << 25) |
                    (bytes[p + 7] << 17) |
                    (bytes[p + 8] << 9) |
                    (bytes[p + 9] << 1) |
                    (bytes[p + 10] >> 7);
                const ext = ((bytes[p + 10] & 0x01) << 8) | bytes[p + 11];
                pcrTimes.push((base * 300 + ext) / 300); // 27 MHz → 90 kHz ticks
            }
        }

        // PAT (PID 0): parse for program numbers → PMT PIDs (single-section tables).
        if (pid === PAT_PID && pusi) {
            parsePatSection(bytes, p, pat);
        }
        // PMT PIDs discovered from the PAT.
        parsePmts(bytes, p, pid, pusi, pat, pmtPids);

        // Video PUSI: GOP spacing + PES PTS discontinuity.
        const stream = streamForPid(pid, pmtPids);
        if (stream && VIDEO_STREAM_TYPES.has(stream.streamType)) {
            if (pusi) {
                if (lastKeyframePid === pid) {
                    if (framesSinceKey > 0) gopLengths.push(framesSinceKey);
                }
                lastKeyframePid = pid;
                framesSinceKey = 1;
                result.gop.keyframes += 1;
                if (!result.gop.keyframePids.includes(pid)) {
                    result.gop.keyframePids.push(pid);
                }
            } else if (lastKeyframePid === pid) {
                framesSinceKey += 1;
            }
        }

        // PES PTS for every elementary stream (video AND audio): A/V sync
        // and drift measurement need both sides (capability plan Tier-2 #9).
        const anyStream = streamForPid(pid, pmtPids);
        if (anyStream && pusi) {
            const pts = readPesPts(bytes, p, afc);
            if (pts !== null && pts >= 0) {
                const entry = ptsByPid.get(pid) ?? {
                    pid,
                    kind: anyStream.kind,
                    count: 0,
                    first: pts,
                    last: pts,
                };
                if (entry.count > 0) {
                    if (
                        entry.last - pts > 90000 ||
                        pts - entry.last > 10 * 90000
                    ) {
                        result.pts.discontinuities += 1;
                    }
                }
                entry.count += 1;
                entry.last = pts;
                entry.kind = anyStream.kind;
                ptsByPid.set(pid, entry);
            }
        }

        off += TS_PACKET;
    }

    // Programs view.
    for (const [programNumber, info] of pat) {
        const pmt = pmtPids.get(info.pmtPid) ?? { pcrPid: null, streams: [] };
        result.programs.push({
            programNumber,
            pcrPid: pmt.pcrPid ?? info.pcrPid ?? null,
            pmtPid: info.pmtPid,
            streams: pmt.streams,
        });
    }

    // PID inventory with roles from PMT.
    for (const [pid, e] of perPid) {
        const role = pidRole(pid, e, pmtPids, result.programs);
        const bytesPerSec =
            durationMs > 0 ? (e.bytes * 8 * 1000) / durationMs : 0;
        result.pidInventory.push({
            pid,
            pidHex: '0x' + pid.toString(16).padStart(4, '0'),
            bytes: e.bytes,
            packets: e.packets,
            mbps: Math.round((bytesPerSec / 1048576) * 100) / 100,
            role,
            ccErrors: e.ccErrors,
        });
        if (e.ccErrors > 0) {
            result.ccErrorLedger.push({ pid, errors: e.ccErrors });
        }
    }
    result.pidInventory.sort((a, b) => b.bytes - a.bytes);

    // GOP stats.
    if (gopLengths.length > 0) {
        result.gop.avgGopFrames =
            Math.round(
                (gopLengths.reduce((a, b) => a + b, 0) / gopLengths.length) * 10
            ) / 10;
    }

    // Per-stream PTS export (video + audio) for A/V sync/drift analysis.
    result.pts.streams = [...ptsByPid.values()].sort((a, b) => a.pid - b.pid);
    if (pcrTimes.length > 0) {
        result.pcr.first = Math.round(pcrTimes[0] * 100) / 100;
        result.pcr.last = Math.round(pcrTimes[pcrTimes.length - 1] * 100) / 100;
    }

    // PCR intervals (90 kHz ticks → ms).
    if (pcrTimes.length >= 2) {
        const gaps = [];
        for (let i = 1; i < pcrTimes.length; i++) {
            const gap = pcrTimes[i] - pcrTimes[i - 1];
            if (gap > 0) gaps.push(gap / 90); // 90 kHz ticks → ms
        }
        if (gaps.length > 0) {
            result.pcr.count = gaps.length;
            result.pcr.minIntervalMs =
                Math.round(Math.min(...gaps) * 100) / 100;
            result.pcr.maxIntervalMs =
                Math.round(Math.max(...gaps) * 100) / 100;
            result.pcr.avgIntervalMs =
                Math.round(
                    (gaps.reduce((a, b) => a + b, 0) / gaps.length) * 100
                ) / 100;
        }
    }

    return result;
}

function streamForPid(pid, pmtPids) {
    for (const pmt of pmtPids.values()) {
        const stream = pmt.streams.find((s) => s.pid === pid);
        if (stream) return stream;
    }
    return null;
}

function pidRole(pid, entry, pmtPids, programs) {
    if (pid === PAT_PID) return 'PAT';
    for (const program of programs) {
        if (program.pcrPid === pid) return 'PCR';
    }
    const stream = streamForPid(pid, pmtPids);
    if (stream) return stream.kind;
    const pmt = pmtPids.get(pid);
    if (pmt) return 'PMT'; // the PMT's own PID; its streams live in programs[]
    return null;
}

function parsePatSection(bytes, p, pat) {
    // Layout: [4]=pointer_field(0), [5]=table_id(0x00), [6..7]=section_length,
    // [8..9]=program_number (last entry may be 0 = NIT, skip), [10..11]=PMT pid.
    const pointer = bytes[p + 4];
    const s = p + 5 + pointer;
    if (s >= bytes.length || bytes[s] !== 0x00) return;
    const sectionLen = ((bytes[s + 1] & 0x0f) << 8) | bytes[s + 2];
    const end = Math.min(s + 3 + sectionLen - 4, p + TS_PACKET);
    for (let i = s + 8; i + 3 <= end; i += 4) {
        const programNumber = (bytes[i] << 8) | bytes[i + 1];
        const pmtPid = ((bytes[i + 2] & 0x1f) << 8) | bytes[i + 3];
        if (programNumber !== 0) pat.set(programNumber, { pmtPid });
    }
}

function parsePmts(bytes, p, pid, pusi, pat, pmtPids) {
    for (const [, info] of pat) {
        if (pid !== info.pmtPid) continue;
    }
    const target = [...pat.values()].find((v) => v.pmtPid === pid);
    if (!target || !pusi) return;
    if (pmtPids.has(pid)) return; // one section is enough for the inventory
    const pointer = bytes[p + 4];
    const s = p + 5 + pointer;
    if (s >= bytes.length || bytes[s] !== 0x02) return;
    const end = Math.min(
        p + TS_PACKET,
        s + 3 + (((bytes[s + 1] & 0x0f) << 8) | bytes[s + 2])
    );
    // section: [s+3..4]=program_number, [s+8..9]=PCR_PID, [s+10..11]=program_info_len,
    // then stream_type/elementary_pid/ES_info_len triplets.
    const pcrPid = ((bytes[s + 8] & 0x1f) << 8) | bytes[s + 9];
    const progInfoLen = ((bytes[s + 10] & 0x0f) << 8) | bytes[s + 11];
    const streams = [];
    for (let i = s + 12 + progInfoLen; i + 4 < end; i += 5) {
        const streamType = bytes[i];
        const esPid = ((bytes[i + 1] & 0x1f) << 8) | bytes[i + 2];
        const esInfoLen = ((bytes[i + 3] & 0x0f) << 8) | bytes[i + 4];
        streams.push({ streamType, pid: esPid, kind: streamKind(streamType) });
        i += esInfoLen; // skip ES descriptors
    }
    pmtPids.set(pid, { pcrPid, streams });
}

function streamKind(streamType) {
    const map = {
        0x01: 'video/mpeg2',
        0x02: 'video/h264',
        0x1b: 'video/h264',
        0x24: 'video/hevc',
        0x03: 'audio/mp3',
        0x04: 'audio/mp3',
        0x0f: 'audio/aac',
        0x11: 'audio/aac',
        0x81: 'audio/ac3',
        0x06: 'pes/private',
        0x86: 'scte35',
    };
    return map[streamType] ?? `stream/0x${streamType.toString(16)}`;
}

function readPesPts(bytes, p, afc) {
    // Payload starts after adaptation field if present.
    let payload = p + 4;
    if (afc === 0x03) payload += 1 + bytes[p + 4];
    if (afc === 0x02) return null;
    // Look for PES start code within the first bytes of the payload.
    for (let i = payload; i < payload + 14 && i + 5 + 5 < bytes.length; i++) {
        if (
            bytes[i] === 0x00 &&
            bytes[i + 1] === 0x00 &&
            bytes[i + 2] === 0x01
        ) {
            const flags = bytes[i + 7];
            const ptsDts = (flags >> 6) & 0x03;
            if (ptsDts === 0x02 || ptsDts === 0x03) {
                const b = [
                    bytes[i + 9],
                    bytes[i + 10],
                    bytes[i + 11],
                    bytes[i + 12],
                    bytes[i + 13],
                ];
                if (b.some((x) => x === undefined)) return null;
                const pts =
                    ((b[0] >> 1) & 0x07) * 2 ** 32 +
                    (b[1] << 22) +
                    ((b[2] >> 1) & 0x7f) * 2 ** 15 +
                    (b[3] << 7) +
                    ((b[4] >> 1) & 0x7f);
                return pts;
            }
            return null;
        }
    }
    return null;
}
