// FLV analytics domain (browser side).
//
// The helper demuxes FLV tags and reports normalized descriptors; these pure
// functions turn them into the inventories and derived numbers the RTMP monitor
// shows. Nothing here parses bytes — see ai/rtmp-integration-analysis.md §4.
//
// Tag header references: Adobe FLV spec v10.1 (standard/video-file-format-v10-1-spec.pdf)
// and the Enhanced-RTMP v2 tag formats (standard/enhanced-rtmp-v2.md).

/** Legacy FLV SoundFormat ids (§E.4.3.1) plus the E-RTMP extensions. */
export const FLV_SOUND_FORMAT = Object.freeze({
    0: { name: 'Linear PCM', rateFromLegacyField: true },
    1: { name: 'ADPCM', rateFromLegacyField: true },
    2: { name: 'MP3', rateFromLegacyField: true },
    3: { name: 'Linear PCM (LE)', rateFromLegacyField: true },
    4: {
        name: 'Nellymoser 16 kHz',
        rateFromLegacyField: false,
        sampleRateHz: 16000,
    },
    5: {
        name: 'Nellymoser 8 kHz',
        rateFromLegacyField: false,
        sampleRateHz: 8000,
    },
    6: { name: 'Nellymoser', rateFromLegacyField: true },
    7: { name: 'G.711 A-law', rateFromLegacyField: false, sampleRateHz: 8000 },
    8: { name: 'G.711 mu-law', rateFromLegacyField: false, sampleRateHz: 8000 },
    9: { name: 'reserved', rateFromLegacyField: false, sampleRateHz: null },
    10: { name: 'AAC', rateFromLegacyField: false, sampleRateHz: null },
    11: { name: 'Speex', rateFromLegacyField: false, sampleRateHz: 16000 },
    14: { name: 'MP3 8 kHz', rateFromLegacyField: false, sampleRateHz: 8000 },
    15: {
        name: 'Device-specific',
        rateFromLegacyField: false,
        sampleRateHz: null,
    },
    // Enhanced RTMP (E-RTMP v2 §Enhanced Audio)
    20: { name: 'Opus', rateFromLegacyField: false, sampleRateHz: 48000 },
    21: { name: 'FLAC', rateFromLegacyField: false, sampleRateHz: null },
});

/** Legacy FLV VideoCodecId ids plus the E-RTMP extensions. */
export const FLV_VIDEO_CODEC = Object.freeze({
    0: { name: 'reserved' },
    1: { name: 'JPEG' },
    2: { name: 'Sorenson H.263' },
    3: { name: 'Screen video' },
    4: { name: 'On2 VP6' },
    5: { name: 'On2 VP6 (alpha)' },
    6: { name: 'Screen video v2' },
    7: { name: 'AVC (H.264)' },
    8: { name: 'HEVC (draft)' },
    9: { name: 'HEVC' },
    10: { name: 'AV1 (draft)' },
    11: { name: 'VP9 (draft)' },
    12: { name: 'HEVC' },
    13: { name: 'AV1' },
    14: { name: 'VP9' },
});

/** Legacy AudioSoundRate table (§E.4.3.1). */
export const FLV_SOUND_RATE_HZ = Object.freeze([5512, 11025, 22050, 44100]);

/** Legacy AudioSoundSize: 0 = 8-bit, 1 = 16-bit. */
export const FLV_SOUND_SIZE_BITS = Object.freeze([8, 16]);

/**
 * Summarize audio tags.
 * @param {Array<{byteLength:number, soundFormat:number, soundRate:number, soundSize:number, soundType:number, dts:number}>} tags
 */
export function summarizeAudio(tags) {
    const list = Array.isArray(tags) ? tags : [];
    const formats = {};
    let bytes = 0;
    for (const t of list) {
        bytes += Number(t.byteLength) || 0;
        const id = Number(t.soundFormat) || 0;
        const info = FLV_SOUND_FORMAT[id];
        const entry = (formats[id] ??= {
            id,
            name: info ? info.name : `unknown (${id})`,
            count: 0,
            bytes: 0,
            channels: Number(t.soundType) === 0 ? 1 : 2,
            bits: FLV_SOUND_SIZE_BITS[Number(t.soundSize)] ?? null,
            sampleRateHz: info?.rateFromLegacyField
                ? (FLV_SOUND_RATE_HZ[Number(t.soundRate)] ?? null)
                : (info?.sampleRateHz ?? null),
        });
        entry.count += 1;
        entry.bytes += Number(t.byteLength) || 0;
    }
    return { count: list.length, bytes, formats };
}

/**
 * Summarize video tags: codec inventory, frame-type mix and keyframe timing.
 * @param {Array<{byteLength:number, frameType:number, codecId:number, dts:number}>} tags
 */
export function summarizeVideo(tags) {
    const all = Array.isArray(tags) ? tags : [];
    const list = all.filter((t) => t && t.codecId !== undefined);
    const codecs = {};
    let bytes = 0;
    let keyframes = 0;
    let interFrames = 0;
    let keyframeDtsMs = [];
    for (const t of list) {
        bytes += Number(t.byteLength) || 0;
        const id = Number(t.codecId);
        const info = FLV_VIDEO_CODEC[id];
        const entry = (codecs[id] ??= {
            id,
            name: info ? info.name : `unknown (${id})`,
            count: 0,
            bytes: 0,
        });
        entry.count += 1;
        entry.bytes += Number(t.byteLength) || 0;
        if (Number(t.frameType) === 1) {
            keyframes += 1;
            keyframeDtsMs.push(Number(t.dts) || 0);
        } else {
            interFrames += 1;
        }
    }
    keyframeDtsMs.sort((a, b) => a - b);
    return {
        count: list.length,
        bytes,
        keyframes,
        interFrames,
        codecs,
        keyframeDtsMs,
    };
}

/** Median keyframe interval in ms — the GOP proxy for the monitor. */
export function keyframeIntervalMs(keyframeDtsMs) {
    if (!Array.isArray(keyframeDtsMs) || keyframeDtsMs.length < 2) return null;
    const gaps = [];
    for (let i = 1; i < keyframeDtsMs.length; i++) {
        gaps.push(Math.max(0, keyframeDtsMs[i] - keyframeDtsMs[i - 1]));
    }
    gaps.sort((a, b) => a - b);
    const mid = gaps.length >> 1;
    return gaps.length % 2 === 1
        ? gaps[mid]
        : Math.round((gaps[mid - 1] + gaps[mid]) / 2);
}

/** Bytes over a millisecond window, expressed in kbps. */
export function deriveBitrateKbps(bytes, windowMs) {
    const b = Number(bytes);
    const ms = Number(windowMs);
    if (!(b > 0) || !(ms > 0)) return 0;
    return (b * 8) / ms; // bytes*8 / ms = kbps
}
