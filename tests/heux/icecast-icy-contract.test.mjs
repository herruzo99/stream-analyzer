// ICY (Icecast/Shoutcast) contract tests — written before the implementation.
// Pure logic; no network. Grounded in live-reachable public stations
// (SomaFM, Radio Paradise, thisisdax) and the SHOUTcast/Icecast metadata
// mechanism: `Icy-MetaData: 1` → `icy-metaint: N` audio bytes → 1 length byte
// → N*16 metadata bytes → repeat.

import assert from 'node:assert/strict';
import test from 'node:test';
import {
    parseIcyHeaders,
    parseIcyMetadataBlock,
    IcyStreamParser,
    icyCodecFromContentType,
    summarizeMount,
} from '../../src/features/icecastSource/domain/icy.js';

// --- response headers -------------------------------------------------------------

test('AT-ICY-01 response headers map to a mount descriptor', () => {
    const d = parseIcyHeaders({
        'content-type': 'audio/mpeg',
        'icy-name':
            'Groove Salad: a nicely chilled plate of ambient beats [SomaFM]',
        'icy-genre': 'Ambient Chill',
        'icy-url': 'https://somafm.com/groovesalad/',
        'icy-br': '128',
        'icy-pub': '1',
        'icy-metaint': '16000',
        server: 'Icecast 2.4.0-kh22-Soma1.7',
    });
    assert.equal(d.codec, 'mp3');
    assert.equal(d.bitrateKbps, 128);
    assert.equal(d.metaIntBytes, 16000);
    assert.equal(d.hasInbandMetadata, true);
    assert.equal(d.public, true);
    assert.equal(d.server, 'Icecast 2.4.0-kh22-Soma1.7');
    assert.equal(d.genre, 'Ambient Chill');
    assert.equal(d.url, 'https://somafm.com/groovesalad/');
    assert.ok(d.name.includes('Groove Salad'));
});

test('AT-ICY-02 stations without icy-metaint are metadata-less but valid', () => {
    const d = parseIcyHeaders({
        'content-type': 'audio/aac',
        'icy-br': '128',
        'icy-name': 'Radio Paradise (128k aac)',
    });
    assert.equal(d.codec, 'aac');
    assert.equal(
        d.hasInbandMetadata,
        false,
        'no metaint means no in-band metadata'
    );
    assert.equal(d.metaIntBytes, 0);
    assert.equal(d.bitrateKbps, 128);
});

test('AT-ICY-03 malformed numbers degrade to null, never NaN', () => {
    const d = parseIcyHeaders({
        'icy-br': 'not-a-number',
        'icy-metaint': '-4',
    });
    assert.equal(d.bitrateKbps, null);
    assert.equal(d.metaIntBytes, 0);
});

test('AT-ICY-04 unknown content types are reported, not guessed', () => {
    assert.equal(icyCodecFromContentType('audio/mpeg').codec, 'mp3');
    assert.equal(icyCodecFromContentType('audio/aac').codec, 'aac');
    assert.equal(icyCodecFromContentType('audio/aacp').codec, 'aac');
    assert.equal(icyCodecFromContentType('application/ogg').codec, 'ogg');
    assert.equal(icyCodecFromContentType('audio/flac').codec, 'flac');
    assert.equal(icyCodecFromContentType('text/html').codec, 'not-audio');
    assert.equal(icyCodecFromContentType(undefined).codec, 'unknown');
});

// --- metadata blocks ---------------------------------------------------------------

test('AT-ICY-05 StreamTitle/StreamUrl parse with NUL padding', () => {
    const block = new TextEncoder().encode(
        "StreamTitle='Nils Frahm - Says';StreamUrl='https://example.com/track';"
    );
    const padded = new Uint8Array(96);
    padded.set(block);
    const meta = parseIcyMetadataBlock(padded);
    assert.deepEqual(meta, {
        title: 'Nils Frahm - Says',
        url: 'https://example.com/track',
        fields: {
            StreamTitle: 'Nils Frahm - Says',
            StreamUrl: 'https://example.com/track',
        },
    });
});

test('AT-ICY-06 doubled single quotes are unescaped, empty titles stay empty', () => {
    const b = new TextEncoder().encode("StreamTitle='It''s a test';");
    const meta = parseIcyMetadataBlock(b);
    assert.equal(meta.title, "It's a test");
    const empty = parseIcyMetadataBlock(
        new TextEncoder().encode("StreamTitle='';")
    );
    assert.equal(empty.title, '');
});

test('AT-ICY-07 a block with no parsable fields reports no title', () => {
    const meta = parseIcyMetadataBlock(new Uint8Array([0, 0, 0]));
    assert.equal(meta.title, null);
    assert.deepEqual(meta.fields, {});
});

// --- in-band framing ---------------------------------------------------------------

test('AT-ICY-08 the framing state machine splits audio from metadata', () => {
    const p = new IcyStreamParser(4); // tiny metaint for the test
    // 4 audio bytes, then L=2 (32 bytes), then 4 audio bytes, then L=0.
    const title = new TextEncoder().encode("StreamTitle='A - B';");
    const block = new Uint8Array(32);
    block.set(title);
    const stream = new Uint8Array([1, 2, 3, 4, 2, ...block, 5, 6, 7, 8, 0]);
    const out = p.push(stream);
    assert.equal(out.audioBytes, 8);
    assert.equal(out.events.length, 1, 'only the non-empty block is an event');
    assert.equal(out.events[0].title, 'A - B');
    assert.equal(p.audioBytesTotal, 8);
});

test('AT-ICY-09 chunk boundaries never split a metadata block', () => {
    const p = new IcyStreamParser(2);
    const title = new TextEncoder().encode("StreamTitle='Split - Test';");
    const block = new Uint8Array(32); // L=2
    block.set(title);
    const stream = new Uint8Array([1, 2, 2, ...block, 3, 4, 0]);
    // Feed it one byte at a time — the worst case for reassembly.
    let events = [];
    for (const b of stream) {
        events.push(...p.push(Uint8Array.of(b)).events);
    }
    assert.equal(events.length, 1);
    assert.equal(events[0].title, 'Split - Test');
    assert.equal(p.audioBytesTotal, 4);
});

test('AT-ICY-10 L=0 blocks advance the audio window without an event', () => {
    const p = new IcyStreamParser(2);
    const out = p.push(new Uint8Array([1, 2, 0, 3, 4, 0]));
    assert.equal(out.audioBytes, 4);
    assert.equal(out.events.length, 0);
    assert.equal(p.blocks, 2, 'two metadata windows were crossed');
});

test('AT-ICY-11 a metaint of 0 makes every byte audio', () => {
    const p = new IcyStreamParser(0);
    const out = p.push(new Uint8Array([1, 2, 3, 4]));
    assert.equal(out.audioBytes, 4);
    assert.equal(out.events.length, 0);
});

// --- mount summary -----------------------------------------------------------------

test('AT-ICY-12 summarizeMount combines headers with live stats', () => {
    const d = parseIcyHeaders({
        'content-type': 'audio/mpeg',
        'icy-name': 'Test FM',
        'icy-br': '128',
        'icy-metaint': '8192',
    });
    const s = summarizeMount(d, {
        bytesTotal: 160_000,
        windowMs: 4000,
        events: [{ title: 'A - B', atMs: 100 }],
    });
    // 160000 bytes in 4 s = 320 kbps.
    assert.equal(s.measuredKbps, 320);
    assert.equal(s.advertisedKbps, 128);
    assert.equal(s.efficiency, 2.5, 'measured / advertised');
    assert.equal(s.lastTitle, 'A - B');
});

test('AT-ICY-13 efficiency is null when the station never advertises a rate', () => {
    const d = parseIcyHeaders({ 'content-type': 'audio/mpeg' });
    const s = summarizeMount(d, {
        bytesTotal: 1000,
        windowMs: 1000,
        events: [],
    });
    assert.equal(s.measuredKbps, 8);
    assert.equal(s.efficiency, null);
});
