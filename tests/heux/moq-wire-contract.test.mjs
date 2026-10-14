import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeVarint, readVarint, varintSize, writeVarint } from '../../src/infrastructure/moq/varint.js';
import {
    ByteReader,
    ByteWriter,
    MOQ_MESSAGE,
    DATAGRAM_FLAGS,
    SUBGROUP_FLAGS,
    decodeObjectDatagram,
    decodeSubgroupHeader,
    decodeSubgroupObject,
    decodeControlMessage,
    encodeSetup,
    encodeSubscribe,
    encodeTrackNamespace,
    decodeTrackNamespace,
} from '../../src/infrastructure/moq/wire.js';

// --- varint golden vectors (draft §8.1, Table 4) -------------------------------

const VARINT_CASES = [
    [0x25, 37n],
    [0x8025, 37n],
    [0xbbbd, 15293n],
    [0xed7f3e7d, 226442877n],
    [0xfaa1a0e403d8, 2893212287960n],
    [0xfc8998abc66bc0, 151288809941952n],
    [0xfefa318fa8e3ca11, 70423237261249041n],
    [0xffffffffffffffffff, 18446744073709551615n],
];

test('AT-MOQ-VI-01 varint decode matches the draft golden table', () => {
    const goldens = [
        ['25', 37n],
        ['8025', 37n],
        ['bbbd', 15293n],
        ['ed7f3e7d', 226442877n],
        ['faa1a0e403d8', 2893212287960n],
        ['fc8998abc66bc0', 151288809941952n],
        ['fefa318fa8e3ca11', 70423237261249041n],
        ['ffffffffffffffffff', 18446744073709551615n],
    ];
    for (const [hex, want] of goldens) {
        const bytes = Uint8Array.from(Buffer.from(hex, 'hex'));
        const { value, bytesRead } = readVarint(bytes, 0);
        assert.equal(value, want, `decode 0x${hex}`);
        assert.equal(bytesRead, bytes.length, `length 0x${hex}`);
    }
});

test('AT-MOQ-VI-02 varint encode round-trips every golden value', () => {
    const goldens = [
        ['25', 37n],
        ['8025', 37n],
        ['bbbd', 15293n],
        ['ed7f3e7d', 226442877n],
        ['faa1a0e403d8', 2893212287960n],
        ['fc8998abc66bc0', 151288809941952n],
        ['fefa318fa8e3ca11', 70423237261249041n],
        ['ffffffffffffffffff', 18446744073709551615n],
    ];
    for (const [hex, want] of goldens) {
        const encoded = encodeVarint(want);
        const round = readVarint(encoded, 0);
        assert.equal(round.value, want, `value 0x${hex}`);
        // Non-minimal encodings (0x8025) must decode too.
        const long = Uint8Array.from(Buffer.from(hex, 'hex'));
        const dec = readVarint(long, 0);
        assert.equal(dec.value, want, `non-minimal 0x${hex}`);
    }
});

test('AT-MOQ-VI-03 varint sizes are minimal', () => {
    assert.equal(varintSize(0), 1);
    assert.equal(varintSize(127), 1);
    assert.equal(varintSize(128), 2);
    assert.equal(varintSize(16383), 2);
    assert.equal(varintSize(16384), 3);
    assert.throws(() => varintSize(-1), RangeError);
});

// --- control message codec -------------------------------------------------------

test('AT-MOQ-CTRL-01 SETUP encodes as a varint type 0x2F00 with empty payload', () => {
    const bytes = encodeSetup([]);
    // 0x2F00 as a varint is 0xAF 0x00 (2-byte form: 0b10 prefix + 14 value bits).
    assert.equal(bytes[0], 0xaf);
    assert.equal(bytes[1], 0x00);
    assert.equal(bytes[2], 0x00); // 16-bit length, high
    assert.equal(bytes[3], 0x00); // 16-bit length, low
    const decoded = decodeControlMessage(bytes);
    assert.equal(decoded.type, 'SETUP');
    assert.deepEqual(decoded.options, []);
});

test('AT-MOQ-CTRL-02 SUBSCRIBE round-trips namespace, name, request id', () => {
    const bytes = encodeSubscribe(42, ['anon', 'bbb'], 'video.0');
    const r = new ByteReader(bytes);
    const type = r.varint();
    assert.equal(type, MOQ_MESSAGE.SUBSCRIBE);
    const len = r.uint8() << 8 | r.uint8();
    const body = new ByteReader(bytes, r.offset);
    body.end = Math.min(r.offset + len, bytes.length);
    const requestId = body.varint();
    const nsLen = body.varint();
    const nsBytes = body.bytes_(nsLen);
    const namespace = decodeTrackNamespace(new ByteReader(nsBytes));
    const nameLen = body.varint();
    const name = new TextDecoder().decode(body.bytes_(nameLen));
    assert.equal(requestId, 42);
    assert.deepEqual(namespace, ['anon', 'bbb']);
    assert.equal(name, 'video.0');
});

test('AT-MOQ-CTRL-03 namespace tuple encoding round-trips', () => {
    const w = new ByteWriter(64);
    encodeTrackNamespace(w, ['anon', 'bbb']);
    const decoded = decodeTrackNamespace(new ByteReader(w.finish()));
    assert.deepEqual(decoded, ['anon', 'bbb']);
    const numeric = new ByteWriter(64);
    encodeTrackNamespace(numeric, [0, 'x']);
    assert.deepEqual(decodeTrackNamespace(new ByteReader(numeric.finish())), [0, 'x']);
});

test('AT-MOQ-CTRL-04 unknown control types decode losslessly', () => {
    const w = new ByteWriter(16);
    w.varint(0x9999);
    w.ensure(2); w.view.setUint16(w.offset, 3, false); w.offset += 2;
    w.raw(Uint8Array.of(1, 2, 3));
    const msg = decodeControlMessage(w.finish());
    assert.equal(msg.type, 'UNKNOWN');
    assert.equal(msg.messageType, 0x9999);
    assert.deepEqual(Array.from(msg.body), [1, 2, 3]);
});

// --- data plane -------------------------------------------------------------------

test('AT-MOQ-DATA-01 object datagram parse (payload to end of datagram)', () => {
    const w = new ByteWriter(64);
    const flags = DATAGRAM_FLAGS.DATAGRAM; // 0x40, object id present, priority present
    w.varint(flags);
    w.varint(7);   // track alias
    w.varint(100); // group
    w.varint(5);   // object
    w.uint8(3);    // priority
    w.raw(Uint8Array.of(1, 2, 3, 4)); // payload
    const obj = decodeObjectDatagram(w.finish());
    assert.equal(obj.trackAlias, 7);
    assert.equal(obj.groupId, 100);
    assert.equal(obj.objectId, 5);
    assert.equal(obj.priority, 3);
    assert.deepEqual(Array.from(obj.payload), [1, 2, 3, 4]);
    assert.equal(obj.status, 0);
});

test('AT-MOQ-DATA-02 datagram rejects reserved and illegal flag combos', () => {
    const w = new ByteWriter(16);
    w.varint(DATAGRAM_FLAGS.DATAGRAM | DATAGRAM_FLAGS.RESERVED);
    w.varint(1); w.varint(0); w.varint(0);
    assert.throws(() => decodeObjectDatagram(w.finish()), /reserved bit/);

    const w2 = new ByteWriter(16);
    w2.varint(DATAGRAM_FLAGS.DATAGRAM | DATAGRAM_FLAGS.STATUS | DATAGRAM_FLAGS.END_OF_GROUP);
    w2.varint(1); w2.varint(0); w2.varint(0);
    assert.throws(() => decodeObjectDatagram(w2.finish()), /STATUS and END_OF_GROUP/);

    const w3 = new ByteWriter(16);
    w3.varint(0x00); // missing datagram bit
    w3.varint(1); w3.varint(0); w3.varint(0);
    assert.throws(() => decodeObjectDatagram(w3.finish()), /datagram bit/);
});

test('AT-MOQ-DATA-03 subgroup header + object stream parse', () => {
    // Header: marker, properties absent, explicit subgroup id, priority present, first object.
    const w = new ByteWriter(128);
    const flags =
        SUBGROUP_FLAGS.STREAM_MARKER |
        (0b10 << 1) | // subgroup id present
        SUBGROUP_FLAGS.FIRST_OBJECT;
    w.varint(flags);
    w.varint(7);   // track alias
    w.varint(100); // group id
    w.varint(0);   // subgroup id
    w.uint8(5);    // priority
    const header = decodeSubgroupHeader(new ByteReader(w.finish()));
    assert.equal(header.trackAlias, 7);
    assert.equal(header.groupId, 100);
    assert.equal(header.subgroupId, 0);
    assert.equal(header.priority, 5);
    assert.equal(header.firstObject, true);
    assert.equal(header.endOfGroup, false);

    // Two objects: first absolute (delta semantics), then sequential delta 0.
    const ow = new ByteWriter(128);
    ow.varint(4); // object id delta → 4 + 0(prior->0) ... first object: id = delta
    ow.varint(3); // payload length
    ow.raw(Uint8Array.of(9, 9, 9));
    const obj1 = decodeSubgroupObject(new ByteReader(ow.finish()), header, { group: 100, subgroup: 0, priorObjectId: null });
    assert.equal(obj1.objectId, 4);
    assert.deepEqual(Array.from(obj1.payload), [9, 9, 9]);

    const ow2 = new ByteWriter(64);
    ow2.varint(0); // delta 0 → previous + 1
    ow2.varint(2);
    ow2.raw(Uint8Array.of(7, 7));
    const obj2 = decodeSubgroupObject(new ByteReader(ow2.finish()), header, { group: 100, subgroup: 0, priorObjectId: 4 });
    assert.equal(obj2.objectId, 5);
    assert.deepEqual(Array.from(obj2.payload), [7, 7]);
});

test('AT-MOQ-DATA-04 zero-length object carries status instead of payload', () => {
    const w = new ByteWriter(32);
    w.varint(0); // delta → next id
    w.varint(0); // payload length 0 → status follows
    w.varint(3); // END_OF_GROUP
    const obj = decodeSubgroupObject(new ByteReader(w.finish()), { hasProperties: false }, { group: 100, subgroup: 0, priorObjectId: 4 });
    assert.equal(obj.status, 3);
    assert.equal(obj.payload, null);
});

test('AT-MOQ-DATA-05 writer/reader round-trip with varint byte-alignment', () => {
    const w = new ByteWriter(8);
    w.varint(0xabcd);
    w.varint(300000);
    w.raw(Uint8Array.of(0xde, 0xad, 0xbe, 0xef));
    const r = new ByteReader(w.finish());
    assert.equal(r.varint(), 0xabcd);
    assert.equal(r.varint(), 300000);
    assert.deepEqual(Array.from(r.bytes_(4)), [0xde, 0xad, 0xbe, 0xef]);
    assert.equal(r.remaining, 0);
    assert.throws(() => r.bytes_(1), /overflow/);
});
