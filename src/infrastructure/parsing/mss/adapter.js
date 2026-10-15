// MSS client manifest → IR adapter. Produces the shape the DASH path produces
// (periods → adaptationSets → representations) so downstream consumers treat
// MSS like any other manifest protocol, while keeping MSS-only detail
// (fragment timeline, URL template, QualityLevel codec strings) under
// `smoothStreaming` for the MSS-specific views.

const attrs = (el) => el?.[':@'] ?? {};
const children = (el, name) => {
    const v = el?.[name];
    if (v === undefined) return [];
    return Array.isArray(v) ? v : [v];
};
const child = (el, name) => children(el, name)[0] ?? null;
const num = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};
const int = (v) => {
    const n = num(v);
    return n === null ? null : Math.trunc(n);
};

/** MSS timescale ticks per second; the spec default. */
const DEFAULT_TIMESCALE = 10_000_000;

/**
 * FourCC → codecString. MSS uses FourCC plus CodecPrivateData; the codec string
 * is derived here so the UI shows the same codec labels as DASH/HLS.
 */
export function mssCodecString(fourCC, codecPrivateData) {
    const cc = String(fourCC ?? '').toUpperCase();
    const cpd = codecPrivateData ? String(codecPrivateData) : null;

    if (cc === 'H264' || cc === 'AVC1') {
        // CodecPrivateData is an AVCDecoderConfigurationRecord.
        const fromRecord = avcCodecFromRecord(cpd);
        return fromRecord ?? 'avc1';
    }
    if (cc === 'HEV1' || cc === 'HVC1' || cc === 'HEVC') {
        return cc === 'HVC1' ? 'hvc1' : 'hev1';
    }
    if (cc === 'AV01' || cc === 'AV1') return 'av01';
    if (cc === 'VP09' || cc === 'VP9') return 'vp09';
    if (cc === 'AACL' || cc === 'MP4A') {
        // CodecPrivateData is the AudioSpecificConfig (hex).
        const asc = aacCodecFromConfig(cpd);
        return asc ?? 'mp4a.40.2';
    }
    if (cc === 'EC-3') return 'ec-3';
    if (cc === 'AC-3') return 'ac-3';
    if (cc === 'OPUS') return 'opus';
    if (cc === 'FLAC') return 'f-lac';
    if (cc === 'TX3G' || cc === 'STPP') return 'stpp.ttml.im1t';
    return cc || 'unknown';
}

/**
 * avc1.PPCCLL from the H.264 parameter set blob MSS stores in CodecPrivateData.
 *
 * Two layouts exist in the wild and both are seen on live manifests:
 *   - AVCDecoderConfigurationRecord: `01 <profile> <compat> <level> …`
 *   - length-prefixed Annex-B:        `00000001 67 <profile> <compat> <level> …`
 *     (SPS NAL, as IIS/Wowza-style servers emit)
 *
 * @param {string|null} hex
 * @returns {string|null}
 */
export function avcCodecFromRecord(hex) {
    if (!hex || typeof hex !== 'string' || !/^[0-9a-fA-F]+$/.test(hex))
        return null;
    const b = (from) => parseInt(hex.slice(from, from + 2), 16);
    let profile;
    let compat;
    let level;
    if (hex.slice(0, 8).toLowerCase() === '00000001') {
        // 4-byte length prefix, then the SPS NAL header (0x67/0x6F), then the
        // profile_indication / constraint flags / level_idc triple.
        if (hex.length < 16) return null;
        profile = b(10);
        compat = b(12);
        level = b(14);
    } else {
        // configurationVersion 0x01, then profile/compat/level.
        if (hex.length < 8) return null;
        if (b(0) !== 0x01) return null;
        profile = b(2);
        compat = b(4);
        level = b(6);
    }
    if (![profile, compat, level].every((v) => Number.isFinite(v))) return null;
    const hex2 = (v) => v.toString(16).padStart(2, '0');
    return `avc1.${hex2(profile)}${hex2(compat)}${hex2(level)}`;
}

/**
 * mp4a.40.X from an AudioSpecificConfig (hex, as in CodecPrivateData).
 * @param {string|null} hex
 * @returns {string|null}
 */
export function aacCodecFromConfig(hex) {
    if (!hex || typeof hex !== 'string' || hex.length < 4) return null;
    if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
    const bits = parseInt(hex.slice(0, 4), 16);
    if (!Number.isFinite(bits) || bits <= 0) return null;
    const audioObjectType = (bits >> 11) & 0x1f;
    return `mp4a.40.${audioObjectType}`;
}

const SAMPLE_RATES = [
    96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025,
    8000, 7350,
];

/** Sampling-rate index from an AudioSpecificConfig (for cross-checking). */
export function aacSampleRateIndex(hex) {
    if (!hex || hex.length < 4) return null;
    const bits = parseInt(hex.slice(0, 4), 16);
    const idx = (bits >> 7) & 0x0f;
    return SAMPLE_RATES[idx] ?? null;
}

/**
 * Expand the `c` (chunk) elements of a StreamIndex into a fragment timeline.
 *
 * `n` is the fragment number (ordinal), `d` the duration in TimeScale ticks,
 * `t` an optional absolute timestamp, `r` a repeat count (the previous chunk
 * repeats r+1 times, like a DASH SegmentTimeline run). Missing `t` is derived
 * by accumulating `d`; missing `n` is derived from order.
 *
 * @param {Array<object>} chunkEls `c` elements
 * @returns {{fragments: Array<{n:number, t:number, d:number, repeated:boolean}>, totalDuration:number, hasExplicitStartTimes:boolean}}
 */
export function expandChunkTimeline(chunkEls) {
    const fragments = [];
    let t = 0;
    let n = 0;
    let hasExplicitStartTimes = false;

    for (const el of chunkEls) {
        const a = attrs(el);
        if (a.t !== undefined) hasExplicitStartTimes = true;
        const d = int(a.d) ?? 0;
        const repeat = Math.max(0, int(a.r) ?? 0);
        const startT = a.t !== undefined ? (int(a.t) ?? t) : t;
        const startN = a.n !== undefined ? (int(a.n) ?? n) : n;
        for (let i = 0; i <= repeat; i++) {
            fragments.push({
                n: startN + i,
                t: startT + i * d,
                d,
                repeated: repeat > 0 && i > 0,
            });
        }
        t = startT + (repeat + 1) * d;
        n = startN + repeat + 1;
    }

    return { fragments, totalDuration: t, hasExplicitStartTimes };
}

/**
 * Expand a StreamIndex `Url` template into a concrete fragment URL.
 *
 * Templates seen in the wild:
 *   QualityLevels({bitrate})/Fragments(video={start time})
 *   QualityLevels({bitrate})/Fragments(audio_eng={start time})   (name-qualified)
 *   QualityLevels({bitrate})/Fragments(video={start_time})      (ExoPlayer quirk)
 *
 * @param {string} template
 * @param {{bitrate: number, startTime: number}} vars
 * @returns {string}
 */
export function expandFragmentUrl(template, { bitrate, startTime }) {
    if (!template) return '';
    return template
        .replace(/\{bitrate\}/g, String(bitrate))
        .replace(/\{start[ _]time\}/g, String(startTime));
}

/**
 * Adapt a parsed SmoothStreamingMedia element to the IR.
 * @param {object} root parsed `<SmoothStreamingMedia>` element
 * @param {string} baseUrl
 */
export function adaptMssToIr(root, baseUrl) {
    const a = attrs(root);
    const timeScale = int(a.TimeScale) ?? DEFAULT_TIMESCALE;
    const durationTicks = int(a.Duration) ?? 0;
    const isLive = String(a.IsLive ?? '').toUpperCase() === 'TRUE';
    const dvrTicks = int(a.DVRWindowLength) ?? 0;

    const streamEls = children(root, 'StreamIndex');
    const adaptationSets = streamEls.map((el, i) =>
        adaptStreamIndex(el, i, timeScale, baseUrl)
    );

    // Cross-check every stream's fragment timeline against the declared
    // Duration. Real manifests disagree (DirectTaps: 61 chunks × 20020000 =
    // 122.12 s vs Duration 120.95 s) — the analyzer's job is to surface that.
    const streamDurations = adaptationSets.map((s) => ({
        id: s.id,
        contentType: s.contentType,
        timelineTicks: s.smoothStreaming.fragmentTimeline.totalDuration,
        timelineSeconds:
            s.smoothStreaming.fragmentTimeline.totalDuration / timeScale,
    }));

    const protection = child(root, 'Protection');
    const contentProtections = protection
        ? children(protection, 'ProtectionHeader').map((h) => ({
              schemeIdUri:
                  'urn:uuid:' +
                  String(attrs(h).SystemID ?? '')
                      .replace(/[{}]/g, '')
                      .toLowerCase(),
              system: 'PlayReady',
          }))
        : [];

    return {
        id: null,
        // MSS has no explicit dynamic/static marker; IsLive + LookaheadCount are it.
        type: isLive ? 'dynamic' : 'static',
        profiles: null,
        minBufferTime: null,
        publishTime: null,
        availabilityStartTime: null,
        availabilityEndTime: null,
        timeShiftBufferDepth: dvrTicks > 0 ? dvrTicks / timeScale : null,
        minimumUpdatePeriod: null,
        duration: durationTicks / timeScale,
        maxSegmentDuration: null,
        suggestedPresentationDelay: null,
        programInformations: [],
        baseUrls: [],
        periods: [
            {
                id: 'p0',
                start: 0,
                duration: durationTicks / timeScale,
                adaptationSets,
            },
        ],
        segmentFormat: 'isobmff', // MSS fragments are PIFF/fragmented MP4
        contentProtections,
        smoothStreaming: {
            majorVersion: int(a.MajorVersion),
            minorVersion: int(a.MinorVersion),
            timeScale,
            durationTicks,
            isLive,
            lookaheadCount: int(a.LookaheadCount),
            dvrWindowLength: dvrTicks / timeScale,
            canSeek: String(a.CanSeek ?? '').toUpperCase() === 'TRUE' || null,
            canPause: String(a.CanPause ?? '').toUpperCase() === 'TRUE' || null,
            customAttributes: children(root, 'CustomAttributes').flatMap((ca) =>
                children(ca, 'Attribute').map((at) => ({
                    name: String(attrs(at).Name ?? ''),
                    value: String(attrs(at).Value ?? ''),
                }))
            ),
            streamDurations,
            declaredDurationTicks: durationTicks,
            timelineDurationMismatchTicks:
                streamDurations.length > 0
                    ? Math.max(
                          ...streamDurations.map((s) =>
                              Math.abs(s.timelineTicks - durationTicks)
                          )
                      )
                    : 0,
        },
    };
}

/** One `<StreamIndex>` → AdaptationSet (+ the MSS-specific timeline/URL model). */
function adaptStreamIndex(el, index, rootTimeScale, baseUrl) {
    const a = attrs(el);
    const type = String(a.Type ?? '');
    const contentType =
        type === 'text'
            ? 'text'
            : type === 'audio'
              ? 'audio'
              : type === 'video'
                ? 'video'
                : 'application';
    const timeScale = int(a.TimeScale) ?? rootTimeScale;
    const url = a.Url ? String(a.Url) : null;

    const qualityLevels = children(el, 'QualityLevel').map((q) =>
        adaptQualityLevel(q, contentType)
    );

    const chunkEls = children(el, 'c');
    const timeline = expandChunkTimeline(chunkEls);

    const bitrates = qualityLevels.map((r) => r.bandwidth).filter((b) => b > 0);
    const mimeType =
        contentType === 'video'
            ? 'video/mp4'
            : contentType === 'audio'
              ? 'audio/mp4'
              : contentType === 'text'
                ? 'application/mp4'
                : null;

    return {
        id: a.Name ? String(a.Name) : `${type || 'stream'}-${index}`,
        format:
            contentType === 'video'
                ? 'AVC'
                : contentType === 'audio'
                  ? 'AAC'
                  : contentType === 'text'
                    ? 'TTML'
                    : null,
        group: index,
        lang: a.Language ? String(a.Language) : null,
        contentType,
        bitstreamSwitching: null,
        segmentAlignment: true,
        subsegmentAlignment: null,
        subsegmentStartsWithSAP: null,
        width: num(a.DisplayWidth) ?? num(a.MaxWidth) ?? null,
        height: num(a.DisplayHeight) ?? num(a.MaxHeight) ?? null,
        maxWidth: num(a.MaxWidth),
        maxHeight: num(a.MaxHeight),
        maxFrameRate: null,
        sar: null,
        maximumSAPPeriod: null,
        audioSamplingRate:
            qualityLevels.find((r) => r.audioSamplingRate != null)
                ?.audioSamplingRate ?? null,
        mimeType,
        profiles: null,
        representations: qualityLevels,
        contentProtection: [],
        // MSS-only model, kept for the Smooth Streaming views.
        smoothStreaming: {
            subtype: a.Subtype ? String(a.Subtype) : null,
            name: a.Name ? String(a.Name) : null,
            url,
            chunkCount: int(a.Chunks) ?? chunkEls.length,
            qualityLevelCount: int(a.QualityLevels) ?? qualityLevels.length,
            timeScale,
            minBitrate: bitrates.length ? Math.min(...bitrates) : null,
            maxBitrate: bitrates.length ? Math.max(...bitrates) : null,
            bitrateLadder: bitrates.sort((x, y) => x - y),
            fragmentTimeline: timeline,
            baseUrl,
        },
    };
}

/** One `<QualityLevel>` → Representation. */
function adaptQualityLevel(q, contentType) {
    const a = attrs(q);
    const bitrate = int(a.Bitrate) ?? 0;
    const fourCC = a.FourCC ? String(a.FourCC) : null;
    const codecPrivateData = a.CodecPrivateData
        ? String(a.CodecPrivateData)
        : null;
    const codecString = mssCodecString(fourCC, codecPrivateData);

    return {
        id: String(a.Index ?? '0'),
        label: null,
        format: fourCC,
        bandwidth: bitrate,
        qualityRanking: null,
        dependencyId: null,
        associationId: null,
        associationType: null,
        mimeType:
            contentType === 'video'
                ? 'video/mp4'
                : contentType === 'audio'
                  ? 'audio/mp4'
                  : null,
        codecs: codecString,
        width: contentType === 'video' ? (int(a.MaxWidth) ?? null) : null,
        height: contentType === 'video' ? (int(a.MaxHeight) ?? null) : null,
        frameRate: null,
        sar: null,
        audioSamplingRate:
            contentType === 'audio' ? (int(a.SamplingRate) ?? null) : null,
        numChannels: contentType === 'audio' ? (int(a.Channels) ?? null) : null,
        bitsPerSample:
            contentType === 'audio' ? (int(a.BitsPerSample) ?? null) : null,
        packetSize:
            contentType === 'audio' ? (int(a.PacketSize) ?? null) : null,
        audioTag: a.AudioTag !== undefined ? int(a.AudioTag) : null,
        fourCC,
        codecPrivateData,
        segmentTemplate: null,
        smoothStreaming: {
            codecPrivateDataDerived: codecString,
            aacSampleRateFromConfig:
                contentType === 'audio'
                    ? aacSampleRateIndex(codecPrivateData)
                    : null,
        },
    };
}
