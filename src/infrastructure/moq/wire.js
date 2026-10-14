// MOQT wire codec (draft-ietf-moq-transport -22): a bounded byte reader and
// writer, control-message encode/decode (SETUP, SUBSCRIBE, SUBSCRIBE_OK,
// TRACK_STATUS, REQUEST_OK/ERROR, GOAWAY, NAMESPACE*, SUBSCRIBE_NAMESPACE,
// REQUEST_UPDATE), subgroup-stream object parsing, and OBJECT_DATAGRAM
// parsing. Pure — everything is driven by Uint8Arrays so it can be
// contract-tested without a transport.

import { readVarint, writeVarint, varintSize } from './varint.js';

// --- Control message type constants (draft §9) -------------------------------

export const MOQ_MESSAGE = Object.freeze({
    SETUP: 0x2f00,
    GOAWAY: 0x10,
    REQUEST_OK: 0x07,
    REQUEST_ERROR: 0x05,
    REQUEST_UPDATE: 0x02,
    SUBSCRIBE: 0x03,
    SUBSCRIBE_OK: 0x04,
    PUBLISH: 0x1d,
    PUBLISH_DONE: 0x0b,
    FETCH: 0x16,
    FETCH_OK: 0x18,
    TRACK_STATUS: 0x06,
    PUBLISH_NAMESPACE: 0x50,
    SUBSCRIBE_NAMESPACE: 0x08,
    NAMESPACE: 0x0e,
    NAMESPACE_DONE: 0x0e, // resolved below; placeholder kept explicit
});

// NAMESPACE_DONE is 0x0E and NAMESPACE is 0x08 in the draft's IANA block;
// keep explicit non-colliding names for our use.
export const M_NAMESPACE = 0x08;
export const M_NAMESPACE_DONE = 0x0e;

/** Datagram type-flag bits (§11.2.1). */
export const DATAGRAM_FLAGS = Object.freeze({
    DATAGRAM: 0x40,
    PROPERTIES: 0x01,
    END_OF_GROUP: 0x02,
    ZERO_OBJECT_ID: 0x04,
    DEFAULT_PRIORITY: 0x08,
    RESERVED: 0x10,
    STATUS: 0x20,
});

/** Subgroup header type-flag bits (§11.3.1). */
export const SUBGROUP_FLAGS = Object.freeze({
    PROPERTIES: 0x01,
    SUBGROUP_ID_MODE_MASK: 0x06,
    END_OF_GROUP: 0x08,
    DEFAULT_PRIORITY: 0x20,
    FIRST_OBJECT: 0x40,
    STREAM_MARKER: 0x10, // bit 4 is always 1 for SUBGROUP_HEADER
});

/** Object status values (§11.1.1). */
export const OBJECT_STATUS = Object.freeze({
    NORMAL: 0x00,
    END_OF_GROUP: 0x03,
    END_OF_TRACK: 0x04,
});

/** Key-value-pair helpers (§8.3): delta-type; odd types carry bytes. */
export function writeKvps(view, offset, kvps) {
    /** @type {number} */
    let at = offset;
    let prev = 0n;
    for (const { type, value } of kvps) {
        const delta = Number(BigInt(type) - prev);
        at += writeVarint(view, at, delta);
        if (BigInt(type) % 2n === 0n) {
            at += writeVarint(view, at, BigInt(value));
        } else {
            const bytes =
                value instanceof Uint8Array
                    ? value
                    : new TextEncoder().encode(String(value));
            at += writeVarint(view, at, bytes.length);
            for (const b of bytes) view.setUint8(at++, b);
        }
        prev = BigInt(type);
    }
    return at - offset;
}

export class ByteReader {
    /** @param {Uint8Array} bytes @param {number} offset */
    constructor(bytes, offset = 0) {
        this.bytes = bytes;
        this.offset = offset;
        this.end = bytes.length;
    }
    get remaining() {
        return this.end - this.offset;
    }
    varint() {
        const { value, bytesRead } = readVarint(this.bytes, this.offset);
        this.offset += bytesRead;
        return Number(value);
    }
    uint8() {
        if (this.offset + 1 > this.end) throw new RangeError('reader overflow');
        return this.bytes[this.offset++];
    }
    bytes_(n) {
        if (this.offset + n > this.end) throw new RangeError('reader overflow');
        const out = this.bytes.subarray(this.offset, this.offset + n);
        this.offset += n;
        return out;
    }
    rest() {
        const out = this.bytes.subarray(this.offset, this.end);
        this.offset = this.end;
        return out;
    }
}

export class ByteWriter {
    constructor(capacity = 256) {
        this.buf = new Uint8Array(capacity);
        this.view = new DataView(this.buf.buffer);
        this.offset = 0;
    }
    ensure(n) {
        if (this.offset + n > this.buf.length) {
            let cap = this.buf.length * 2;
            while (cap < this.offset + n) cap *= 2;
            const next = new Uint8Array(cap);
            next.set(this.buf.subarray(0, this.offset));
            this.buf = next;
            this.view = new DataView(next.buffer);
        }
    }
    varint(v) {
        const n = varintSize(v);
        this.ensure(n);
        this.offset += writeVarint(this.view, this.offset, v);
    }
    uint8(v) {
        this.ensure(1);
        this.view.setUint8(this.offset++, v);
    }
    raw(bytes) {
        this.ensure(bytes.length);
        this.buf.set(bytes, this.offset);
        this.offset += bytes.length;
    }
    finish() {
        return this.buf.slice(0, this.offset);
    }
}

// --- Track namespaces (§8.7): tuples of KVP pairs ------------------------------

export function decodeTrackNamespace(r) {
    const count = r.varint();
    const out = [];
    let prev = 0;
    for (let i = 0; i < count; i++) {
        const delta = r.varint();
        prev += delta;
        if (prev % 2 === 0) {
            out.push(Number(r.varint()));
        } else {
            const len = r.varint();
            out.push(new TextDecoder().decode(r.bytes_(len)));
        }
    }
    return out;
}

export function encodeTrackNamespace(w, namespace) {
    w.varint(namespace.length);
    let prev = 0;
    for (const part of namespace) {
        const type = typeof part === 'number' ? part : 1; // even = integer, odd = string placeholder
        w.varint(type - prev);
        if (typeof part === 'number') {
            w.varint(part);
        } else {
            const bytes = new TextEncoder().encode(part);
            w.varint(bytes.length);
            w.raw(bytes);
        }
        prev = type;
    }
}

// --- Control message encoders ----------------------------------------------------

function messageHeader(w, type, payloadLen) {
    w.varint(type);
    // Length (16) is a literal 16-bit field per the draft figures.
    w.ensure(2);
    w.view.setUint16(w.offset, payloadLen, false);
    w.offset += 2;
}

export function encodeSetup(payload = []) {
    const w = new ByteWriter(16);
    const body = new ByteWriter(16);
    writeKvps(body.view, body.offset, payload);
    const payloadLen = body.offset;
    messageHeader(w, MOQ_MESSAGE.SETUP, payloadLen);
    w.raw(body.finish());
    return w.finish();
}

export function encodeSubscribe(requestId, namespace, name, params = []) {
    const ns = new ByteWriter(128);
    encodeTrackNamespace(ns, namespace);
    const body = new ByteWriter(256);
    body.varint(requestId);
    body.varint(ns.offset);
    body.raw(ns.finish());
    const nameBytes = new TextEncoder().encode(name);
    body.varint(nameBytes.length);
    body.raw(nameBytes);
    body.varint(params.length);
    writeKvps(body.view, body.offset, params);
    const w = new ByteWriter(16);
    messageHeader(w, MOQ_MESSAGE.SUBSCRIBE, body.offset);
    w.raw(body.finish());
    return w.finish();
}

export function encodeTrackStatus(requestId, namespace, name) {
    return encodeSubscribe(requestId, namespace, name, []);
}

export function encodeSubscribeNamespace(
    requestId,
    namespace,
    subscribe = true
) {
    const ns = new ByteWriter(128);
    encodeTrackNamespace(ns, namespace);
    const body = new ByteWriter(16);
    body.varint(requestId);
    body.varint(ns.offset);
    body.raw(ns.finish());
    const w = new ByteWriter(16);
    messageHeader(
        w,
        subscribe
            ? MOQ_MESSAGE.SUBSCRIBE_NAMESPACE
            : MOQ_MESSAGE.PUBLISH_NAMESPACE,
        body.offset
    );
    w.raw(body.finish());
    return w.finish();
}

// --- Control message decoders ----------------------------------------------------

export function decodeControlMessage(bytes) {
    const r = new ByteReader(bytes);
    const type = r.varint();
    const len = (r.uint8() << 8) | r.uint8();
    const body = new ByteReader(bytes, r.offset);
    body.end = Math.min(r.offset + len, bytes.length);
    switch (type) {
        case MOQ_MESSAGE.SETUP: {
            // Setup Options span the entire payload; there is no count prefix
            // (draft §9.1). An empty Length means no options.
            const options = body.remaining > 0 ? decodeKvpListToEnd(body) : [];
            return { type: 'SETUP', options };
        }
        case MOQ_MESSAGE.SUBSCRIBE_OK: {
            const alias = body.varint();
            const nParams = body.varint();
            const params = decodeKvpList(body, nParams);
            const nProps = body.varint();
            const properties = decodeKvpList(body, nProps);
            return {
                type: 'SUBSCRIBE_OK',
                trackAlias: alias,
                params,
                trackProperties: properties,
            };
        }
        case MOQ_MESSAGE.TRACK_STATUS: {
            const alias = body.varint();
            const nParams = body.varint();
            const params = decodeKvpList(body, nParams);
            const nProps = body.varint();
            const properties = decodeKvpList(body, nProps);
            return {
                type: 'TRACK_STATUS',
                trackAlias: alias,
                params,
                trackProperties: properties,
            };
        }
        case MOQ_MESSAGE.REQUEST_OK: {
            const nParams = body.varint();
            const params = decodeKvpList(body, nParams);
            const nProps = body.varint();
            const properties = decodeKvpList(body, nProps);
            return { type: 'REQUEST_OK', params, trackProperties: properties };
        }
        case MOQ_MESSAGE.REQUEST_ERROR: {
            const code = body.varint();
            const retry = body.varint();
            const reasonLen = body.varint();
            const reason = new TextDecoder().decode(body.bytes_(reasonLen));
            return {
                type: 'REQUEST_ERROR',
                code,
                retryIntervalMs: retry,
                reason,
            };
        }
        case M_NAMESPACE:
        case M_NAMESPACE_DONE: {
            const namespace = decodeTrackNamespace(body);
            return {
                type: type === M_NAMESPACE ? 'NAMESPACE' : 'NAMESPACE_DONE',
                namespace,
            };
        }
        case MOQ_MESSAGE.GOAWAY:
            return { type: 'GOAWAY' };
        default:
            return { type: 'UNKNOWN', messageType: type, body: body.rest() };
    }
}

function decodeKvpListToEnd(body) {
    const kvps = [];
    let prev = 0;
    while (body.remaining > 0) {
        prev += body.varint();
        if (prev % 2 !== 0) {
            const l = body.varint();
            kvps.push({
                type: prev,
                value: new TextDecoder().decode(body.bytes_(l)),
            });
        } else {
            kvps.push({ type: prev, value: Number(body.varint()) });
        }
    }
    return kvps;
}
function decodeKvpList(body, count) {
    const kvps = [];
    let prev = 0;
    for (let i = 0; i < count; i++) {
        prev += body.varint();
        if (prev % 2 !== 0) {
            const l = body.varint();
            kvps.push({
                type: prev,
                value: new TextDecoder().decode(body.bytes_(l)),
            });
        } else {
            kvps.push({ type: prev, value: Number(body.varint()) });
        }
    }
    return kvps;
}

// --- Data plane --------------------------------------------------------------------

/**
 * Parse a SUBGROUP_HEADER stream prefix.
 * @param {ByteReader} r
 * @returns {{trackAlias:number, groupId:number, subgroupId:number, hasProperties:boolean, endOfGroup:boolean, priority:number|null, firstObject:boolean}}
 */
export function decodeSubgroupHeader(r) {
    const flags = r.varint();
    if ((flags & SUBGROUP_FLAGS.STREAM_MARKER) === 0) {
        throw new Error(`bad SUBGROUP_HEADER marker 0x${flags.toString(16)}`);
    }
    const trackAlias = r.varint();
    const groupId = r.varint();
    const mode = (flags & SUBGROUP_FLAGS.SUBGROUP_ID_MODE_MASK) >> 1;
    let subgroupId = 0;
    if (mode === 0b01)
        subgroupId = -1; // object id of first object; resolved per-object
    else if (mode === 0b10) subgroupId = r.varint();
    else if (mode === 0b11) throw new Error('reserved subgroup id mode');
    const priority =
        (flags & SUBGROUP_FLAGS.DEFAULT_PRIORITY) !== 0 ? null : r.uint8();
    return {
        trackAlias,
        groupId,
        subgroupId,
        hasProperties: (flags & SUBGROUP_FLAGS.PROPERTIES) !== 0,
        endOfGroup: (flags & SUBGROUP_FLAGS.END_OF_GROUP) !== 0,
        priority,
        firstObject: (flags & SUBGROUP_FLAGS.FIRST_OBJECT) !== 0,
    };
}

/**
 * Parse one serialized subgroup object (§11.3.1 continuation).
 * The first object in a subgroup stream uses the delta as its absolute
 * Object ID; later objects add delta + 1 to the previous ID.
 * @param {ByteReader} r
 * @param {{objectProps: boolean}} subgroup
 * @param {{group:number, subgroup:number, priorObjectId:number|null}} ctx
 */
export function decodeSubgroupObject(r, subgroup, ctx) {
    const delta = r.varint();
    const objectId =
        ctx.priorObjectId === null ? delta : ctx.priorObjectId + delta + 1;
    let properties = null;
    if (subgroup.objectProps) {
        const n = r.varint();
        properties = decodeKvpList(r, n);
    }
    const payloadLen = Number(r.varint());
    /** @type {number} */
    let status = OBJECT_STATUS.NORMAL;
    if (payloadLen === 0) {
        status = Number(r.varint());
        return {
            objectId,
            groupId: ctx.group,
            subgroupId: ctx.subgroup,
            payload: null,
            status,
            properties,
        };
    }
    const payload = r.bytes_(payloadLen);
    return {
        objectId,
        groupId: ctx.group,
        subgroupId: ctx.subgroup,
        payload,
        status,
        properties,
    };
}

/**
 * Parse an OBJECT_DATAGRAM (§11.2.1). Payload extends to the end of the datagram.
 * @param {Uint8Array} bytes
 */
export function decodeObjectDatagram(bytes) {
    const r = new ByteReader(bytes);
    const flags = r.varint();
    if ((flags & DATAGRAM_FLAGS.DATAGRAM) === 0) {
        throw new Error(
            `datagram type 0x${flags.toString(16)} lacks the datagram bit`
        );
    }
    if ((flags & DATAGRAM_FLAGS.RESERVED) !== 0) {
        throw new Error('datagram sets reserved bit 0x10');
    }
    if (
        (flags & DATAGRAM_FLAGS.STATUS) !== 0 &&
        (flags & DATAGRAM_FLAGS.END_OF_GROUP) !== 0
    ) {
        throw new Error('datagram sets STATUS and END_OF_GROUP together');
    }
    const trackAlias = r.varint();
    const groupId = r.varint();
    const objectId =
        (flags & DATAGRAM_FLAGS.ZERO_OBJECT_ID) !== 0 ? 0 : r.varint();
    const priority =
        (flags & DATAGRAM_FLAGS.DEFAULT_PRIORITY) !== 0 ? null : r.uint8();
    let properties = null;
    if ((flags & DATAGRAM_FLAGS.PROPERTIES) !== 0) {
        const n = r.varint();
        properties = decodeKvpList(r, n);
    }
    if ((flags & DATAGRAM_FLAGS.STATUS) !== 0) {
        const status = r.varint();
        return {
            trackAlias,
            groupId,
            objectId,
            payload: null,
            status,
            priority,
            properties,
        };
    }
    return {
        trackAlias,
        groupId,
        objectId,
        payload: r.rest(),
        status: OBJECT_STATUS.NORMAL,
        priority,
        properties,
    };
}
