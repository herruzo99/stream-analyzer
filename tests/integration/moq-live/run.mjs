// Live interop harness for the MoQ client (draft-ietf-moq-transport-22).
// Bundles src/infrastructure/moq/session.js with esbuild, serves a page that
// connects to the Go test relay over real WebTransport with the relay's TLS
// certificate hash, and asserts the full client path.
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PW =
    '/nix/store/0ikc8wsc0aan9kpzslkhsn9l7iwnz7y5-playwright-test-1.61.1/lib/node_modules';

const dir = mkdtempSync(join(tmpdir(), 'moq-live-'));
await esbuild.build({
    entryPoints: [join(ROOT, 'tests/integration/moq-live/entry.js')],
    bundle: true,
    format: 'iife',
    globalName: 'MoqLive',
    platform: 'browser',
    outfile: join(dir, 'bundle.js'),
    alias: { '@': join(ROOT, 'src') },
    logLevel: 'error',
});
console.log('bundle built');

const html = `<!doctype html><meta charset="utf-8"><title>moq live</title>
<body><script src="/bundle.js"></script><script>
window.__RESULT = null;
window.__run = async () => {
  const events = [];
  const HASH = new URLSearchParams(location.search).get('h');
  const pad = '==='.slice(0, (4 - (HASH.length % 4)) % 4);
  const hashBytes = Uint8Array.from(atob(HASH + pad), (c) => c.charCodeAt(0));
  class BoundWT {
    constructor(url, opts) {
      return new WebTransport(url, Object.assign({}, opts, {
        serverCertificateHashes: [{ algorithm: 'sha-256', value: hashBytes.buffer }],
      }));
    }
  }
  const started = Date.now();
  let session;
  try {
    ({ session } = await MoqLive.connectMoq('moqt://127.0.0.1:4430/anon', {
      WebTransportImpl: BoundWT,
      onEvent: (e) => events.push(e),
    }));
  } catch (err) {
    window.__RESULT = { ok: false, error: String(err && err.message ? err.message : err), events };
    return;
  }
  await new Promise((r) => setTimeout(r, 4500));
  try { await session.close(); } catch {}
  window.__RESULT = { ok: true, elapsedMs: Date.now() - started, events };
};
</script>`;

const server = createServer((req, res) => {
    if (req.url === '/bundle.js') {
        res.setHeader('Content-Type', 'text/javascript');
        res.end(readFileSync(join(dir, 'bundle.js')));
        return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
console.log('harness on http://127.0.0.1:' + port);

const { chromium } = await import(join(PW, 'playwright', 'index.mjs'));
// The relay writes its SPKI hash here for Chrome's allow-list flag.
const spkiHash = process.env.RELAY_SPKI;
if (!spkiHash) {
    console.error('missing RELAY_SPKI');
    process.exit(2);
}
const browser = await chromium.launch({
    headless: true,
    executablePath:
        process.env.CHROME_BIN || '/etc/profiles/per-user/juan/bin/google-chrome',
    args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--ignore-certificate-errors',
        // QUIC/WebTransport certificate errors are not covered by
        // --ignore-certificate-errors alone; the SPKI allow-list is the
        // supported bypass for self-signed test certificates.
        '--ignore-certificate-errors-spki-list=' + spkiHash,
    ],
});
const page = await browser.newPage();
const certHash = process.argv[2];
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/?h=${encodeURIComponent(certHash)}`);
await page.evaluate(() => window.__run());
await page.waitForFunction('window.__RESULT !== null', null, { timeout: 30000 });
const result = await page.evaluate(() => window.__RESULT);
await browser.close();
server.close();

const kinds = (result.events ?? []).map((e) => e.type + (e.status ? ':' + e.status : ''));
console.log('events:', kinds.join(', '));

const assert = (await import('node:assert/strict')).default;
assert.equal(result.ok, true, 'connect failed: ' + result.error);
assert.ok(
    (result.events ?? []).some((e) => e.type === 'state' && e.state === 'setup-complete'),
    'setup-complete state'
);
const ok = (result.events ?? []).find((e) => e.type === 'subscription' && e.status === 'ok');
assert.ok(ok, 'SUBSCRIBE_OK correlated');
assert.equal(ok.trackAlias, 42);
assert.ok(ok.rttMs >= 0, 'subscribe RTT measured');

const catalog = (result.events ?? []).find((e) => e.type === 'catalog');
assert.ok(catalog, 'catalog received');
assert.equal(catalog.catalog.tracks.length, 2);
assert.equal(catalog.catalog.tracks[0].name, 'video.high');
assert.equal(catalog.catalog.tracks[0].packaging, 'loc');
assert.equal(catalog.catalog.tracks[0].targetLatencyMs, 2000);
assert.equal(catalog.catalog.tracks[0].width, 1920);

const objects = (result.events ?? []).filter((e) => e.type === 'object');
assert.ok(objects.length >= 3, `expected datagram + 2 subgroup objects, got ${objects.length}`);
const dg = objects.find((e) => e.deliveryMode === 'datagram');
assert.ok(dg, 'datagram object received');
const subObjs = objects.filter((e) => e.deliveryMode === 'subgroup');
assert.ok(subObjs.length >= 2, 'subgroup objects received');

const tel = (result.events ?? []).filter((e) => e.type === 'telemetry');
assert.ok(tel.length >= 1, 'telemetry samples derived');
// The burst of test objects arrives once; at least one interval must show a
// non-zero receive rate.
assert.ok(
    tel.some((e) => e.sample.mbpsRecv > 0),
    `telemetry rates ${tel.map((e) => e.sample.mbpsRecv).join(',')}`
);
const last = tel[tel.length - 1].sample;
assert.ok(last.moq.objectsDelta >= 0, 'object counters present');
assert.equal(last.rttMsReason !== undefined, true, 'honest nulls documented');
assert.equal(last.pktRecvLost, null, 'webtransport has no loss metric');

console.log('LIVE MOQ INTEROP: PASS');
