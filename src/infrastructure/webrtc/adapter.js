// WebRTC transport adapter (roadmap Phase 5, analysis doc §3.3).
//
// Native browser path: WHEP to receive, RTCPeerConnection.getStats() for
// telemetry. The pure part (normalizeWebrtcStats) maps the browser's stats
// shapes onto the SAME LinkTelemetry schema the SRT helper and (later) the
// WebTransport adapter emit, so the SRT Monitor's charts, rules, and export
// work unchanged across transports.
//
// The network part (connect/disconnect/poll) is separated from the pure
// normalizer so it is contract-testable without a live WHEP server.

/** @typedef {{t:number, rttMs:number, mbpsRecv:number, mbpsSend:number, pktRecv:number, pktRecvLost:number, pktRetrans:number, jitterMs:number|null, nackCount:number|null, pliCount:number|null, availKbps:number|null, dtlsState:string|null, selectedPair:string|null, encrypted:boolean}} WebRtcSample */

const finite = (v, fallback = 0) =>
    Number.isFinite(Number(v)) ? Number(v) : fallback;

/**
 * Coerce any getStats() container (Map, RTCStatsReport-like, array, or a
 * plain object of reports) into an array of entries.
 *
 * @param {Map<string, any> | RTCStatsReport | any[] | Record<string, any>} stats
 * @returns {any[]}
 */
function statsEntries(stats) {
    if (stats instanceof Map || typeof stats?.values === 'function') {
        return [...stats.values()].filter(Boolean);
    }
    if (Array.isArray(stats)) return stats.filter(Boolean);
    // Plain-object reports (non-Map producers): read their values.
    if (stats && typeof stats === 'object') {
        return Object.values(stats).filter(Boolean);
    }
    return [];
}

/**
 * Normalize a getStats() snapshot onto the LinkTelemetry schema used by the
 * SRT adapter.
 *
 * @param {Map<string, any> | RTCStatsReport | any[] | Record<string, any>} stats
 * @param {{t?: number}} [options]
 * @returns {WebRtcSample}
 */
export function normalizeWebrtcStats(stats, options = {}) {
    const reports = statsEntries(stats);
    const byType = (type) => reports.filter((r) => r?.type === type);

    const inboundRtp = byType('inbound-rtp');
    const remoteInbound = byType('remote-inbound-rtp');
    const outboundRtp = byType('outbound-rtp');
    const candidatePair =
        byType('candidate-pair').find(
            (c) => c.nominated && c.state === 'succeeded'
        ) ??
        byType('candidate-pair').find((c) => c.state === 'succeeded') ??
        null;
    const transport = byType('transport')[0] ?? null;
    const selectedTransport = transport?.selectedCandidatePairId
        ? byType('candidate-pair').find(
              (p) => p.id === transport.selectedCandidatePairId
          )
        : null;
    const pair = candidatePair ?? selectedTransport ?? null;

    const pktRecv = inboundRtp.reduce(
        (sum, r) => sum + finite(r.packetsReceived),
        0
    );
    // A WHEP *receiver* sees its own loss on inbound-rtp.packetsLost; the
    // server's view (remote-inbound-rtp) is often absent. Prefer the local
    // view, fall back to the remote one.
    const pktLost =
        inboundRtp.length > 0
            ? inboundRtp.reduce((sum, r) => sum + finite(r.packetsLost), 0)
            : remoteInbound.reduce((sum, r) => sum + finite(r.packetsLost), 0);
    const nackCount = (() => {
        const values = [...inboundRtp, ...remoteInbound]
            .map((r) => (Number.isFinite(r.nackCount) ? r.nackCount : null))
            .filter((v) => v !== null);
        return values.length ? values.reduce((a, b) => a + b, 0) : null;
    })();
    const pliCount = (() => {
        const values = inboundRtp
            .map((r) => (Number.isFinite(r.pliCount) ? r.pliCount : null))
            .filter((v) => v !== null);
        return values.length ? values.reduce((a, b) => a + b, 0) : null;
    })();

    const bitrateBps = (arr) => {
        // Prefer reported bitrate accumulators when the browser provides
        // totalAudioEnergy-free raw fields; fall back to bytesReceived/sent.
        let bits = 0;
        for (const r of arr) {
            bits += finite(r.bitrateMean ?? 0) * 1000; // kbps → bps
        }
        if (bits === 0) {
            for (const r of arr) {
                bits +=
                    (finite(r.bytesReceived, 0) + finite(r.bytesSent, 0)) * 8;
            }
        }
        return bits;
    };

    return {
        t: finite(options.t, Date.now()),
        // SRT-schema parity: rtt lives in ms; getStats gives seconds.
        rttMs:
            pair?.currentRoundTripTime != null
                ? finite(pair.currentRoundTripTime * 1000)
                : remoteInbound[0]?.roundTripTime != null
                  ? finite(remoteInbound[0].roundTripTime * 1000)
                  : 0,
        mbpsRecv: Math.round((bitrateBps(inboundRtp) / 1048576) * 100) / 100,
        mbpsSend: Math.round((bitrateBps(outboundRtp) / 1048576) * 100) / 100,
        pktRecv,
        pktRecvLost: pktLost,
        // WebRTC has no packet-level retransmission stat; NACKs are the proxy.
        pktRetrans: nackCount ?? 0,
        jitterMs:
            inboundRtp[0]?.jitter != null
                ? Math.round(finite(inboundRtp[0].jitter * 1000, 0) * 100) / 100
                : null,
        nackCount,
        pliCount,
        availKbps:
            pair?.availableOutgoingBitrate != null
                ? Math.round(finite(pair.availableOutgoingBitrate / 1000))
                : null,
        dtlsState: transport?.dtlsState ?? null,
        selectedPair: pair
            ? `${pair.localCandidateId ?? '?'}↔${pair.remoteCandidateId ?? '?'}`
            : null,
        // All WHEP media travels SRTP; treat connected transports as encrypted.
        encrypted: transport?.dtlsState === 'connected',
    };
}

/**
 * Connect a WHEP session and stream normalized samples.
 *
 * @param {string} whepUrl      e.g. http://host:8889/live/whep
 * @param {object} [options]
 * @param {typeof globalThis.RTCPeerConnection} [options.RTCPeerConnection]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {(sample: WebRtcSample) => void} [options.onSample]
 * @param {(event: string, detail?: any) => void} [options.onState]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{close: () => Promise<void>, pc: RTCPeerConnection}>}
 */
export async function connectWhep(whepUrl, options = {}) {
    const PeerConnection =
        options.RTCPeerConnection ?? globalThis.RTCPeerConnection;
    const fetchImpl = options.fetchImpl ?? fetch;
    const onSample = options.onSample;
    const onState = options.onState ?? (() => {});

    if (!PeerConnection) throw new Error('WebRTC unsupported in this browser');

    const pc = new PeerConnection({
        iceServers: [], // homelab/ingest endpoint: no STUN by default
    });
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    onState('subscribing');
    const resp = await fetchImpl(whepUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
    });
    if (!resp.ok) {
        throw new Error(`WHEP endpoint returned ${resp.status}`);
    }
    const answer = await resp.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answer });
    onState('subscribed');

    let stopped = false;
    const timer = setInterval(async () => {
        if (stopped) return;
        try {
            const stats = await pc.getStats();
            onSample(normalizeWebrtcStats(stats));
        } catch {
            /* transient: keep polling */
        }
    }, 1000);

    const close = async () => {
        stopped = true;
        clearInterval(timer);
        try {
            pc.close();
        } catch {
            /* already closed */
        }
    };
    options.signal?.addEventListener('abort', close, { once: true });
    return { close, pc };
}

// --- WHIP publish (RFC 9725) ----------------------------------------------------

/**
 * Normalize a publish-side getStats() snapshot (outbound-rtp plus the
 * server's remote-inbound-rtp feedback) onto the LinkTelemetry schema.
 *
 * @param {Map<string, any> | RTCStatsReport | any[] | Record<string, any>} stats
 * @param {{t?: number}} [options]
 * @returns {{t:number, rttMs:number, mbpsSend:number, pktSent:number, pktLost:number, nackCount:number|null, jitterMs:number|null, qualityLimitation:string|null, dtlsState:string|null, selectedPair:string|null, encrypted:boolean}}
 */
export function normalizePublishStats(stats, options = {}) {
    const reports = statsEntries(stats);
    const byType = (type) => reports.filter((r) => r?.type === type);

    const outbound = byType('outbound-rtp');
    const remoteInbound = byType('remote-inbound-rtp');
    const transport = byType('transport')[0] ?? null;

    const pktSent = outbound.reduce((sum, r) => sum + finite(r.packetsSent), 0);
    const bytesSent = outbound.reduce((sum, r) => sum + finite(r.bytesSent), 0);
    const pktLost = remoteInbound.reduce(
        (sum, r) => sum + finite(r.packetsLost),
        0
    );

    const nacks = remoteInbound
        .map((r) => (Number.isFinite(r.nackCount) ? r.nackCount : null))
        .filter((v) => v !== null);
    const pair =
        reports.find(
            (r) => r.type === 'candidate-pair' && r.state === 'succeeded'
        ) ?? null;
    const rttSource =
        pair?.currentRoundTripTime ?? remoteInbound[0]?.roundTripTime ?? null;

    return {
        t: finite(options.t, Date.now()),
        // RTT is the server's view of the round trip (seconds → ms).
        rttMs: rttSource != null ? finite(rttSource * 1000) : 0,
        mbpsSend: Math.round((bytesSent / 1048576) * 100) / 100,
        pktSent,
        pktLost,
        nackCount: nacks.length ? nacks.reduce((a, b) => a + b, 0) : null,
        jitterMs:
            remoteInbound[0]?.jitter != null
                ? Math.round(finite(remoteInbound[0].jitter * 1000, 0) * 100) /
                  100
                : null,
        qualityLimitation: outbound[0]?.qualityLimitationReason ?? null,
        dtlsState: transport?.dtlsState ?? null,
        selectedPair: pair
            ? `${pair.localCandidateId ?? '?'}↔${pair.remoteCandidateId ?? '?'}`
            : null,
        encrypted: transport?.dtlsState === 'connected',
    };
}

/**
 * Connect a WHIP session (RFC 9725) and publish local tracks.
 *
 * @param {string} whipUrl            WHEP-style endpoint, e.g. http://host:8889/live/whip
 * @param {object} [options]
 * @param {typeof globalThis.RTCPeerConnection} [options.RTCPeerConnection]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {MediaStream} [options.mediaStream] tracks to publish (required in the browser)
 * @param {(sample: ReturnType<typeof normalizePublishStats>) => void} [options.onSample]
 * @param {(state: string) => void} [options.onState]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{close: () => Promise<void>, pc: RTCPeerConnection}>}
 */
export async function connectWhip(whipUrl, options = {}) {
    const PeerConnection =
        options.RTCPeerConnection ?? globalThis.RTCPeerConnection;
    const fetchImpl = options.fetchImpl ?? fetch;
    const onSample = options.onSample;
    const onState = options.onState ?? (() => {});
    if (!PeerConnection) throw new Error('WebRTC unsupported in this browser');

    const pc = new PeerConnection({
        iceServers: [], // ingest endpoint: no STUN by default
    });
    pc.addTransceiver('video', { direction: 'sendonly' });
    pc.addTransceiver('audio', { direction: 'sendonly' });

    const tracks = options.mediaStream?.getTracks?.() ?? [];
    if (tracks.length > 0) {
        for (const track of tracks) {
            const kind = track.kind === 'audio' ? 'audio' : 'video';
            const senders = /** @type {any[]} */ (pc.getSenders());
            const sender =
                senders.find(
                    (s) =>
                        s.track == null &&
                        s.transceiver?.receiver?.track?.kind === kind
                ) ??
                senders.find(
                    (s) => s.transceiver?.receiver?.track?.kind === kind
                );
            if (sender) void sender.replaceTrack(track);
        }
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    onState('publishing');
    const resp = await fetchImpl(whipUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
    });
    if (!resp.ok) {
        const body = (await resp.text?.().catch?.(() => '')) ?? '';
        throw new Error(
            `WHIP endpoint returned ${resp.status}${body ? `: ${body.slice(0, 120)}` : ''}`
        );
    }
    const answer = await resp.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answer });
    onState('published');

    let stopped = false;
    const timer = setInterval(async () => {
        if (stopped || !onSample) return;
        try {
            onSample(normalizePublishStats(await pc.getStats()));
        } catch {
            /* transient: keep polling */
        }
    }, 1000);

    const close = async () => {
        stopped = true;
        clearInterval(timer);
        try {
            pc.close();
        } catch {
            /* already closed */
        }
    };
    options.signal?.addEventListener('abort', close, { once: true });
    return { close, pc };
}
