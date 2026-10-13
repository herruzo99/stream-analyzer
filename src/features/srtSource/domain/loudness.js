// Loudness measurement — EBU R128 integrated loudness (capability plan Tier-2
// #9), pure DSP over Float32 PCM. Browser path (audioLoudnessFromBlob) uses
// WebAudio decode; the measurement itself is identical and testable in Node.
//
// Filter coefficients follow the ITU-R BS.1770-4 K-weighting specification as
// used by libebur128.

// Stage 1: high shelf (+4 dB @ 1681 Hz), 48 kHz coefficients (libebur128).
const SHELF_B = [1.53512485958697, -2.69169618940638, 1.19839281085285];
const SHELF_A = [1.0, -1.69065929318241, 0.73248077421585];
// Stage 2: high-pass (~38 Hz), 48 kHz.
const HP_B = [1.0, -2.0, 1.0];
const HP_A = [1.0, -1.99004745483398, 0.99007225036621];

/**
 * Apply a biquad (Direct Form I) to interleaved samples in place on a copy.
 * @param {Float32Array} input
 * @param {number[]} b
 * @param {number[]} a
 */
function biquad(input, b, a) {
    const out = new Float32Array(input.length);
    let x1 = 0,
        x2 = 0,
        y1 = 0,
        y2 = 0;
    for (let i = 0; i < input.length; i++) {
        const x = input[i];
        const y =
            (b[0] * x + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2) / a[0];
        x2 = x1;
        x1 = x;
        y2 = y1;
        y1 = y;
        out[i] = y;
    }
    return out;
}

/** K-weight a channel's samples (shelf + high-pass). */
export function kWeight(samples) {
    return biquad(biquad(samples, SHELF_B, SHELF_A), HP_B, HP_A);
}

/**
 * Integrated loudness per BS.1770-4 / EBU R128.
 *
 * @param {Float32Array[]} channels one Float32Array per channel
 * @param {number} sampleRate Hz (48000 assumed by the filter bank; resample upstream)
 * @returns {{integratedLufs: number|null, shortTermMaxLufs: number|null, momentaryMaxLufs: number|null, gatedBlocks: number, ungatedLufs: number|null}}
 */
export function measureLoudness(channels, sampleRate = 48000) {
    if (!channels?.length || !sampleRate) {
        return {
            integratedLufs: null,
            shortTermMaxLufs: null,
            momentaryMaxLufs: null,
            gatedBlocks: 0,
            ungatedLufs: null,
        };
    }
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    const blockSize = Math.floor(0.4 * sampleRate); // momentary (400 ms)
    const shortSize = Math.floor(3.0 * sampleRate); // short-term (3 s)

    const loudnessOfWindow = (len, offset) => {
        const n = Math.min(
            len,
            Math.min(...channels.map((c) => c.length - offset))
        );
        if (n <= 0) return null;
        let power = 0;
        for (const ch of channels) {
            const weighted = kWeight(ch.subarray(offset, offset + n));
            power += sum(weighted.map((v) => v * v)) / n;
        }
        return -0.691 + 10 * Math.log10(power);
    };

    // 75% overlapping 400 ms blocks.
    const step = Math.floor(blockSize / 4);
    const blocks = [];
    for (
        let off = 0;
        off + blockSize <= Math.min(...channels.map((c) => c.length));
        off += step
    ) {
        blocks.push(loudnessOfWindow(blockSize, off));
    }
    const ungated = blocks.filter((v) => v > -70);
    if (ungated.length === 0) {
        return {
            integratedLufs: null,
            shortTermMaxLufs: null,
            momentaryMaxLufs: null,
            gatedBlocks: 0,
            ungatedLufs: null,
        };
    }
    const ungatedPower =
        ungated.reduce((s, v) => s + 10 ** (v / 10), 0) / ungated.length;
    const ungatedLufs = 10 * Math.log10(ungatedPower);
    const relativeGate = ungatedLufs - 10;
    const gated = ungated.filter((v) => v > relativeGate);
    if (gated.length === 0) {
        return {
            integratedLufs: null,
            shortTermMaxLufs: ungatedLufs,
            momentaryMaxLufs: null,
            gatedBlocks: 0,
            ungatedLufs,
        };
    }
    const gatedPower =
        gated.reduce((s, v) => s + 10 ** (v / 10), 0) / gated.length;
    const integrated = 10 * Math.log10(gatedPower);

    // Short-term max (3 s windows, non-overlapping for cheapness).
    let shortMax = null;
    for (
        let off = 0;
        off + shortSize <= Math.min(...channels.map((c) => c.length));
        off += shortSize
    ) {
        const v = loudnessOfWindow(shortSize, off);
        if (v != null && (shortMax == null || v > shortMax)) shortMax = v;
    }
    const momentaryMax = blocks.length ? Math.max(...blocks) : null;

    const round1 = (v) => (v == null ? null : Math.round(v * 100) / 100);
    return {
        integratedLufs: round1(integrated),
        shortTermMaxLufs: round1(shortMax),
        momentaryMaxLufs: round1(momentaryMax),
        gatedBlocks: gated.length,
        ungatedLufs: round1(ungatedLufs),
    };
}

/**
 * Browser helper: decode an audio blob (ADTS AAC extracted from TS) and
 * measure loudness. Returns nulls when WebAudio is unavailable.
 *
 * @param {Blob} blob
 * @returns {Promise<ReturnType<typeof measureLoudness>>}
 */
export async function measureLoudnessFromBlob(blob) {
    if (
        typeof document === 'undefined' ||
        typeof AudioContext === 'undefined'
    ) {
        return {
            integratedLufs: null,
            shortTermMaxLufs: null,
            momentaryMaxLufs: null,
            gatedBlocks: 0,
            ungatedLufs: null,
        };
    }
    const ctx = new AudioContext();
    try {
        const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
        const channels = [];
        for (let c = 0; c < buf.numberOfChannels; c++) {
            channels.push(buf.getChannelData(c));
        }
        return measureLoudness(channels, buf.sampleRate);
    } catch {
        return {
            integratedLufs: null,
            shortTermMaxLufs: null,
            momentaryMaxLufs: null,
            gatedBlocks: 0,
            ungatedLufs: null,
        };
    } finally {
        ctx.close();
    }
}
