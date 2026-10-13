// ADTS/AAC frame extraction from MPEG-TS (Tier-2 #9 support).
//
// Feeds the loudness module: TS carries AAC as ADTS frames inside PES
// packets. This extractor walks the TS bytes, collects PES payloads for the
// given audio PIDs, and slices complete ADTS frames (sync 0xFFF) so they can
// be handed to AudioContext.decodeAudioData / measureLoudness.

const TS_PACKET = 188;

const ADTS_SYNC = 0xfff;

/**
 * Extract complete ADTS frames for the given audio PIDs from TS bytes.
 *
 * @param {Uint8Array} bytes
 * @param {number[]} audioPids elementary PIDs carrying AAC/ADTS
 * @returns {{frames: Uint8Array[], pesPayloadBytes: number}}
 */
export function extractAdtsFrames(bytes, audioPids) {
    const frames = [];
    if (!bytes?.length || !audioPids?.length)
        return { frames, pesPayloadBytes: 0 };
    const wanted = new Set(audioPids);

    let off = 0;
    while (off < bytes.length && bytes[off] !== 0x47) off++;

    // Per-PID PES reassembly (continuation packets have PUSI=0).
    let currentPid = -1;
    let pesBuffer = [];

    const flushPes = () => {
        if (currentPid >= 0 && wanted.has(currentPid) && pesBuffer.length > 0) {
            for (const frame of sliceAdts(pesBuffer)) frames.push(frame);
        }
        pesBuffer = [];
        currentPid = -1;
    };

    let pesPayloadBytes = 0;
    while (off + TS_PACKET <= bytes.length) {
        if (bytes[off] !== 0x47) {
            off += 1;
            continue;
        }
        const pid = ((bytes[off + 1] & 0x1f) << 8) | bytes[off + 2];
        const pusi = (bytes[off + 1] & 0x40) !== 0;
        const afc = (bytes[off + 3] >> 4) & 0x03;

        if (wanted.has(pid)) {
            let payloadStart = off + 4;
            if (afc === 0x03) payloadStart += 1 + bytes[off + 4];
            else if (afc === 0x02) {
                off += TS_PACKET;
                continue;
            }
            if (pusi) flushPes();
            currentPid = pid;
            const payload = bytes.subarray(payloadStart, off + TS_PACKET);
            pesBuffer.push(payload);
            pesPayloadBytes += payload.length;
        } else if (pusi && currentPid >= 0 && pid !== currentPid) {
            flushPes();
        }
        off += TS_PACKET;
    }
    flushPes();
    return { frames, pesPayloadBytes };
}

/** Slice one concatenated PES payload into complete ADTS frames. */
function sliceAdts(payloadParts) {
    const total = payloadParts.reduce((n, p) => n + p.length, 0);
    const buf = new Uint8Array(total);
    let at = 0;
    for (const p of payloadParts) {
        buf.set(p, at);
        at += p.length;
    }
    const frames = [];
    let i = 0;
    while (i + 7 <= buf.length) {
        // ADTS syncword 0xFFF + layer/config sanity.
        if (!((buf[i] & 0xff) === 0xff && (buf[i + 1] & 0xf0) === 0xf0)) {
            i += 1; // resync
            continue;
        }
        const protectionAbsent = buf[i + 1] & 0x01;
        const profile = (buf[i + 2] >> 6) & 0x03;
        const samplingIndex = (buf[i + 2] >> 2) & 0x0f;
        const channelConfig =
            ((buf[i + 2] & 0x01) << 2) | ((buf[i + 3] >> 6) & 0x03);
        if (profile === 3 || samplingIndex > 12 || channelConfig === 0) {
            i += 1; // not a plausible header; resync
            continue;
        }
        const frameLen =
            ((buf[i + 3] & 0x03) << 11) |
            (buf[i + 4] << 3) |
            ((buf[i + 5] >> 5) & 0x07);
        if (frameLen < 7 || i + frameLen > buf.length) {
            i += 1;
            continue;
        }
        frames.push(buf.slice(i, i + frameLen));
        i += frameLen;
    }
    return frames;
}

/** Concatenate frames into a single buffer for decodeAudioData. */
export function framesToBlobParts(frames) {
    return frames.map((f) => f.slice().buffer);
}

/**
 * Browser convenience: extract ADTS frames from TS bytes and decode+measure.
 * Returns null loudness when WebAudio is unavailable or nothing decodable.
 *
 * @param {Uint8Array} bytes TS chunk
 * @param {number[]} audioPids
 */
export async function measureLoudnessFromTs(bytes, audioPids) {
    const { measureLoudnessFromBlob } = await import('./loudness.js');
    const { frames } = extractAdtsFrames(bytes, audioPids);
    if (frames.length === 0) {
        return {
            integratedLufs: null,
            shortTermMaxLufs: null,
            momentaryMaxLufs: null,
            gatedBlocks: 0,
            ungatedLufs: null,
        };
    }
    const blob = new Blob(framesToBlobParts(frames), { type: 'audio/aac' });
    return measureLoudnessFromBlob(blob);
}
