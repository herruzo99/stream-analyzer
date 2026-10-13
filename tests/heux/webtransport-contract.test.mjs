import assert from 'node:assert/strict';
import test from 'node:test';
import {
    connectWebTransport,
    normalizeWebTransportStats,
} from '../../src/infrastructure/webrtc/webtransport-adapter.js';

test('AT-T3-WT-01 normalization is honest about WebTransport gaps', () => {
    const s = normalizeWebTransportStats({
        bytesReceived: 5_000_000,
        datagramsReceived: 1000,
        bytesInterval: 1_250_000,
        datagramsInterval: 250,
        intervalMs: 1000,
    });
    // 1.25 MB/s = 1,250,000 × 8 / 1048576 = 9.54 Mbps (binary Mb).
    assert.equal(s.mbpsRecv, 9.54);
    assert.equal(s.pktRecv, 1000);
    // WebTransport has no RTT/loss stats: null + documented reason, never 0 fabricated.
    assert.equal(s.rttMs, null);
    assert.match(s.rttMsReason, /no RTT/);
    assert.equal(s.pktRecvLost, null);
    assert.match(s.pktRecvLostReason, /not observable/);
    // QUIC mandates TLS.
    assert.equal(s.encrypted, true);
    assert.match(s.encryptedReason, /TLS/);
});

// Fake WebTransport with a datagram duct that ends after the queue.
function fakeDatagramTransport(datagrams) {
    return class FakeWebTransport {
        constructor() {
            this.datagrams = {
                readable: {
                    getReader: () => {
                        const queue = [...datagrams];
                        return {
                            read: async () =>
                                queue.length > 0
                                    ? { value: queue.shift(), done: false }
                                    : { value: undefined, done: true },
                            cancel: async () => {},
                        };
                    },
                },
            };
        }
        get ready() { return Promise.resolve(); }
        close() { this.closed = true; }
    };
}

test('AT-T3-WT-02 datagrams are counted and forwarded; close cancels ducts', async () => {
    const received = [];
    const samples = [];
    const handle = await connectWebTransport('https://localhost:4433/live', {
        WebTransportImpl: fakeDatagramTransport([
            new Uint8Array(1316),
            new Uint8Array(1316),
            new Uint8Array(1316),
        ]),
        onData: (b) => received.push(b),
        onSample: (s) => samples.push(s),
    });
    // One sample interval is enough to observe all three datagrams.
    await new Promise((r) => setTimeout(r, 1300));
    assert.equal(received.length, 3);
    assert.ok(samples.length >= 1, 'at least one sample interval');
    const last = samples[samples.length - 1];
    assert.equal(last.pktRecv, 3);
    // 3 × 1316 bytes ≈ 0.03 Mbps.
    assert.ok(last.mbpsRecv > 0.02 && last.mbpsRecv < 0.04, `mbpsRecv=${last.mbpsRecv}`);
    await handle.close();
    assert.equal(handle.transport.closed, true);
});

test('AT-T3-WT-03 unsupported browser fails cleanly', async () => {
    await assert.rejects(
        connectWebTransport('https://localhost:1/x', {
            WebTransportImpl: undefined,
            onData: () => {},
        }),
        /unsupported/
    );
});

// Fake WebTransport serving only unidirectional streams (reliable fallback).
class StreamFallbackTransport {
    constructor() {
        // Realistic TS-over-QUIC: 40 packets of 1316 bytes (~0.4 Mb/s).
        const chunks = Array.from({ length: 40 }, () => new Uint8Array(1316));
        let outerDone = false;
        this.incomingUnidirectionalStreams = {
            getReader: () => ({
                read: async () => {
                    if (outerDone) return { value: undefined, done: true };
                    outerDone = true;
                    return {
                        value: {
                            getReader: () => {
                                let i = 0;
                                return {
                                    read: async () =>
                                        i < chunks.length
                                            ? { value: chunks[i++], done: false }
                                            : { value: undefined, done: true },
                                    cancel: async () => {},
                                };
                            },
                        },
                        done: false,
                    };
                },
                cancel: async () => {},
            }),
        };
    }
    get ready() { return Promise.resolve(); }
    close() { this.closed = true; }
}

test('AT-T3-WT-04 stream duct fallback feeds bytes', async () => {
    const seen = [];
    const samples = [];
    const handle = await connectWebTransport('https://localhost:4434/live', {
        WebTransportImpl: StreamFallbackTransport,
        onData: (b) => seen.push(b),
        onSample: (s) => samples.push(s),
        useDatagrams: false,
    });
    await new Promise((r) => setTimeout(r, 1300));
    assert.equal(seen.length, 40, `chunks seen: ${seen.length}`);
    assert.ok(samples.length >= 1);
    // Some window must have observed a non-zero rate (~0.4 Mb/s).
    assert.ok(samples.some((s) => s.mbpsRecv > 0.3), `windows: ${samples.map((s) => s.mbpsRecv).join(',')}`);
    await handle.close();
});
