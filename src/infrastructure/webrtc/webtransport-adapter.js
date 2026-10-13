// WebTransport transport adapter (capability plan Tier-3 #11).
//
// WebTransport (HTTP/3/QUIC) is browser-native — the second transport class
// in the roadmap (analysis doc §3.3). Unlike WebRTC, the browser exposes no
// connection statistics API: no RTT, no loss counters. This adapter is
// honest about that: it supplies what EXISTS (JS-level byte/datagram
// counters, datagram loss is not observable) and leaves LinkTelemetry fields
// null with a documented reason instead of inventing values.
//
// MoQ note: the WebTransport stream/datagram wiring here is the substrate a
// MoQ subscription layer would ride on; no MoQ catalog parsing is attempted.

const REASON_NO_RTT =
    'WebTransport exposes no RTT statistic (QUIC qlog not available in-browser)';

/**
 * Normalize JS-level WebTransport counters onto LinkTelemetry.
 *
 * @param {{bytesReceived:number, datagramsReceived:number, bytesInterval:number, datagramsInterval:number, intervalMs:number}} c
 * @param {object} [options]
 * @returns {object} LinkTelemetry-shaped sample with nulls + reasons
 */
export function normalizeWebTransportStats(c, options = {}) {
    const bits = Number(c.bytesInterval ?? 0) * 8;
    const mbps = c.intervalMs > 0 ? bits / 1048576 / (c.intervalMs / 1000) : 0;
    return {
        t: Number(options.t ?? Date.now()),
        rttMs: null,
        rttMsReason: REASON_NO_RTT,
        mbpsSend: 0,
        mbpsRecv: Math.round(mbps * 100) / 100,
        mbpsLink: null,
        pktRecv: Number(c.datagramsReceived ?? 0),
        pktRecvUnique: null,
        pktRecvLost: null,
        pktRecvLostReason:
            'WebTransport datagram loss is not observable from the API',
        pktRetrans: null,
        pktRetransReason: REASON_NO_RTT,
        pktRecvDrop: null,
        pktRecvBelated: null,
        pktRecvUndecrypt: null,
        msRecvBuf: null,
        msSendBuf: null,
        msRcvTsbpdDelay: null,
        msSndTsbpdDelay: null,
        lossRate: null,
        encrypted: true, // WebTransport is always TLS (QUIC)
        encryptedReason: 'QUIC mandates TLS 1.3',
    };
}

/**
 * Connect a WebTransport session and stream received bytes.
 *
 * @param {string} url                 https://host:port/path
 * @param {object} [options]
 * @param {typeof globalThis.WebTransport} [options.WebTransportImpl]
 * @param {(chunk: Uint8Array) => void} [options.onData]
 * @param {(sample: object) => void} [options.onSample]
 * @param {(state: string) => void} [options.onState]
 * @param {boolean} [options.useDatagrams] prefer the datagram duct (unreliable)
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{close: () => Promise<void>, transport: object}>}
 */
export async function connectWebTransport(url, options = {}) {
    const WT = options.WebTransportImpl ?? globalThis.WebTransport;
    if (!WT) throw new Error('WebTransport unsupported in this browser');
    const onData = options.onData;
    const onState = options.onState ?? (() => {});

    const transport = new WT(url);
    onState('connecting');
    await transport.ready;
    onState('connected');

    let stopped = false;
    let bytesTotal = 0;
    let datagramsTotal = 0;
    let bytesInterval = 0;
    let datagramsInterval = 0;

    const count = (chunk) => {
        const len = chunk?.byteLength ?? chunk?.length ?? 0;
        bytesTotal += len;
        bytesInterval += len;
    };

    // Datagram duct (preferred for media: unreliable, unordered, low latency).
    let datagramReader = null;
    if (options.useDatagrams !== false && transport.datagrams?.readable) {
        datagramReader = transport.datagrams.readable.getReader?.() ?? null;
        (async () => {
            try {
                if (datagramReader) {
                    for (;;) {
                        const { value, done } = await datagramReader.read();
                        if (done || stopped) break;
                        count(value);
                        datagramsTotal += 1;
                        datagramsInterval += 1;
                        onData?.(new Uint8Array(value.buffer ?? value));
                    }
                } else {
                    for await (const dr of transport.datagrams.readable) {
                        if (stopped) break;
                        count(dr);
                        datagramsTotal += 1;
                        datagramsInterval += 1;
                        onData?.(new Uint8Array(dr.buffer ?? dr));
                    }
                }
            } catch {
                /* duct closed */
            }
        })();
    }

    // Unidirectional stream duct fallback (reliable).
    if (transport.incomingUnidirectionalStreams?.getReader) {
        const reader = transport.incomingUnidirectionalStreams.getReader();
        (async () => {
            try {
                for (;;) {
                    const { value, done } = await reader.read();
                    if (done || stopped) break;
                    const stream = await value;
                    const r = stream.getReader();
                    for (;;) {
                        const { value: chunk, done: chunkDone } =
                            await r.read();
                        if (chunkDone || stopped) break;
                        count(chunk);
                        onData?.(new Uint8Array(chunk.buffer ?? chunk));
                    }
                }
            } catch {
                /* stream closed */
            }
        })();
    }

    const sampleInterval = setInterval(() => {
        const sample = normalizeWebTransportStats({
            bytesReceived: bytesTotal,
            datagramsReceived: datagramsTotal,
            bytesInterval,
            datagramsInterval,
            intervalMs: 1000,
        });
        bytesInterval = 0;
        datagramsInterval = 0;
        options.onSample?.(sample);
    }, 1000);

    const close = async () => {
        stopped = true;
        clearInterval(sampleInterval);
        // Cancel ducts so in-flight reads unblock instead of hanging.
        try {
            datagramReader?.cancel?.();
        } catch {
            /* */
        }
        try {
            transport.close();
        } catch {
            /* already closed */
        }
    };
    options.signal?.addEventListener('abort', close, { once: true });
    return { close, transport };
}
