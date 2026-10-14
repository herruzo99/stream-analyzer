import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, X509Certificate } from 'node:crypto';
import esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const relayCert = readFileSync(join(ROOT, 'tools/moq-testrelay/devcert.pem'), 'utf8');

// session.js uses the @/ alias internally, so load it the way the integration
// tests do: bundle with esbuild first.
async function loadSessionModule() {
    const dir = mkdtempSync(join(tmpdir(), 'moq-devcert-'));
    const out = join(dir, 'session.mjs');
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

const { DEV_RELAY_CERT_SHA256, DEV_RELAY_SPKI_SHA256, webTransportInit } =
    await loadSessionModule();

/** SHA-256 (base64) of the whole certificate DER. */
const certHash = (cert) => createHash('sha256').update(new X509Certificate(cert).raw).digest('base64');
/** SHA-256 (base64) of the certificate's DER SubjectPublicKeyInfo. */
const spkiHash = (cert) =>
    createHash('sha256')
        .update(new X509Certificate(cert).publicKey.export({ format: 'der', type: 'spki' }))
        .digest('base64');

test('AT-DC-01 the pinned hashes match the relay dev certificate', () => {
    assert.equal(
        certHash(relayCert),
        DEV_RELAY_CERT_SHA256,
        'relay certificate and client pin drifted — regenerate both together'
    );
    // Spec-mandated SPKI hash, kept in sync for spec-conforming browsers.
    assert.equal(spkiHash(relayCert), DEV_RELAY_SPKI_SHA256);
});

test('AT-DC-02 the dev certificate is loopback-only, short-lived, and valid', () => {
    const cert = new X509Certificate(relayCert);
    assert.equal(cert.subject.includes('stream-analyzer MoQ dev relay'), true);
    assert.ok(cert.subjectAltName.includes('IP Address:127.0.0.1'));
    assert.equal(cert.subjectAltName.includes('DNS:example.com'), false);
    const now = Date.now();
    assert.ok(
        Date.parse(cert.validFrom) < now && Date.parse(cert.validTo) > now,
        `validity window expired: ${cert.validFrom} .. ${cert.validTo}`
    );
    // Chromium rejects pinned self-signed certificates whose validity exceeds
    // roughly two weeks (~14 days), so the checked-in cert must stay short.
    const days = (Date.parse(cert.validTo) - Date.parse(cert.validFrom)) / 86400000;
    assert.ok(days <= 14, `validity ${days.toFixed(1)}d exceeds Chrome's pin window`);
    assert.ok(days > 7, `validity ${days.toFixed(1)}d too short to be useful`);
});

test('AT-DC-03 pinning is applied to loopback only', () => {
    const hit = webTransportInit('moqt://127.0.0.1:4430/anon');
    assert.ok(hit, 'loopback must be pinned so the bundled relay example works');
    assert.deepEqual(
        hit.serverCertificateHashes.map((h) => h.algorithm),
        ['sha-256', 'sha-256'],
        'cert hash (Chromium) plus SPKI hash (spec)'
    );
    const sent = hit.serverCertificateHashes.map((h) =>
        Buffer.from(h.value).toString('base64')
    );
    assert.deepEqual(sent, [DEV_RELAY_CERT_SHA256, DEV_RELAY_SPKI_SHA256]);
    for (const pub of [
        'https://draft-14.cloudflare.mediaoverquic.com/bbb',
        'https://cdn.moq.dev/auto',
        'moqt://example.com:4430/live',
    ]) {
        assert.equal(webTransportInit(pub), undefined, `${pub} must not be pinned`);
    }
});
