import assert from 'node:assert/strict';
import test from 'node:test';
import {
    connectWhip,
    normalizePublishStats,
} from '../../src/infrastructure/webrtc/adapter.js';

// A realistic publish-side stats report: outbound-rtp (what WE send) plus the
// server's remote-inbound-rtp feedback (what the SERVER sees).
const PUBLISH_STATS = {
    transport_1: { type: 'transport', dtlsState: 'connected', bytesReceived: 89000 },
    out_rtp_0: {
        type: 'outbound-rtp',
        kind: 'video',
        packetsSent: 4500,
        bytesSent: 5_400_000,
        qualityLimitationReason: 'none',
        ssrc: 111111111,
    },
    ri_rtp_0: {
        type: 'remote-inbound-rtp',
        kind: 'video',
        packetsLost: 42,
        roundTripTime: 0.017,
        jitter: 0.003,
        nackCount: 9,
        ssrc: 111111111,
    },
    pair_1: {
        type: 'candidate-pair',
        id: 'pair_1',
        state: 'succeeded',
        localCandidateId: 'l1',
        remoteCandidateId: 'r1',
        currentRoundTripTime: 0.017,
    },
};

test('AT-WHIP-01 publish stats normalize onto LinkTelemetry', () => {
    const s = normalizePublishStats(PUBLISH_STATS, { t: 1000 });
    assert.equal(s.pktSent, 4500);
    assert.equal(s.pktLost, 42); // server-side view
    assert.equal(s.rttMs, 17);
    assert.equal(s.nackCount, 9);
    assert.equal(s.jitterMs, 3);
    assert.ok(Math.abs(s.mbpsSend - 5_400_000 / 1048576) < 0.01);
    assert.equal(s.qualityLimitation, 'none');
    assert.equal(s.dtlsState, 'connected');
    assert.equal(s.encrypted, true);
    assert.ok(s.selectedPair.includes('l1'));
});

test('AT-WHIP-02 empty/hostile stats stay safe', () => {
    const empty = normalizePublishStats({}, { t: 1 });
    assert.equal(empty.pktSent, 0);
    assert.equal(empty.pktLost, 0);
    assert.equal(empty.rttMs, 0);
    assert.equal(empty.nackCount, null);
    const s = normalizePublishStats([
        { type: 'outbound-rtp', packetsSent: undefined, bytesSent: NaN },
        { type: 'remote-inbound-rtp', packetsLost: null, roundTripTime: NaN },
    ]);
    assert.equal(s.pktSent, 0);
    assert.ok(Number.isFinite(s.mbpsSend));
});

// WHIP handshake with injectables: RFC 9725 = POST offer, get 201+answer.
class FakePc {
    constructor() {
        this.transceivers = [];
        this.senders = [];
        this.localDescription = null;
        this.remoteDescription = null;
        this.closed = false;
        this.addTransceiverCalls = [];
    }
    addTransceiver(kind, opts) {
        this.transceivers.push({ kind, direction: opts.direction });
        this.addTransceiverCalls.push(`${kind}:${opts.direction}`);
        const receiver = { track: { kind } };
        const sender = {
            track: null,
            transceiver: { receiver },
            replacedWith: null,
            replaceTrack(t) { this.replacedWith = t; },
        };
        this.senders.push(sender);
        return { receiver };
    }
    getSenders() { return this.senders; }
    async createOffer() { return { sdp: 'v=0 OFFER', type: 'offer' }; }
    async setLocalDescription(d) { this.localDescription = d; }
    async setRemoteDescription(d) { this.remoteDescription = d; }
    async getStats() { return PUBLISH_STATS; }
    close() { this.closed = true; }
}

test('AT-WHIP-03 connectWhip posts the offer and applies the answer', async () => {
    const calls = [];
    let pc = null;
    class TrackedPc extends FakePc {
        constructor() { super(); pc = this; }
    }
    const fetchImpl = async (url, opts) => {
        calls.push({ url, method: opts.method, ct: opts.headers['Content-Type'], body: opts.body });
        return { ok: true, status: 201, text: async () => 'v=0 ANSWER' };
    };

    const states = [];
    const samples = [];
    const handle = await connectWhip('http://localhost:8889/live/whip', {
        RTCPeerConnection: TrackedPc,
        fetchImpl,
        onState: (s) => states.push(s),
        onSample: (s) => samples.push(s),
    });

    assert.deepEqual(pc.addTransceiverCalls, ['video:sendonly', 'audio:sendonly']);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'POST');
    assert.equal(calls[0].ct, 'application/sdp');
    assert.ok(calls[0].body.includes('OFFER'));
    assert.equal(pc.remoteDescription.type, 'answer');
    assert.deepEqual(states, ['publishing', 'published']);

    // One sample interval fires and uses the publish normalizer.
    await new Promise((r) => setTimeout(r, 1100));
    assert.ok(samples.length >= 1);
    assert.equal(samples[samples.length - 1].pktSent, 4500);
    await handle.close();
    assert.equal(pc.closed, true);
});

test('AT-WHIP-04 supplied tracks are attached to sendonly transceivers', async () => {
    let pc = null;
    class TrackedPc extends FakePc {
        constructor() { super(); pc = this; }
    }
    const fetchImpl = async () => ({ ok: true, status: 201, text: async () => 'v=0 ANSWER' });
    const videoTrack = { kind: 'video', id: 'v0' };
    const audioTrack = { kind: 'audio', id: 'a0' };
    const mediaStream = {
        getTracks: () => [videoTrack, audioTrack],
    };

    const handle = await connectWhip('http://localhost:8889/live/whip', {
        RTCPeerConnection: TrackedPc,
        fetchImpl,
        mediaStream,
    });
    assert.equal(pc.senders[0].replacedWith, videoTrack);
    assert.equal(pc.senders[1].replacedWith, audioTrack);
    await handle.close(); // stop the telemetry interval
});

test('AT-WHIP-05 endpoint failure surfaces status and body', async () => {
    class FakePc2 extends FakePc {}
    await assert.rejects(
        connectWhip('http://localhost:8889/nope/whip', {
            RTCPeerConnection: FakePc2,
            fetchImpl: async () => ({
                ok: false,
                status: 404,
                text: async () => '{"error":"no such path"}',
            }),
        }),
        /404.*no such path/
    );
});
