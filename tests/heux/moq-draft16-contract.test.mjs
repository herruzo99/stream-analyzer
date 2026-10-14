// Contract tests for the draft-ietf-moq-transport-16 dialect — the drafts up to
// 16 that real relays (Cloudflare, moq.dev) actually deploy.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ByteReader,
    M16,
    encodeSetup16,
    encodeSubscribe,
    encodeTrackStatus,
    decodeControlMessage,
    decodeObjectDatagram16,
    decodeSubgroupHeader,
    DATAGRAM16_FLAGS,
    encodeTrackNamespace,
} from '../../src/infrastructure/moq/wire.js';

const hex = (bytes) =>
    Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');

test('AT-M16-01 CLIENT_SETUP is 0x20 with a parameter count of zero', () => {
    const bytes = encodeSetup16();
    const r = new ByteReader(bytes);
    assert.equal(r.varint(), 0x20);
    const len = (r.uint8() << 8) | r.uint8();
    assert.equal(len, 1);
    assert.equal(r.varint(), 0, 'Number of Parameters');
    assert.equal(r.remaining, 0);
    const msg = decodeControlMessage(bytes, 'draft16');
    assert.equal(msg.type, 'CLIENT_SETUP');
    assert.deepEqual(msg.params, []);
});

test('AT-M16-02 SUBSCRIBE is byte-identical to the draft-22 form', () => {
    // Both dialects share the §9.9 layout: Request ID, Track Namespace
    // (self-delimiting), Track Name, parameter count.
    const bytes = encodeSubscribe(0, ['bbb'], 'catalog');
    const expected = [
        0x03,
        0x00,
        0x0f, // type + length (15 body bytes)
        0x00, // request ID 0 (client IDs are even, from 0)
        0x01,
        0x03,
        0x62,
        0x62,
        0x62, // namespace ['bbb']
        0x07,
        0x63,
        0x61,
        0x74,
        0x61,
        0x6c,
        0x6f,
        0x67, // 'catalog'
        0x00, // zero parameters
    ];
    assert.equal(
        hex(bytes),
        expected.map((b) => b.toString(16).padStart(2, '0')).join(' ')
    );
});

test('AT-M16-03 TRACK_STATUS uses type 0x0D and decodes as REQUEST_OK/ERROR', () => {
    const req = encodeTrackStatus(2, ['bbb'], '.catalog', M16.TRACK_STATUS);
    assert.equal(new ByteReader(req).varint(), 0x0d);
    // A REQUEST_OK reply: Request ID, Number of Parameters, Parameters.
    const ok = new Uint8Array([0x07, 0x00, 0x03, 0x02, 0x00]);
    const msg = decodeControlMessage(ok, 'draft16');
    assert.equal(msg.type, 'REQUEST_OK');
    assert.equal(msg.requestId, 2);
});

test('AT-M16-04 SUBSCRIBE_OK leads with the Request ID (unlike draft-22)', () => {
    // §9.10 (draft-16): Request ID, Track Alias, param count, params, extensions.
    const w = new ByteWriter16();
    w.varint(M16.SUBSCRIBE_OK);
    w.u16(6);
    w.varint(4); // request ID
    w.varint(9); // track alias
    w.varint(0); // zero parameters
    w.varint(0); // zero track extensions
    const msg = decodeControlMessage(w.finish(), 'draft16');
    assert.equal(msg.type, 'SUBSCRIBE_OK');
    assert.equal(msg.requestId, 4);
    assert.equal(msg.trackAlias, 9);
});

test('AT-M16-05 REQUEST_ERROR leads with the Request ID in draft-16', () => {
    const w = new ByteWriter16();
    w.varint(M16.REQUEST_ERROR);
    w.u16(8); // 8 body bytes: id, code, retry, reason length, 'nope'
    w.varint(6); // request ID
    w.varint(6); // error code: track not found
    w.varint(0); // retry interval
    w.varint(4); // reason phrase length
    w.raw(new TextEncoder().encode('nope'));
    const msg = decodeControlMessage(w.finish(), 'draft16');
    assert.equal(msg.type, 'REQUEST_ERROR');
    assert.equal(msg.requestId, 6);
    assert.equal(msg.code, 6);
    assert.equal(msg.reason, 'nope');
});

test('AT-M16-06 OBJECT_DATAGRAM uses 0b00X0XXXX with STATUS at 0x20', () => {
    // DEFAULT_PRIORITY | ZERO_OBJECT_ID: alias 7, group 3, payload 'hi'.
    const dg = Uint8Array.from([0x0c, 0x07, 0x03, 0x68, 0x69]);
    const obj = decodeObjectDatagram16(dg);
    assert.equal(obj.trackAlias, 7);
    assert.equal(obj.groupId, 3);
    assert.equal(obj.objectId, 0, 'ZERO_OBJECT_ID omits the field');
    assert.equal(obj.priority, null);
    assert.deepEqual(Array.from(obj.payload), [0x68, 0x69]);
    assert.equal(obj.endOfGroup, false);
});

test('AT-M16-07 datagram type values outside 0b00X0XXXX are rejected', () => {
    for (const flags of [0x10, 0x16, 0x1f, 0x30, 0x40]) {
        assert.throws(
            () => decodeObjectDatagram16(Uint8Array.from([flags, 0x07, 0x03])),
            /datagram type/,
            `flags 0x${flags.toString(16)} must be invalid`
        );
    }
});

test('AT-M16-08 STATUS together with END_OF_GROUP is rejected', () => {
    assert.throws(
        () =>
            decodeObjectDatagram16(
                Uint8Array.from([
                    DATAGRAM16_FLAGS.STATUS | DATAGRAM16_FLAGS.END_OF_GROUP,
                    0x07,
                    0x03,
                ])
            ),
        /STATUS and END_OF_GROUP/
    );
});

test('AT-M16-09 subgroup headers are shared with draft-22', () => {
    // 0x3C = END_OF_GROUP | DEFAULT_PRIORITY | stream marker | subgroup-id-mode 0b10.
    const w = new ByteWriter16();
    w.varint(0x3c);
    w.varint(9); // track alias
    w.varint(3); // group id
    w.varint(1); // subgroup id
    const header = decodeSubgroupHeader(new ByteReader(w.finish()));
    assert.equal(header.trackAlias, 9);
    assert.equal(header.groupId, 3);
    assert.equal(header.subgroupId, 1);
    assert.equal(header.priority, null);
    assert.equal(header.endOfGroup, true);
    assert.equal(header.hasProperties, false);
});

test('AT-M16-10 namespace fields are length-prefixed byte strings', () => {
    const w = new ByteWriter16();
    encodeTrackNamespace(w, ['bbb']);
    assert.equal(hex(w.finish()), '01 03 62 62 62');
});

// Minimal writer for building draft-16 frames in these tests.
class ByteWriter16 {
    constructor(size = 32) {
        this.buf = new Uint8Array(size);
        this.offset = 0;
    }
    ensure(n) {
        if (this.offset + n > this.buf.length) {
            const next = new Uint8Array(
                Math.max(this.buf.length * 2, this.offset + n)
            );
            next.set(this.buf);
            this.buf = next;
        }
    }
    varint(v) {
        this.ensure(8);
        const write = (x) => {
            this.buf[this.offset++] = x;
        };
        if (v < 0x80) return write(v);
        if (v < 0x4000) {
            write(0x80 | (v >> 8));
            return write(v & 0xff);
        }
        throw new Error('test writer supports small varints only');
    }
    u16(v) {
        this.ensure(2);
        this.buf[this.offset++] = (v >> 8) & 0xff;
        this.buf[this.offset++] = v & 0xff;
    }
    raw(bytes) {
        this.ensure(bytes.length);
        this.buf.set(bytes, this.offset);
        this.offset += bytes.length;
    }
    finish() {
        return this.buf.subarray(0, this.offset);
    }
}
