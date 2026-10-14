// MOQT session over WebTransport (draft-ietf-moq-transport -22, §6).
//
// Lifecycle: the client opens one outgoing unidirectional control stream
// carrying SETUP, receives the peer's SETUP on an incoming unidirectional
// stream, opens bidirectional streams for requests (SUBSCRIBE) and receives
// objects on incoming unidirectional subgroup streams and on QUIC datagrams.
// The transport is injectable for tests; all decoding is shared with wire.js.

import {
    MOQ_MESSAGE,
    M16,
    decodeControlMessage,
    decodeObjectDatagram,
    decodeObjectDatagram16,
    encodeSetup,
    encodeSetup16,
    encodeSubscribe,
    encodeTrackStatus,
} from './wire.js';
import { encodeVarint, readVarint } from './varint.js';
import {
    CATALOG_TRACK_NAME,
    applyCatalogObject,
    normalizeCatalog,
} from '@/features/moq/domain/catalog.js';
import {
    deriveMoqSample,
    trackObjectContinuity,
} from '@/features/moq/domain/telemetry.js';

/** Buffered varint-friendly reader over a WebTransport stream reader. */
export class StreamByteReader {
    constructor(reader) {
        this.reader = reader;
        this.buf = new Uint8Array(0);
        this.done = false;
    }
    get remaining() {
        return this.buf.length;
    }
    async _fill(n) {
        while (this.buf.length < n && !this.done) {
            const r = await this.reader.read();
            if (r.done) {
                this.done = true;
                break;
            }
            this._append(this._chunk(r.value));
        }
    }
    _chunk(v) {
        return v instanceof Uint8Array ? v : Uint8Array.from(v ?? []);
    }
    _append(chunk) {
        const next = new Uint8Array(this.buf.length + chunk.length);
        next.set(this.buf);
        next.set(chunk, this.buf.length);
        this.buf = next;
    }
    /** Read a varint, consuming it. @returns {Promise<bigint>} */
    async readVarint() {
        const peeked = await this.peekVarint();
        if (peeked === null) throw new Error('stream closed');
        await this._fill(peeked.size);
        const { value, bytesRead } = readVarint(this.buf, 0);
        this.buf = this.buf.subarray(bytesRead);
        return value;
    }
    /** Peek the next varint without consuming. @returns {Promise<{value:bigint,size:number}|null>} */
    async peekVarint() {
        if (this.buf.length === 0) await this._fill(1);
        if (this.buf.length === 0) return null;
        const first = this.buf[0];
        let size = 1;
        if (first !== 0) {
            let mask = 0x80;
            while ((first & mask) !== 0 && size < 9) {
                size++;
                mask >>= 1;
            }
        }
        if (this.buf.length < size) await this._fill(size);
        if (this.buf.length < size) return null;
        const { value } = readVarint(this.buf, 0);
        return { value, size };
    }
    /** @returns {Promise<number>} one raw byte */
    async readUint8() {
        await this._fill(1);
        if (this.buf.length < 1) throw new Error('stream closed');
        const b = this.buf[0];
        this.buf = this.buf.subarray(1);
        return b;
    }
    /** @returns {Promise<Uint8Array>} */
    async readBytes(n) {
        await this._fill(n);
        if (this.buf.length < n) throw new Error('stream closed mid-object');
        const out = this.buf.subarray(0, n);
        this.buf = this.buf.subarray(n);
        return out;
    }
}

/** Namespace tuple from a moqt URL path: moqt://host/anon/bbb → ['anon','bbb']. */
export function namespaceFromUrl(url) {
    try {
        const u = new URL(url);
        const segs = u.pathname
            .split('/')
            .filter(Boolean)
            .map(decodeURIComponent);
        return segs.length > 0 ? segs : ['anon'];
    } catch {
        return ['anon'];
    }
}

/** moqt:// → https:// for the WebTransport constructor (draft §6.2.1). */
export function webTransportUrl(url) {
    return url.replace(/^moqt:\/\//, 'https://');
}

/** Count-then-values KVP reader over a StreamByteReader (odd = bytes). */
async function readKvps(buf, count) {
    const out = [];
    let prev = 0;
    for (let i = 0; i < count; i++) {
        prev += Number(await buf.readVarint());
        if (prev % 2 !== 0) {
            const l = Number(await buf.readVarint());
            out.push({
                type: prev,
                value: new TextDecoder().decode(await buf.readBytes(l)),
            });
        } else {
            out.push({ type: prev, value: Number(await buf.readVarint()) });
        }
    }
    return out;
}

/** Length-prefixed control message read shared by control and reply streams. */
async function readControlFrame(buf, dialect = 'draft22') {
    const type = await buf.readVarint();
    const len = await buf.readBytes(2);
    const payloadLen = (len[0] << 8) | len[1];
    const payload = await buf.readBytes(payloadLen);
    // Rebuild the exact wire frame (type varint + length + payload) for the
    // shared decoder; note the length field follows the prefix directly.
    const prefix = encodeVarint(type);
    const full = new Uint8Array(prefix.length + 2 + payload.length);
    full.set(prefix, 0);
    full.set(len, prefix.length);
    full.set(payload, prefix.length + 2);
    return decodeControlMessage(full, dialect);
}

/**
 * SHA-256 hashes of the bundled dev relay's fixed certificate
 * (tools/moq-testrelay/devcert.pem). tests/heux/moq-devcert-contract.test.mjs
 * recomputes both from the checked-in PEM, so a regenerated certificate
 * fails the tests until the new values land here.
 *
 * Chromium matches serverCertificateHashes against the SHA-256 of the whole
 * certificate (DER), while the W3C spec mandates the SubjectPublicKeyInfo
 * hash — both are sent so the pin works in Chromium and in spec-conforming
 * browsers. Pinning applies to loopback URLs ONLY — see webTransportInit.
 * Chrome additionally caps pinned self-signed certificates at ~14 days of
 * validity, which is why the checked-in cert is short-lived.
 */
export const DEV_RELAY_CERT_SHA256 =
    'QyzL9dk53t4Llq3eqkuoE/+SaShN4sS3Er8gpZc9Su4=';
export const DEV_RELAY_SPKI_SHA256 =
    'ncKY56LZTf8yRg7GbGBCpbxg+7K+XnL2w7hTU18J/Fw=';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * WebTransport init options.
 *
 * The bundled MoQ test relay serves a self-signed certificate, which Chrome
 * rejects for WebTransport no matter what origin exceptions exist. For
 * loopback URLs the client therefore pins the relay's fixed dev certificate
 * via serverCertificateHashes — the only supported bypass, and safe here
 * because it is scoped to a certificate that is by design useless anywhere
 * but 127.0.0.1. Public endpoints keep plain TLS with no pinning.
 *
 * @param {string} url
 * @returns {{serverCertificateHashes?: Array<{algorithm: string, value: ArrayBuffer}>}|undefined}
 */
export function webTransportInit(url) {
    let host;
    try {
        host = new URL(webTransportUrl(url)).hostname;
    } catch {
        return undefined;
    }
    if (!LOOPBACK_HOSTS.has(host)) return undefined;
    return {
        serverCertificateHashes: [
            DEV_RELAY_CERT_SHA256,
            DEV_RELAY_SPKI_SHA256,
        ].map((h) => ({
            algorithm: 'sha-256',
            value: Uint8Array.from(atob(h), (c) => c.charCodeAt(0)).buffer,
        })),
    };
}

/**
 * Open the WebTransport handshake, scaled down to one retry for pin mismatch.
 *
 * @param {typeof globalThis.WebTransport} WT
 * @param {string} url
 * @param {object|undefined} init
 */
async function openTransport(WT, url, init) {
    const transport = new WT(webTransportUrl(url), init);
    try {
        await transport.ready;
    } catch (err) {
        try {
            transport.close();
        } catch {
            /* ignore */
        }
        throw err;
    }
    return transport;
}

/**
 * Open a MOQT session.
 *
 * @param {string} url moqt:// or https:// endpoint
 * @param {object} [options]
 * @param {typeof globalThis.WebTransport} [options.WebTransportImpl]
 * @param {'draft22'|'draft16'|'auto'} [options.dialect] wire dialect; 'auto'
 *   (default) tries draft-22 first and falls back to draft-16, which is what
 *   every public relay currently deploys
 * @param {string[]} [options.namespace] catalog namespace (default: URL path)
 * @param {boolean} [options.subscribeCatalog] subscribe to the catalog track automatically
 * @param {(e: object) => void} [options.onEvent]
 * @param {(state: string) => void} [options.onState]
 */
export async function connectMoq(url, options = {}) {
    const WT = options.WebTransportImpl ?? globalThis.WebTransport;
    if (!WT) throw new Error('WebTransport unsupported in this browser');

    const dialect = options.dialect ?? 'auto';
    if (dialect !== 'auto') return openSession(url, dialect, options, WT);

    // Version probing: draft-22 is the newest spec text, draft-16 is what the
    // public relays speak. The two are not wire-compatible at the first
    // message, so the dialect is chosen by attempting them in order.
    let lastError = null;
    for (const candidate of ['draft22', 'draft16']) {
        let attempt = null;
        try {
            attempt = await openSession(url, candidate, options, WT);
            return attempt;
        } catch (e) {
            lastError = e;
            // A half-open session keeps reader loops alive; release it before
            // probing the next dialect.
            await attempt?.session?.close?.().catch(() => {});
        }
    }
    throw lastError ?? new Error('no MoQ dialect succeeded');
}

/** Open one session on one dialect; throws when the peer will not talk to it. */
async function openSession(url, dialect, options, WT) {
    const namespace = options.namespace?.length
        ? options.namespace
        : namespaceFromUrl(url);
    const session = new MoqSession(url, namespace, options, dialect);
    try {
        return await openSessionInner(
            session,
            url,
            dialect,
            options,
            WT,
            namespace
        );
    } catch (e) {
        // Never leave a half-open session (reader loops, telemetry timer)
        // behind when the peer refuses this dialect.
        await session.close?.().catch(() => {});
        throw e;
    }
}

async function openSessionInner(session, url, dialect, options, WT, namespace) {
    // Loopback gets the relay's dev certificate pinned (see webTransportInit).
    // If a locally trusted certificate is used instead (mkcert-style CA), the
    // pin cannot match, so fall back to plain TLS once.
    try {
        session.transport = await openTransport(WT, url, webTransportInit(url));
    } catch (e) {
        if (!webTransportInit(url)) throw e;
        // Locally trusted certificate (mkcert-style CA): retry without the pin.
        session.transport = await openTransport(WT, url, undefined);
    }

    await session.transport.ready;
    session.onState('connected');

    if (dialect === 'draft16') {
        // §3.3 (draft-16): one client-initiated bidirectional control stream
        // carries CLIENT_SETUP, SUBSCRIBE and the matching replies.
        const control = await session.transport.createBidirectionalStream();
        const writer = control.writable.getWriter();
        await writer.write(encodeSetup16());
        session.controlWriter = writer;
        session.onState('setup-sent');
        session.consumeStreams();
        session.consumeDatagrams();
        session.consumeControl16(control.readable);
    } else {
        session.onState('connecting');
        // Control stream: SETUP is the first message (§6.3 of draft-22).
        // createUnidirectionalStream() resolves to the WritableStream itself.
        const control = await session.transport.createUnidirectionalStream();
        const w = control.getWriter();
        await w.write(encodeSetup([]));
        session.controlWriter = w;
        session.onState('setup-sent');
        session.consumeStreams();
        session.consumeDatagrams();
        await session.awaitSetup();
    }

    if (options.subscribeCatalog !== false) {
        // MSF §5: the catalog track is named 'catalog' in the broadcast namespace.
        await session.subscribe(
            session.nextRequestId(),
            namespace,
            CATALOG_TRACK_NAME
        );
    }
    return { session };
}

export class MoqSession {
    constructor(url, namespace, options = {}, dialect = 'draft22') {
        this.url = url;
        this.namespace = namespace;
        this.options = options;
        this.dialect = dialect;
        this.transport = null;
        this.controlWriter = null;
        this.setupComplete = false;
        this.closed = false;

        /** @type {Map<number, {requestId:number, namespace:string[], name:string, label:string, trackAlias:number|null, status:string, openedAt:number, subscribeRttMs:number|null, continuity:{nextGroup:number, nextObject:number}}>} */
        this.subscriptions = new Map();
        /** @type {Map<number, number>} track alias → request id */
        this.aliasToRequest = new Map();
        this.catalogState = { appliedGroup: -1, appliedObject: -1 };
        this.lastSubgroupPriority = null;
        // Objects for aliases we have not yet correlated (they may arrive
        // before the SUBSCRIBE_OK reply) are buffered briefly (draft §3.1.3.1).
        this.pendingByAlias = new Map();
        this.pendingAliasBudget = 4096;
        /** @type {Map<number, (r: object) => void>} outstanding TRACK_STATUS probes */
        this.trackStatusWaiters = new Map();
        this.catalog = null;
        this.continuityGaps = 0;
        this.lastSample = null;
        this.telemetryTimer = null;

        this._interval = {
            objects: 0,
            bytes: 0,
            groups: 0,
            gaps: 0,
            since: Date.now(),
        };
        this._lastSubscribeRttMs = 0;
        // §6.4.2.1 / §9.1: the client's Request IDs are even, start at 0 and
        // increment by 2; the peer closes the session on a wrong sequence.
        this._requestCounter = 0;
        // Resolved when the peer's SETUP lands; awaited by dialect probing.
        this._setupResolve = null;
        this._setupPromise = new Promise((r) => {
            this._setupResolve = r;
        });
    }

    /** Resolve the setup promise (idempotent). */
    _resolveSetup() {
        this._setupResolve?.();
        this._setupResolve = null;
    }

    /**
     * Wait for the peer's SETUP reply, bounded by a timeout. Used by dialect
     * probing: a server that will not answer the setup on this dialect closes
     * the connection or stays silent, both of which must fail fast.
     */
    async awaitSetup(timeoutMs = 4000) {
        let timer;
        const racers = [
            new Promise((_, reject) => {
                timer = setTimeout(
                    () =>
                        reject(
                            new Error(`no SETUP reply within ${timeoutMs}ms`)
                        ),
                    timeoutMs
                );
            }),
        ];
        // Only real WebTransport promises can be raced; guard for test doubles
        // (and older implementations) that expose `closed` as a non-promise.
        const closed = this.transport?.closed;
        if (closed && typeof closed.then === 'function') {
            racers.push(
                closed.then(
                    (i) =>
                        Promise.reject(
                            new Error(
                                `transport closed before SETUP: ${i?.reason ?? 'peer'}`
                            )
                        ),
                    (e) => Promise.reject(e)
                )
            );
        }
        racers.push(this._setupPromise);
        try {
            await Promise.race(racers);
        } finally {
            clearTimeout(timer);
        }
        return true;
    }

    onState(state) {
        this.options.onState?.(state);
        this._emit({ type: 'state', state });
    }
    _emit(e) {
        if (!this.closed) this.options.onEvent?.(e);
    }

    // --- incoming stream dispatch -------------------------------------------------

    async consumeStreams() {
        try {
            for await (const stream of this.transport
                .incomingUnidirectionalStreams) {
                const reader = stream.getReader?.();
                if (!reader) continue;
                const buf = new StreamByteReader(reader);
                const peeked = await buf.peekVarint();
                if (peeked === null) continue;
                if (
                    peeked.value === BigInt(MOQ_MESSAGE.SETUP) ||
                    peeked.value === BigInt(M16.SERVER_SETUP)
                ) {
                    this.readControlStream(buf);
                } else if (
                    peeked.size === 1 &&
                    (Number(peeked.value) & 0x10) !== 0
                ) {
                    this.readSubgroupStream(buf);
                }
                // Anything else: unknown unidirectional stream type per §6.4.1.
            }
        } catch {
            /* transport closed */
        }
    }

    async readControlStream(buf) {
        try {
            for (;;) {
                const msg = await readControlFrame(buf, this.dialect);
                if (msg.type === 'SETUP' || msg.type === 'SERVER_SETUP') {
                    this.setupComplete = true;
                    this.onState('setup-complete');
                    this._emit({ type: 'setup', options: msg.options ?? [] });
                    this._resolveSetup();
                    this.startTelemetry();
                    continue;
                }
                this.handleControlMessage(msg);
            }
        } catch {
            /* control stream ended */
        }
    }

    /**
     * draft-16 control loop: the bidirectional control stream carries
     * SERVER_SETUP, SUBSCRIBE_OK and REQUEST_ERROR, each SUBSCRIBE_OK
     * carrying its Request ID (§9.10).
     */
    async consumeControl16(readable) {
        const reader = readable.getReader();
        const buf = new StreamByteReader(reader);
        try {
            for (;;) {
                const msg = await readControlFrame(buf, 'draft16');
                if (
                    msg.type === 'SERVER_SETUP' ||
                    msg.type === 'CLIENT_SETUP'
                ) {
                    this.setupComplete = true;
                    this.onState('setup-complete');
                    this._emit({ type: 'setup', options: msg.params ?? [] });
                    this._resolveSetup();
                    this.startTelemetry();
                    continue;
                }
                if (msg.type === 'SUBSCRIBE_OK') {
                    const requestId = msg.requestId;
                    const sub = this.subscriptions.get(requestId);
                    if (sub) {
                        sub.trackAlias = msg.trackAlias;
                        sub.status = 'ok';
                        sub.subscribeRttMs = Date.now() - sub.openedAt;
                        this._lastSubscribeRttMs = sub.subscribeRttMs;
                        this.aliasToRequest.set(msg.trackAlias, requestId);
                        this._emit({
                            type: 'subscription',
                            requestId,
                            status: 'ok',
                            trackAlias: msg.trackAlias,
                            rttMs: sub.subscribeRttMs,
                            trackProperties: msg.trackProperties,
                        });
                        this.flushAlias(msg.trackAlias);
                    }
                    continue;
                }
                if (msg.type === 'REQUEST_ERROR') {
                    const waiter = this.trackStatusWaiters.get(msg.requestId);
                    if (waiter) {
                        this.trackStatusWaiters.delete(msg.requestId);
                        waiter({
                            ok: false,
                            code: msg.code,
                            reason: msg.reason,
                        });
                        continue;
                    }
                    const sub = this.subscriptions.get(msg.requestId);
                    if (sub) sub.status = 'error';
                    this._emit({
                        type: 'subscription',
                        requestId: msg.requestId,
                        status: 'error',
                        error: msg.reason,
                        code: msg.code,
                    });
                    continue;
                }
                if (msg.type === 'REQUEST_OK') {
                    const waiter = this.trackStatusWaiters.get(
                        this._lastStatusId
                    );
                    void waiter;
                    continue;
                }
                this.handleControlMessage(msg);
            }
        } catch {
            /* control stream ended */
        }
    }

    handleControlMessage(msg) {
        switch (msg.type) {
            case 'SUBSCRIBE_OK':
                this._emit({
                    type: 'server-subscribe-ok',
                    trackAlias: msg.trackAlias,
                });
                break;
            case 'REQUEST_ERROR':
                this._emit({
                    type: 'request-error',
                    code: msg.code,
                    reason: msg.reason,
                });
                break;
            case 'TRACK_STATUS':
                this._emit({
                    type: 'track-status',
                    trackAlias: msg.trackAlias,
                    params: msg.params,
                    properties: msg.trackProperties,
                });
                break;
            case 'NAMESPACE':
                this._emit({ type: 'namespace', namespace: msg.namespace });
                break;
            case 'NAMESPACE_DONE':
                this._emit({
                    type: 'namespace-done',
                    namespace: msg.namespace,
                });
                break;
            case 'GOAWAY':
                this._emit({ type: 'goaway' });
                this.onState('goaway');
                break;
            default:
                break;
        }
    }

    // --- subscriptions ---------------------------------------------------------------

    /**
     * Subscribe to a track. The reply (SUBSCRIBE_OK or REQUEST_ERROR) arrives
     * on the same bidirectional stream and is correlated by request id.
     * @returns {Promise<number>} request id
     */
    /**
     * Ask a relay whether a track exists, without subscribing (draft-16
     * §9.19). Used for broadcast discovery: Cloudflare-style relays publish
     * their own set of tracks, so the catalog track name is not universal.
     * @returns {Promise<{ok: boolean, code?: number, reason?: string}>}
     */
    probeTrack(namespace, name) {
        if (this.dialect !== 'draft16') {
            return Promise.resolve({
                ok: false,
                reason: 'track discovery is draft-16 only',
            });
        }
        const id = this.nextRequestId();
        this._lastStatusId = id;
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                this.trackStatusWaiters.delete(id);
                resolve({ ok: false, reason: 'no TRACK_STATUS reply' });
            }, 4000);
            this.trackStatusWaiters.set(id, (r) => {
                clearTimeout(timer);
                resolve(r);
            });
            this.controlWriter
                .write(encodeTrackStatus(id, namespace, name, M16.TRACK_STATUS))
                .catch((e) => {
                    clearTimeout(timer);
                    this.trackStatusWaiters.delete(id);
                    resolve({ ok: false, reason: String(e?.message ?? e) });
                });
        });
    }

    /** Next client Request ID: even, starting at 0, +2 per request. */
    nextRequestId() {
        const id = this._requestCounter;
        this._requestCounter += 2;
        return id;
    }

    async subscribe(requestId, namespace, name) {
        const id = requestId ?? this.nextRequestId();
        if (this.dialect === 'draft16') {
            // Requests share the single bidirectional control stream (§3.3);
            // replies arrive there and are routed by their Request ID.
            await this.controlWriter.write(
                encodeSubscribe(id, namespace, name, [])
            );
        } else {
            const stream = await this.transport.createBidirectionalStream();
            const writer = stream.writable.getWriter();
            await writer.write(encodeSubscribe(id, namespace, name, []));
            this.readSubscribeReply(stream, id);
        }
        this.subscriptions.set(id, {
            requestId: id,
            namespace,
            name,
            label: name,
            trackAlias: null,
            status: 'pending',
            openedAt: Date.now(),
            subscribeRttMs: null,
            continuity: { nextGroup: -1, nextObject: -1 },
        });
        this._emit({
            type: 'subscription',
            requestId: id,
            status: 'pending',
            namespace,
            name,
        });
        return id;
    }

    async readSubscribeReply(stream, requestId) {
        try {
            const reader = stream.readable.getReader();
            const buf = new StreamByteReader(reader);
            const msg = await readControlFrame(buf);
            const sub = this.subscriptions.get(requestId);
            if (msg.type === 'SUBSCRIBE_OK') {
                if (sub) {
                    sub.trackAlias = msg.trackAlias;
                    sub.status = 'ok';
                    sub.subscribeRttMs = Date.now() - sub.openedAt;
                    this._lastSubscribeRttMs = sub.subscribeRttMs;
                    this.aliasToRequest.set(msg.trackAlias, requestId);
                    this._emit({
                        type: 'subscription',
                        requestId,
                        status: 'ok',
                        trackAlias: msg.trackAlias,
                        rttMs: sub.subscribeRttMs,
                        trackProperties: msg.trackProperties,
                    });
                    this.flushAlias(msg.trackAlias);
                }
            } else if (msg.type === 'REQUEST_ERROR') {
                if (sub) sub.status = 'error';
                this._emit({
                    type: 'subscription',
                    requestId,
                    status: 'error',
                    error: msg.reason,
                    code: msg.code,
                });
            }
        } catch {
            /* reply stream closed before a response */
        }
    }

    // --- objects -----------------------------------------------------------------------

    async consumeDatagrams() {
        const readable = this.transport.datagrams?.readable;
        if (!readable) return;
        const reader = readable.getReader();
        try {
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                if (!(value instanceof Uint8Array)) continue;
                try {
                    this.handleObjectDatagram(value);
                } catch {
                    /* malformed datagram */
                }
            }
        } catch {
            /* datagram duct closed */
        }
    }

    handleObjectDatagram(bytes) {
        const obj =
            this.dialect === 'draft16'
                ? decodeObjectDatagram16(bytes)
                : decodeObjectDatagram(bytes);
        this._accountObject('datagram', obj);
    }

    async readSubgroupStream(buf) {
        try {
            const flags = Number(await buf.readVarint());
            if ((flags & 0x10) === 0)
                throw new Error(
                    `bad SUBGROUP_HEADER marker 0x${flags.toString(16)}`
                );
            const trackAlias = Number(await buf.readVarint());
            const groupId = Number(await buf.readVarint());
            const mode = (flags & 0x06) >> 1;
            let subgroup = 0;
            if (mode === 2) subgroup = Number(await buf.readVarint());
            else if (mode === 3) throw new Error('reserved subgroup id mode');
            else if (mode === 1) subgroup = -1; // resolved at first object
            // DEFAULT_PRIORITY=0 means a priority byte follows the header.
            const priority =
                (flags & 0x20) !== 0 ? null : await buf.readUint8();
            const hasProperties = (flags & 0x01) !== 0;
            this.lastSubgroupPriority = priority;
            this.lastSubgroupEndOfGroup = (flags & 0x08) !== 0;
            // mode 0b01: subgroup id = first object's id; resolve lazily.
            let priorObjectId = null;
            for (;;) {
                const delta = Number(await buf.readVarint());
                const objectId =
                    priorObjectId === null ? delta : priorObjectId + delta + 1;
                if (mode === 1 && priorObjectId === null) subgroup = objectId;
                let properties = null;
                if (hasProperties)
                    properties = await readKvps(
                        buf,
                        Number(await buf.readVarint())
                    );
                const payloadLen = Number(await buf.readVarint());
                let status = 0;
                let payload = null;
                if (payloadLen === 0) {
                    status = Number(await buf.readVarint());
                } else {
                    payload = await buf.readBytes(payloadLen);
                }
                this._accountObject('subgroup', {
                    trackAlias,
                    groupId,
                    subgroupId: subgroup,
                    objectId,
                    payload,
                    status,
                    properties,
                });
                priorObjectId = objectId;
            }
        } catch {
            /* subgroup stream ended */
        }
    }

    _accountObject(deliveryMode, obj) {
        const requestId = this.aliasToRequest.get(obj.trackAlias);
        if (requestId == null) {
            obj.deliveryMode = deliveryMode;
            this.bufferUnknownAlias(obj);
            return;
        }
        this._interval.objects += 1;
        this._interval.bytes += obj.payload?.length ?? 0;

        const sub = this.subscriptions.get(requestId);
        if (sub) {
            const r = trackObjectContinuity(sub.continuity, obj);
            sub.continuity = r.state;
            if (r.gap) {
                this.continuityGaps += 1;
                this._interval.gaps += 1;
                this._emit({
                    type: 'gap',
                    requestId,
                    groupId: obj.groupId,
                    objectId: obj.objectId,
                });
            }
            if (r.newGroup) this._interval.groups += 1;

            if (sub.name === CATALOG_TRACK_NAME && obj.payload) {
                this.applyCatalogPayload(obj);
            }
        }
        this._emit({
            type: 'object',
            deliveryMode,
            trackAlias: obj.trackAlias,
            groupId: obj.groupId,
            subgroupId: obj.subgroupId ?? null,
            objectId: obj.objectId,
            bytes: obj.payload?.length ?? 0,
        });
    }

    /** Buffer an object until its track alias is learned (§3.1.3.1). */
    bufferUnknownAlias(obj) {
        if (this.pendingAliasBudget <= 0) return;
        this.pendingAliasBudget -= 1;
        const list = this.pendingByAlias.get(obj.trackAlias) ?? [];
        this.pendingByAlias.set(obj.trackAlias, [...list, obj]);
    }

    /** Flush buffered objects once an alias is correlated to a subscription. */
    flushAlias(trackAlias) {
        const pending = this.pendingByAlias.get(trackAlias);
        if (!pending || pending.length === 0) return;
        this.pendingByAlias.delete(trackAlias);
        for (const obj of pending) {
            this._accountObject(obj.deliveryMode ?? 'subgroup', obj);
        }
    }

    applyCatalogPayload(obj) {
        try {
            const doc = JSON.parse(new TextDecoder().decode(obj.payload));
            // MSF §5: object 0 of a group is the independent catalog.
            const decision = applyCatalogObject(this.catalogState, {
                groupId: obj.groupId,
                objectId: obj.objectId,
            });
            if (decision.kind === 'delta-stale') return;
            this.catalogState = decision.state;
            this.catalog = normalizeCatalog(doc);
            this._emit({ type: 'catalog', catalog: this.catalog });
        } catch {
            /* non-JSON catalog payload */
        }
    }

    // --- telemetry -----------------------------------------------------------------------

    startTelemetry() {
        // A session can be closed before the peer's SETUP frame arrives (the
        // reader loops run concurrently), so never arm the timer on a dead
        // session.
        if (this.telemetryTimer || this.closed) return;
        this.telemetryTimer = setInterval(() => {
            const now = Date.now();
            const intervalMs = now - this._interval.since;
            const sample = deriveMoqSample({
                t: now,
                objectsDelta: this._interval.objects,
                bytesDelta: this._interval.bytes,
                intervalMs,
                lastSubscribeRttMs: this._lastSubscribeRttMs,
                activeSubscriptions: this.activeSubscriptionCount(),
                groupsDelta: this._interval.groups,
                gapsDelta: this._interval.gaps,
                encrypted: true,
            });
            this.lastSample = sample;
            this._lastSubscribeRttMs = 0;
            this._interval = {
                objects: 0,
                bytes: 0,
                groups: 0,
                gaps: 0,
                since: now,
            };
            this._emit({ type: 'telemetry', sample });
        }, 1000);
    }

    activeSubscriptionCount() {
        let n = 0;
        for (const s of this.subscriptions.values())
            if (s.status === 'ok') n += 1;
        return n;
    }

    subscriptionList() {
        return [...this.subscriptions.values()].map((s) => ({
            requestId: s.requestId,
            namespace: s.namespace.join('/'),
            name: s.name,
            trackAlias: s.trackAlias,
            status: s.status,
            subscribeRttMs: s.subscribeRttMs,
        }));
    }

    async close() {
        if (this.closed) return;
        this.closed = true;
        if (this.telemetryTimer) clearInterval(this.telemetryTimer);
        try {
            await this.transport.close();
        } catch {
            /* already closed */
        }
        this.onState('closed');
    }
}
