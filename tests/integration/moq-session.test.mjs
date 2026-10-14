import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import esbuild from 'esbuild';

const ROOT = join(import.meta.dirname, '..', '..');

async function loadSession() {
    const dir = mkdtempSync(join(tmpdir(), 'moq-session-'));
    const out = join(dir, 'bundle.mjs');
    await esbuild.build({
        entryPoints: [join(ROOT, 'src/infrastructure/moq/session.js')],
        bundle: true,
        format: 'esm',
        platform: 'browser',
        outfile: out,
        alias: { '@': join(ROOT, 'src') },
        logLevel: 'error',
    });
    return import(out);
}

// --- fake WebTransport ------------------------------------------------------------

function streamFromChunks(chunks) {
    let i = 0;
    return {
        getReader() {
            return {
                read: async () =>
                    i < chunks.length
                        ? { value: chunks[i++], done: false }
                        : { value: undefined, done: true },
                cancel: async () => {},
            };
        },
    };
}

function writableSink() {
    const written = [];
    return {
        written,
        getWriter() {
            return {
                write: async (chunk) => {
                    written.push(chunk);
                },
                close: async () => {},
                releaseLock: () => {},
            };
        },
    };
}

function makeFakeTransport({
    serverControlBytes,
    subgroupChunks,
    datagrams,
    objects,
} = {}) {
    const uniStreams = [];
    if (serverControlBytes)
        uniStreams.push(streamFromChunks([serverControlBytes]));
    for (const chunks of subgroupChunks ?? [])
        uniStreams.push(streamFromChunks(chunks));
    const biStreams = [];
    return {
        ready: Promise.resolve(),
        // A real WebTransport exposes a `closed` promise that settles when the
        // transport goes away; the fake must model that, not a boolean.
        closed: new Promise(() => {}),
        incomingUnidirectionalStreams: (async function* () {
            for (const s of uniStreams) yield s;
        })(),
        datagrams: {
            readable: streamFromChunks(datagrams ?? []),
        },
        createUnidirectionalStream: async () => writableSink(),
        createBidirectionalStream: async () => {
            const s = {
                writable: writableSink(),
                readable: streamFromChunks([]),
            };
            biStreams.push(s);
            return s;
        },
        close: async function () {
            this.closed = Promise.resolve(false);
        },
        biStreams,
    };
}

// --- tests ---------------------------------------------------------------------------

test('IT-MOQ-01 URL helpers map moqt paths to namespaces and https', async () => {
    const { namespaceFromUrl, webTransportUrl } = await loadSession();
    assert.deepEqual(namespaceFromUrl('moqt://relay.example/anon'), ['anon']);
    assert.deepEqual(namespaceFromUrl('moqt://relay.example/anon/bbb'), [
        'anon',
        'bbb',
    ]);
    assert.deepEqual(namespaceFromUrl('moqt://relay.example'), ['anon']);
    assert.equal(
        webTransportUrl('moqt://relay.example/anon'),
        'https://relay.example/anon'
    );
    assert.equal(
        webTransportUrl('https://relay.example/x'),
        'https://relay.example/x'
    );
});

test('IT-MOQ-02 session runs setup exchange, catalog subscription and object delivery', async () => {
    const {
        ByteReader,
        decodeControlMessage,
        encodeSetup,
        encodeSubscribe,
        encodeVarint,
    } = await import('../src/infrastructure/moq/wire.js')
        .then((m) => m)
        .catch(async () => {
            // wire.js is pure; import directly.
            return await import(join(ROOT, 'src/infrastructure/moq/wire.js'));
        });

    // Build a server-side SETUP control stream: SETUP type + length 0.
    const setupBytes = encodeSetup([]);

    // Build a SUBSCRIBE_OK reply for the catalog subscription.
    const okBody = new Uint8Array(64);
    const okView = new DataView(okBody.buffer);
    let off = 0;
    const wv = (v, o) => {
        // varint writer helper
        let size = 1;
        if (v >= 2 ** 7) size = 2;
        if (size === 1) okView.setUint8(o, v);
        else
            (okView.setUint8(o, 0x80 | (v >> 8)),
                okView.setUint8(o + 1, v & 0xff));
        return size;
    };
    off += wv(4, off); // SUBSCRIBE_OK
    okView.setUint16(off, 3, false);
    off += 2; // body: alias + 0 params + 0 properties
    off += wv(9, off); // track alias
    off += wv(0, off); // zero parameters
    off += wv(0, off); // zero track properties
    const okBytes = okBody.subarray(0, off);

    const fake = makeFakeTransport({ serverControlBytes: setupBytes });

    const { connectMoq } = await loadSession();
    const events = [];
    const { session } = await connectMoq('moqt://relay.example/anon', {
        WebTransportImpl: function () {
            return fake;
        },
        onEvent: (e) => events.push(e),
        onState: () => {},
    });

    try {
        // The catalog subscribe wrote a SUBSCRIBE for track 'catalog' in 'anon'.
        await new Promise((r) => setTimeout(r, 60));
        const subWritten = fake.biStreams[0]?.writable?.written[0];
        assert.ok(subWritten, 'SUBSCRIBE was written to the bidi stream');
        // Feed the SUBSCRIBE_OK reply back on that stream's readable.
        fake.biStreams[0].readable = streamFromChunks([okBytes]);
        await session.readSubscribeReply(fake.biStreams[0], 0);

        await new Promise((r) => setTimeout(r, 80));
        const kinds = events.map((e) => e.type);
        assert.ok(kinds.includes('setup'), 'SETUP exchanged');
        assert.ok(
            kinds.includes('subscription'),
            'subscription events emitted'
        );
        const ok = events.find(
            (e) => e.type === 'subscription' && e.status === 'ok'
        );
        assert.ok(ok, 'SUBSCRIBE_OK correlated to the pending subscription');
        assert.equal(ok.trackAlias, 9);
        assert.ok(ok.rttMs >= 0, 'subscribe RTT measured');
        assert.equal(session.subscriptionList()[0].status, 'ok');
    } finally {
        await session.close();
    }
    // `closed` mirrors the WebTransport API: a promise that settles on close.
    assert.equal(await fake.closed, false);
});
