// RTMP telemetry domain: normalization of helper samples into bounded UI
// records and the RTMP rule family. Links onto the shared LinkTelemetry
// contract — RTMP has no RTT or loss channel (TCP hides it; only the C1/S1
// time fields give a one-shot estimate), so those entries stay null with a
// documented reason instead of a fake zero. Pure functions, heux-contract
// tested. See ai/rtmp-integration-analysis.md §3.

export const RTMP_LIMITS = Object.freeze({
    maxSeries: 1800, // 30 min at 1 Hz
    mbps: 1_000_000,
    windowAckDefault: 2_500_000,
});

export const RTMP_RULE_IDS = Object.freeze({
    NO_MEDIA: 'rtmp.no-media',
    MEDIA_STALL: 'rtmp.media-stall',
    CHUNK_SIZE_DEFAULT: 'rtmp.chunk-size-untuned',
    WINDOW_ACK_MISSING: 'rtmp.window-ack-missing',
    NO_METADATA: 'rtmp.no-metadata',
    HANDSHAKE_SLOW: 'rtmp.handshake-slow',
});

/**
 * Normalize one raw helper sample into a bounded UI record with the
 * LinkTelemetry shape the shared monitor/rules/export pipeline expects.
 * @param {Record<string, unknown>} raw
 */
export function normalizeRtmpTelemetry(raw) {
    const t = Number(raw.t ?? 0);
    const num = (k, max = Number.MAX_SAFE_INTEGER) => {
        const v = Number(raw[k] ?? 0);
        return Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : 0;
    };
    return {
        t: Number.isFinite(t) ? Math.max(0, t) : 0,
        // Honest nulls: RTMP exposes neither RTT nor loss.
        rttMs: null,
        rttMsReason:
            'RTMP has no RTT channel; the C1/S1 handshake time fields give a one-shot estimate only (see rtmp.handshakeRttMs)',
        pktRecvLost: null,
        lossRate: null,
        mbpsRecv: num('mbpsRecvRate', RTMP_LIMITS.mbps),
        mbpsSend: num('mbpsSendRate', RTMP_LIMITS.mbps),
        msRecvBuf: null,
        msRecvBufReason: 'relay-side buffering is not visible over RTMP',
        rtmp: {
            bytesRecvTotal: num('bytesRecvTotal'),
            bytesSentTotal: num('bytesSentTotal'),
            chunkCount: num('chunkCount'),
            messageCount: num('messageCount'),
            audioTags: num('audioTags'),
            videoTags: num('videoTags'),
            scriptTags: num('scriptTags'),
            metadataObjects: num('metadataObjects'),
            ackSequence: num('ackSequence'),
            windowAckSize: num('windowAckSize'),
            peerBandwidth: num('peerBandwidth'),
            negotiatedChunkSize: num('negotiatedChunkSize'),
            handshakeRttMs:
                raw.handshakeRttMs == null ? null : num('handshakeRttMs'),
        },
    };
}

/**
 * RTMP rule family: compares two consecutive samples and fires on the
 * documented failure modes.
 * @param {ReturnType<typeof normalizeRtmpTelemetry>} prev
 * @param {ReturnType<typeof normalizeRtmpTelemetry>} cur
 */
export function rtmpAlerts(prev, cur) {
    const out = [];
    const prevRtmp = prev?.rtmp;
    const prevTags = prevRtmp ? prevRtmp.audioTags + prevRtmp.videoTags : 0;
    const curTags = cur.rtmp.audioTags + cur.rtmp.videoTags;
    const delta = curTags - prevTags;

    if (curTags === 0) {
        out.push({
            id: RTMP_RULE_IDS.NO_MEDIA,
            level: 'warn',
            message: 'no audio/video tags received yet',
        });
    } else if (delta === 0 && cur.t > (prev?.t ?? 0)) {
        out.push({
            id: RTMP_RULE_IDS.MEDIA_STALL,
            level: 'fail',
            message: 'tag counters stopped moving — the stream stalled',
        });
    }

    if (cur.rtmp.negotiatedChunkSize === 128) {
        out.push({
            id: RTMP_RULE_IDS.CHUNK_SIZE_DEFAULT,
            level: 'info',
            message:
                'chunk size still at the 128-byte default; a publisher can raise it to cut overhead',
        });
    }
    if (cur.rtmp.windowAckSize === 0) {
        out.push({
            id: RTMP_RULE_IDS.WINDOW_ACK_MISSING,
            level: 'info',
            message: 'no acknowledgement window negotiated',
        });
    }
    if (cur.rtmp.scriptTags === 0 && curTags === 0) {
        out.push({
            id: RTMP_RULE_IDS.NO_METADATA,
            level: 'info',
            message: 'no script tags (onMetaData) seen yet',
        });
    }
    return out;
}
