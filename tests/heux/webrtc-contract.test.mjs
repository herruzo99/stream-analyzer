import assert from 'node:assert/strict';
import test from 'node:test';
import {
    connectWhep,
    normalizeWebrtcStats,
} from '../../src/infrastructure/webrtc/adapter.js';

// Fixtures shaped like real getStats() entries (Chrome/Edge).
const fixtureStats = () =>
    new Map([
        [
            'transport-1',
            {
                type: 'transport',
                dtlsState: 'connected',
                selectedCandidatePairId: 'pair-1',
                bytesReceived: 5000,
                bytesSent: 1200,
            },
        ],
        [
            'pair-1',
            {
                type: 'candidate-pair',
                id: 'pair-1',
                nominated: true,
                state: 'succeeded',
                localCandidateId: 'cand-l',
                remoteCandidateId: 'cand-r',
                currentRoundTripTime: 0.021,
                availableOutgoingBitrate: 1150000,
            },
        ],
        [
            'in-rtp-0',
            {
                type: 'inbound-rtp',
                kind: 'video',
                packetsReceived: 30000,
                packetsLost: 0,
                jitter: 0.004,
                nackCount: 7,
                pliCount: 2,
                bytesReceived: 4800000,
            },
        ],
        [
            'in-rtp-1',
            {
                type: 'inbound-rtp',
                kind: 'audio',
                packetsReceived: 15000,
                jitter: 0.001,
            },
        ],
        [
            'ri-rtp-0',
            {
                type: 'remote-inbound-rtp',
                packetsLost: 12,
                roundTripTime: 0.023,
                nackCount: 3,
            },
        ],
    ]);

test('AT-SRT-WEBRTC-01 normalization maps browser stats onto LinkTelemetry', () => {
    const s = normalizeWebrtcStats(fixtureStats(), { t: 1000 });
    // RTT: seconds → ms.
    assert.equal(s.rttMs, 21);
    // packets: inbound video + audio.
    assert.equal(s.pktRecv, 45000);
    // loss from remote-inbound-rtp.
    assert.equal(s.pktRecvLost, 12);
    // NACKs count as the retransmission proxy.
    assert.equal(s.pktRetrans, 10); // 7 (inbound) + 3 (remote-inbound)
    assert.equal(s.pliCount, 2);
    // Jitter seconds → ms (not rounded away).
    assert.equal(s.jitterMs, 4);
    assert.equal(s.availKbps, 1150);
    assert.equal(s.dtlsState, 'connected');
    assert.ok(s.selectedPair.includes('cand-l'));
    assert.equal(s.encrypted, true);
    // mbpsRecv>0 from bytesReceived: 4.8MB*8 bits / 1MB ≈ 36.6 Mb/s
    assert.ok(s.mbpsRecv > 30, `mbpsRecv = ${s.mbpsRecv}`);
});

test('AT-SRT-WEBRTC-02 defensive against missing/hostile reports', () => {
    const empty = normalizeWebrtcStats(new Map(), { t: 5 });
    assert.equal(empty.rttMs, 0);
    assert.equal(empty.pktRecv, 0);
    assert.equal(empty.encrypted, false);
    assert.equal(empty.dtlsState, null);

    // Garbage: NaN fields, wrong types, array input accepted.
    const s = normalizeWebrtcStats([
        { type: 'inbound-rtp', packetsReceived: NaN, jitter: undefined },
        {
            type: 'candidate-pair',
            nominated: true,
            state: 'succeeded',
            currentRoundTripTime: NaN,
        },
    ]);
    assert.equal(s.pktRecv, 0);
    assert.equal(s.rttMs, 0);
    assert.ok(Number.isFinite(s.mbpsRecv));
});

test('AT-SRT-WEBRTC-03 connectWhep drives the WHEP handshake with injectables', async () => {
    let postedSdp = null;
    const fetchImpl = async (url, opts) => {
        assert.equal(url, 'http://localhost:8889/live/whep');
        assert.equal(opts.method, 'POST');
        assert.match(opts.headers['Content-Type'], /application\/sdp/);
        postedSdp = opts.body;
        return {
            ok: true,
            text: async () =>
                'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
        };
    };

    const states = [];
    const samples = [];
    let remoteSet = null;
    const pc = {
        addTransceiver() {},
        async createOffer() {
            return { sdp: 'v=0 OFFER', type: 'offer' };
        },
        async setLocalDescription() {},
        async setRemoteDescription(desc) {
            remoteSet = desc;
        },
        close() {},
        async getStats() {
            return fixtureStats();
        },
    };
    class FakePC {
        constructor() {
            Object.assign(this, pc);
        }
    }

    const handle = await connectWhep('http://localhost:8889/live/whep', {
        RTCPeerConnection: FakePC,
        fetchImpl,
        onSample: (s) => samples.push(s),
        onState: (s) => states.push(s),
    });
    assert.ok(postedSdp.includes('OFFER'));
    assert.equal(remoteSet.type, 'answer');
    assert.deepEqual(states, ['subscribing', 'subscribed']);
    await handle.close();
});

test('AT-SRT-WEBRTC-04 connectWhep surfaces endpoint failures', async () => {
    class FakePC {
        addTransceiver() {}
        async createOffer() {
            return { sdp: 'v=0', type: 'offer' };
        }
        async setLocalDescription() {}
        async setRemoteDescription() {}
        close() {}
        async getStats() {
            return new Map();
        }
    }
    await assert.rejects(
        connectWhep('http://localhost:1/whep', {
            RTCPeerConnection: FakePC,
            fetchImpl: async () => ({ ok: false, status: 404 }),
        }),
        /404/
    );
});
