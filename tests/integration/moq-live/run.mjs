// Live interop harness for the MoQ client (draft-ietf-moq-transport-22).
// Bundles src/infrastructure/moq/session.js with esbuild, serves a page that
// connects to the Go test relay over real WebTransport — no flags, no cert
// plumbing: the client pins the relay's fixed dev cert for loopback URLs,
// exactly like the bundled example-list entry does.
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
window.__MOQ_URL = new URLSearchParams(location.search).get('url') || 'moqt://127.0.0.1:4430/anon';
window.__MOQ_NS = (new URLSearchParams(location.search).get('ns') || '').split(',').filter(Boolean);
window.__MOQ_CANDIDATES = new URLSearchParams(location.search).get('probe') || '';
</script><script>
window.__RESULT = null;
// Discovery: ask the relay which track names exist before subscribing.
window.__discover = async (session, namespace, candidates) => {
  const out = {};
  for (const name of candidates) {
    const r = await session.probeTrack(namespace, name);
    out[name] = r.ok ? 'EXISTS' : (r.reason ?? r.code);
  }
  return out;
};
window.__run = async () => {
  const events = [];
  const started = Date.now();
  let session;
  try {
    // No certificate plumbing: the client pins the bundled relay for loopback
    // URLs itself, exactly like the example-list path does.
    ({ session } = await MoqLive.connectMoq(window.__MOQ_URL, {
      // Cloudflare's draft-16 demo relay carries the subscribe token in the
      // URL path, so the namespace cannot be derived from it.
      namespace: window.__MOQ_NS.length ? window.__MOQ_NS : undefined,
      onEvent: (e) => events.push(e),
    }));
  } catch (err) {
    window.__RESULT = { ok: false, error: String(err && err.message ? err.message : err), events, discovered: window.__DISCOVERED ?? {} };
    return;
  }
  window.__DISCOVERED = {};
  if (window.__MOQ_CANDIDATES) {
    window.__DISCOVERED = await window.__discover(
      session,
      window.__MOQ_NS.length ? window.__MOQ_NS : ['anon'],
      window.__MOQ_CANDIDATES.split(',')
    );
  }
  await new Promise((r) => setTimeout(r, 4500));
  try { await session.close(); } catch {}
  window.__RESULT = { ok: true, elapsedMs: Date.now() - started, events, dialect: session.dialect, discovered: window.__DISCOVERED ?? {} };
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

const browser = await chromium.launch({
    headless: true,
    executablePath:
        process.env.CHROME_BIN ||
        '/etc/profiles/per-user/juan/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const params = new URLSearchParams();
if (process.env.MOQ_URL) params.set('url', process.env.MOQ_URL);
if (process.env.MOQ_NS) params.set('ns', process.env.MOQ_NS);
if (process.env.MOQ_PROBE) params.set('probe', process.env.MOQ_PROBE);
await page.goto(`http://127.0.0.1:${port}/?${params.toString()}`);
await page.evaluate(() => window.__run());
await page.waitForFunction('window.__RESULT !== null', null, {
    timeout: 30000,
});
const result = await page.evaluate(() => window.__RESULT);
await browser.close();
server.close();

const kinds = (result.events ?? []).map(
    (e) => e.type + (e.status ? ':' + e.status : '')
);
console.log('events:', kinds.join(', '));
if (result.discovered)
    console.log('discovered:', JSON.stringify(result.discovered));

const assert = (await import('node:assert/strict')).default;
// PUBLIC=1 targets a real relay (Cloudflare draft-16) instead of the bundled
// Go testrelay; the exact-payload assertions only hold for the local relay.
const PUBLIC = process.env.PUBLIC === '1';
assert.equal(result.ok, true, 'connect failed: ' + result.error);
assert.ok(
    (result.events ?? []).some(
        (e) => e.type === 'state' && e.state === 'setup-complete'
    ),
    'setup-complete state'
);

if (PUBLIC) {
    console.log('negotiated dialect:', result.dialect ?? 'unknown');
}
const ok = (result.events ?? []).find(
    (e) => e.type === 'subscription' && e.status === 'ok'
);
assert.ok(ok, 'SUBSCRIBE_OK correlated');
assert.ok(ok.rttMs >= 0, 'subscribe RTT measured');
assert.equal(ok.trackAlias, 42);

const catalog = (result.events ?? []).find((e) => e.type === 'catalog');
assert.ok(catalog, 'catalog received');
assert.ok(catalog.catalog.tracks.length >= 1, 'catalog lists tracks');
assert.ok(
    catalog.catalog.tracks.some((t) => t.role === 'video'),
    'catalog carries a video track'
);
if (!PUBLIC) {
    assert.equal(catalog.catalog.tracks.length, 2);
    assert.equal(catalog.catalog.tracks[0].name, 'video.high');
    assert.equal(catalog.catalog.tracks[0].packaging, 'loc');
    assert.equal(catalog.catalog.tracks[0].targetLatencyMs, 2000);
    assert.equal(catalog.catalog.tracks[0].width, 1920);
}

const objects = (result.events ?? []).filter((e) => e.type === 'object');
assert.ok(objects.length >= 1, `objects received, got ${objects.length}`);
if (!PUBLIC) {
    assert.ok(
        objects.length >= 3,
        `expected datagram + 2 subgroup objects, got ${objects.length}`
    );
    const dg = objects.find((e) => e.deliveryMode === 'datagram');
    assert.ok(dg, 'datagram object received');
    const subObjs = objects.filter((e) => e.deliveryMode === 'subgroup');
    assert.ok(subObjs.length >= 2, 'subgroup objects received');
}

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
