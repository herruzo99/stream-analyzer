# SRT Integration Analysis — `stream-analyzer`

> Status: **Analysis only** (no code changed). Deliverable for a decision on SRT ingest support.

---

## 1. Verdict

SRT analysis is **feasible and strategically valuable**, but it is **impossible to implement purely in-browser**: SRT runs over UDP, and web platforms have no raw UDP socket API. The current application is a 100% browser-based analyzer (esbuild → static `dist/`, Web Worker offloading, `fetch`-based retrieval everywhere), so SRT support **requires a companion local daemon ("sidecar")** that owns the UDP socket and exposes a local control plane to the UI.

Recommendation: **build SRT behind a protocol-agnostic transport-adapter contract** (QUIC/WebRTC are roadmap items and are browser-native — they must slot in without new analysis UI), deliver the SRT sidecar in phases (pull first, push/record second, deep correlation analysis third), and reuse as much of the existing pipeline as possible via a *synthetic-HLS façade* plus a first-class telemetry store. **Delivery respects the static-hosting mandate in force on every surface**: no server-side processes anywhere — the sidecar is a fully static Go binary whose source *and prebuilt binaries* live in the repo, served as a same-origin static file at `/helper/…`, and run once by the user. Detailed reasoning below.

---

## 2. What SRT is, and how it differs from HLS/DASH

The SRT protocol draft is already vendored at [`standard/srt.txt`](../standard/srt.txt). Key protocol facts that drive architecture:

| Aspect | HLS / DASH | SRT (per draft / libSRT) |
|---|---|---|
| Transport | HTTP(S) | UDP + custom reliability layer |
| Roles | client → server (GET) | **Caller** (initiates), **Listener** (accepts), Rendezvous (both listen) |
| Manifest | Yes (m3u8 / MPD) | **None.** The "playlist" is the link itself + streamid |
| Segments | HTTP GET, seekable index | Continuous byte stream; segments must be **derived** (time slices or GOP boundaries) |
| Reliability | TCP/HTTP | SRT-layer ACK/NAK retransmission within a **latency window**; **TSBPD** timestamp-based delivery; **too-late-packet drop** |
| Latency | Seconds (segment duration bound) | Milliseconds (~`RTT/2 + SRT latency`, min TsbpdDelay **120 ms**; recommended 3–4× RTT) |
| Security | TLS, DRM (Widevine/PlayReady/FairPlay) | Optional **AES-128/192/256** with key-material exchange; passphrase or KM flow; **off by default** |
| Telemetry | Timing headers, HAR | Rich per-socket stats: RTT, pkt send/recv totals, loss, retransmissions, drops (incl. too-late), bandwidth, sender/receiver buffer occupancy, negotiated parameters |
| Payload | ISO-BMFF / TS | Transport-agnostic; **MPEG-TS in practice** (~7×188-byte TS packets per SRT data packet, or message mode) |
| Lifecycle | VOD/Live, seekable | **Live-only by nature**; recording turns it into analyzable on-demand material |

Consequences for an *analyzer*:

1. There is no manifest to parse or diff — the analysis target is the **link** (transport telemetry) and the **TS payload** that flows over it.
2. "Segments" don't exist in the source; they must be synthesized (e.g., 1–6 s time slices aligned on PAT/PMT/GOP) to reuse segment-level tooling.
3. The highest-value analysis is **correlation**: SRT-level loss/retransmission/drops overlaid on TS continuity-counter errors and PCR timing — something no HLS/DASH tool can provide because their transport hides loss.

---

## 3. The hard constraint: the browser sandbox

Current retrieval path, end to end:

```
smart-input.js → source-input-contract.js (http/https only)
  → startAnalysis.js → workerService.postTask('start-analysis')
  → worker/http.js (fetchWithAuth / fetchWithRetry)
  → tier0Handler.js / analysisHandler.js (protocol sniff: #EXTM3U / <MPD)
  → hls|dash parser → IR → summary → analysisStore → UI
```

Every stage assumes **HTTP(S) fetch**. Browsers offer no UDP. WebRTC cannot carry arbitrary UDP datagrams, and WASM cannot help — libSRT compiled to WASM still has no UDP syscall underneath it. Options, ruled in/out:

| Option | Description | Verdict |
|---|---|---|
| A. Pure browser (WASM libSRT) | — | **Impossible** (no UDP). Documented as rejected. |
| B. **Local sidecar daemon** (single static Go binary, control channel over localhost WS/HTTP) | Owns the UDP socket; re-exposes TS bytes + stats to the browser; supports **caller (pull)** and **listener (push)** modes; can spool recordings to disk | **Recommended as the engine.** Full stats fidelity, both directions, no vendor dependency, no native build toolchain. Fits the homelab deployment model (Gitea CI already deploys to `stream.local.herruzo.me`; flake.nix can ship the daemon as a Nix package). |
| C. Remote gateway (MediaMTX/Prism-class) | User runs/rents a media server; browser consumes via WebRTC/WHEP | Viable for quick *pull-only* viewing, but **loses raw TS access and per-socket stats fidelity** (the two things we exist for), and adds a heavy third-party runtime. Acceptable later as an *optional* backend, not the core. |
| D. **Browser extension wrapper** (proposed by user; see §3.1) | Extension supervises the native helper and holds the privileged localhost channel | **Approved as the UX/security wrapper** — but it does **not** replace the native helper. |

Option B is the only one that delivers the full analysis story. Engine selection is decided by the build-vs-adapt research in §4.2 — verdict: **adapt `datarhei/gosrt` (pure Go, MIT) rather than hand-writing a protocol stack or fighting Node native-addon builds.**

### 3.1 The extension bridge (user-proposed variant) — what it can and cannot do

User proposal: "instead of a local Node daemon, put the logic in a browser extension and connect with it." Verified against current platform facts:

**The extension cannot do SRT itself either.** Manifest V3 extensions have **no raw UDP socket API**. `chrome.sockets.udp` belongs to *Chrome Platform Apps*, a format that is end-of-life (Chrome Apps support has been removed/phased out; the API is not available to MV3 extensions — see Chrome docs and chromium issue 40289694). Firefox WebExtensions have experimental TCP sockets at best, no UDP. Safari WebExtensions: none. WASM inside the extension changes nothing (still no UDP syscall).

**What the extension *does* buy — and it is genuinely valuable:**

1. **Lifecycle supervision (moot under the chosen delivery).** Through *native messaging* (`chrome.runtime.connectNative`), a Chromium extension can launch and own a **registered native messaging host** as a child process over stdio. This would turn "user runs the binary" into "user clicks Connect" — but the static-only mandate (§3.4) settles on the user running the committed binary themselves, so auto-launch is a Phase-5 convenience, not a requirement. The UDP work still happens in the native host — the extension replaces the *launcher*, never the engine.
2. **Privileged localhost channel.** Extension service-worker/pages with `host_permissions: ["http://127.0.0.1:1/*"]` can `fetch`/`WebSocket` the daemon bypassing CORS — and, critically, bypassing Chrome's **Private Network Access** friction that a normal web page hits when the analyzer site fetches `127.0.0.1`. This is a real architectural advantage over "web page talks to sidecar directly".
3. **Consent boundary.** Install-time permission disclosure is a stronger security story than any localhost page hitting an open daemon.
4. **Durability.** A service worker survives tab navigation, so the session survives while the user moves between analyzer views.

**What it costs:**

- The **native helper is still mandatory** — it owns the socket. Native messaging hosts are *not* self-registering: they need a per-OS install step (Windows registry key; JSON manifest at a fixed path on Linux/macOS naming the executable and allowed extension ID). An installer script or guided first-run UX is unavoidable. (Note: the future Direct Sockets API currently targets Isolated Web Apps, not extensions — not a path here.)
- Native messaging is **JSON-framed** — good for control/lifecycle, wasteful for media chunks (base64 overhead). Correct split: native messaging for lifecycle/config; raw TS + stats stream directly from the daemon to the extension over WS with `host_permissions`.
- MV3 service-worker idle termination (~30 s) kills idle WebSockets — long-lived streams must be held in an extension page or via `runtime.connect` ports kept open by the UI. A real, solvable engineering constraint.
- **Platform narrowing**: Chromium-first; Firefox native messaging is self-hosted-only (acceptable), Safari has no native messaging (locks Safari/iOS users out). The plain sidecar remains browser-agnostic and LAN-capable, so the extension must stay *optional*, never a hard gate.
- Store review friction and a `nativeMessaging` permission widen the trust surface — mirrored by the daemon-side hardening in §7.

**Revised architecture (engine + wrapper, not either/or):**

```
Analyzer UI (lit-html app, unchanged)
  ⇄ Go helper on 127.0.0.1:<port> (TS chunks + stats over WS, CORS+PNA configured)
       │ user runs it once (§3.4)
  ⇄ Go helper (gosrt) — owns the UDP socket (pull caller / push listener)
```

The helper's control protocol is identical whether the client is the (optional) extension, a plain web page on the homelab private origin, or the public origin — **one implementation, optional wrappers**. The extension is only worth building as the PNA/CORS bypass on the public HTTPS origin (Phase 5); the homelab origin is private-network, where a page→helper fetch works with plain CORS headers. A desktop wrapper (Tauri-class: same `dist/` in a native webview + Rust UDP plugin via libsrt FFI) remains a valid long-term alternative that dissolves the two-process problem entirely; flagged, not recommended for v1.

### 3.2 "Can it be zero-install?" — the exhaustive honest answer

User ask: *can the browser manage everything itself, with the user only clicking Accept/OK — no local command?*

**Verified platform facts (all checked against current browser platform state):**

- No browser surface can carry arbitrary UDP/SRT traffic: not the page, not WebRTC (fixed DTLS-SRTP/SCTP framing; you cannot tunnel SRT through it), not WebTransport (QUIC to a server — SRT is not QUIC), not WASM or WASI (still sandboxed, no socket syscall), not a Manifest V3 extension (§3.1).
- The emerging **Direct Sockets API** (raw TCP/UDP) is gated to **Isolated Web Apps** — an enterprise/sideload distribution format, not the web and not store extensions. Not a path for a link-based product.
- The only consent-gated native bridges browsers *do* expose — **WebSerial / WebUSB / WebHID** (browser picker = the "click Accept" the user imagines) — have **no SRT transport riding on them** (no USB/serial SRT media device class exists). WebSerial/WebUSB are how you talk to hardware, not to an IP endpoint.
- **No web API can spawn an arbitrary local process** (NaCl/PPAPI dead, WASI has no sockets, native messaging needs a pre-installed registered host per §3.1).

Conclusion: **on the user's own machine, live SRT requires *something* to be installed once.** The browser cannot conjure a UDP socket. Two routes get as close to "only click Accept" as physics allows, plus one genuinely zero-install partial:

| Route | What the user does | Local install? | Trade-offs |
|---|---|---|---|
| ~~R1 — Helper on your own host~~ | ~~Nothing. Enters `srt://host:port`~~ | ~~None~~ | **REJECTED — static hosting is mandatory on every surface (user directive, incl. the Gitea homelab).** Static hosts cannot run processes, hold UDP sockets, or bind ports; the bind-mount trick that looked free still requires a running helper container, which is out of scope. No server-side helper on any deployment. |
| **R1' — Public hosted gateway** | Nothing | **None for the user** | A cloud/self-hosted helper *for the public site's* users. Works for **pull** (source must be internet-reachable) and **push** (re-point encoders at the host). Costs: hosting/ingress bandwidth, other people's media touches your infra (privacy/consent UX), NAT edge cases, per-tenant scaling — and it violates the same static-only mandate for self-hosters. **Rejected for this project.** |
| **R2 — Run-once local helper** (the only live route; static-mandate compliant) | Downloads the helper from the same origin (`/helper/…`) and runs it **once**; afterwards the analyzer auto-detects it | **None** — no installer, no registration, no command. Just run the downloaded file | The closest physical approximation of "browser manages it": one same-origin download + one run per machine, ever. The committed binary + source live in the repo; OS security wobble exists on the *download* path (SmartScreen/chmod/quarantine), which a repo **clone** avoids (exec bit preserved, no quarantine). Keeps sockets, data and recordings **local** — the only possibility when the SRT source sits on the user's LAN. |
| **R3 — Offline capture analysis** | Drags a `.ts` recording or an SRT **PCAP** into the analyzer | **None** | Genuinely zero-install and fully in-browser using the existing TS parser + (new) pcap/SRT-packet forensics on the capture. Not live — but it is the right "email me a capture" workflow, and it complements R2 (record → share → analyze). |

**Net answer to the original ask: with static hosting mandatory, "run without installing" means exactly this — a committed binary + source, served as a static file, run once by the user (§3.4). Beyond that, physics says no: the browser cannot conjure a UDP socket.**

### 3.3 The roadmap changes the calculus: SRT today, QUIC + WebRTC tomorrow

With QUIC and WebRTC on the roadmap, the protocol landscape splits cleanly into two classes — and SRT is the *hardest* case, not the *representative* one:

| Class | Protocols | Browser capability | Install needed? |
|---|---|---|---|
| **A — native** | **WebRTC** (WHEP receive / WHIP push), **WebTransport / MoQ** (QUIC) | First-class browser APIs + `RTCPeerConnection.getStats()` / WebTransport streams & datagrams | **None** |
| **B — bridged** | **SRT** (raw UDP, non-web protocol) | No browser surface (§3.1–3.2) | Helper/gateway required |

**Implications:**

1. **For WebRTC and QUIC/MoQ the zero-install question answers itself: yes.** The browser is a native WebRTC endpoint (WHEP to receive, WHIP to publish — i.e., both pull *and* push are in-spec browser operations) and a native WebTransport client. The repo already ships `shaka-player` with a custom `shakaNetworkPlugin` (`src/infrastructure/player/shaka-network-plugin.js`) — that same plugin seam is where WHEP signaling (plain `fetch`) slots in; the existing `playerService.getStats()` polling pattern is where peer-connection stats land.
2. **SRT should therefore be built as one adapter inside a protocol-agnostic transport layer, never as a bespoke SRT pipeline.** The analyzer's value is already payer-level (TS parsing, timeline, QC, comparison); a transport that only produces *bytes + telemetry* keeps 100 % of that value shared.
3. **The telemetry model normalizes across all three protocols** — this is the contract that makes Phase 0 universal:

| Normalized signal | SRT (libSRT stats) | WebRTC (`getStats`) | WebTransport / MoQ |
|---|---|---|---|
| round-trip time | `msRTT`, `mbpsMaxBW` | `roundTripTime`, `currentRoundTripTime` | QUIC qlog (future) / partial |
| packet loss | `pktRcvLossTotal`, `pktSndLossTotal` | `packetsLost`, `packetsReceived` | datagram loss inferred |
| retransmission | `pktRetransTotal`, `pktSndDrop/…RcvDropTotal` (incl. too-late) | `nackCount`, `retransmittedPacketsReceived` | loss-recovery via qlog |
| throughput | `mbpsSendRate`, `mbpsRecvRate` | inbound/outbound-rtp `bitrate` | stream-level estimates |
| buffer occupancy | `msSndBuf`, `byteAvailRcvBuf` | `jitterBufferDelay`, `framesDropped` | object/subgroup buffer |
| transport state | socket state, cipher, negotiated latency/TSBPD | ICE/DTLS state, candidate pair | session state |

4. **Downstream reuse stays identical**: all three transports deliver MPEG-TS (or fragmented MP4) into the existing TS parser, segmentExplorer, timeline, QC and compliance features; the stats adapters feed the same "link telemetry" timeline, now cross-protocol comparable — a comparison view can put an SRT link next to a WebRTC WHIP feed (bitrate, RTT, loss) side by side.
5. **WebRTC is additionally the richest zero-install analysis surface**: ICE candidate-pair diagnostics, DTLS state, NACK/PLI/FIR counts, concealment events, frame drop rates — all available with no helper at all. That makes the WebRTC adapter a *fast-following* feature, not a new platform.

Revised plan impact: Phase 0 contracts now define **`transportAdapter` + `LinkTelemetry`** (protocol-agnostic, contract-tested) *before* any SRT code; the SRT helper implements that contract under the hood, so the WebRTC/WebTransport adapters later are days, not weeks.




---

### 3.4 Deployment topology (verified in-repo) — static is mandatory

User directive: **static hosting only, on every surface.** No server-side processes anywhere.

- **Public site `stream-analyzer.herruzo.dev`** — GitHub Pages, `workflow_dispatch`-gated (strict lint/typecheck/audit). Static files only: no helper, no sockets, no proxy.
- **Local staging `stream.local.herruzo.me`** — Gitea runner bind-mounts `dist/` and does a plain `cp -a dist/. /dist/`. Also purely static.
- **Consequence — delivery degenerates to distribution.** Both surfaces stay identical: the CI build matrix (linux/darwin/windows × amd64/arm64) is committed under `helper/bin/<os>-<arch>/` and **served as plain static files from the same origin at `/helper/…`** (GitHub Pages: copy into `dist/` before upload; Gitea: already lands in `dist/` via the copy step). The user's entire "install" is: same-origin download → run once → done. Nothing registers, nothing escalates — which also means the one-time GUI installer from the earlier delivery choice collapses into "just run the downloaded binary" (simpler, fewer moving parts).
- **The binary is natively static.** gosrt is pure Go with zero cgo (`net_windows.go` aside), so `CGO_ENABLED=0` produces a fully static, libc-free binary — one runnable file per platform, which is exactly what a static distribution model can serve.
- **Runtime flow on every static surface:** analyzer shows an SRT panel → probes `http://127.0.0.1:<port>/health` (short timeout) → if absent, prompts "Download & run helper" (same-origin `/helper/…` link) → after the user runs it, auto-detection completes and `srt://` input activates. **One user action per machine, ever.** Optional nicety: the helper prints a "start at login" checkbox on first run (user's own machine, their own consent — no admin elevation needed on any OS).
- **CSP/PNA notes for implementation:** the public origin is HTTPS and the helper is `http://127.0.0.1` — a public→private-network fetch subject to Chrome **PNA/LNA** prompts; the homelab origin is itself private-network so the page→helper fetch works there with plain CORS headers on the helper. The extension is therefore **demoted from mandatory to optional**: it only matters as the CORS/PNA bypass on the public origin, and can be a Phase 5 add-on rather than a Phase 2 dependency. `index.html` currently ships `connect-src * blob:` — permissive, but guard it with a contract test before anyone tightens it.

Final shape: **static app everywhere + one committed static Go binary per platform + run-once local helper.**

### 3.5 Version management & upgrade prompts — first-class requirement (user directive)

Under static-only hosting there is no version API: "what's the latest?" must be a **static file published atomically with the site build**, and detection must stay correct in every drift combination (old helper / new site, new helper / stale site, helper missing, self-hosted manifests). It is therefore a subsystem with its own contract, not an afterthought.

**1. Version sources of truth.**

- `helper/VERSION` — a plain `X.Y.Z` file, embedded into the binary via `//go:embed` and overridable with CI metadata through `-ldflags` (`version=1.3.0+main.ab12cd34`, `commit`, `buildDate`). Build metadata is display-only.
- `package.json` remains the web app's version; CI injects it into the bundle as `__APP_VERSION__` — the workflow already injects `__PROD_HOSTNAME__` and friends via sed, so this follows the established pattern.
- Helper and app are independent artifacts released together; wire compatibility is an integer (`helperProtocol`), never inferred from SemVer.

**2. The published manifest — `/helper/manifest.json`.**

Generated by CI in the *same build* as the site and copied into `dist/helper/`, so app, binaries, and manifest are always in lockstep:

```json
{
  "schema": 1,
  "channel": "stable",
  "version": "1.3.0",
  "helperProtocol": 3,
  "minimumHelper": "1.1.0",
  "minimumApp": "1.2.0",
  "publishedAt": "2026-10-14T09:00:00Z",
  "commit": "ab12cd34",
  "artifacts": {
    "linux/amd64":  { "url": "/helper/linux-amd64/stream-analyzer-helper", "sha256": "…", "bytes": 8123456 },
    "darwin/arm64": { "url": "/helper/darwin-arm64/stream-analyzer-helper", "sha256": "…", "bytes": 8123456 },
    "…": "windows/amd64, windows/arm64, darwin/amd64, linux/arm64"
  }
}
```

Relative URLs keep the *same manifest* valid on GitHub Pages and on the homelab origin. `minimumHelper` + `helperProtocol` define the compatibility floor; `minimumApp` lets a stale build prompt a reload.

**3. The running helper identifies itself.**

`GET /version` (also folded into `/health`):

```json
{ "version": "1.3.0+main.ab12cd34", "helperProtocol": 3, "platform": "linux/amd64",
  "go": "go1.24", "pid": 1234, "startedAt": "…",
  "updateManifestUrl": "https://stream-analyzer.herruzo.dev/helper/manifest.json" }
```

The manifest URL is baked in at build time and overridable (`-update-url` flag, env `STREAM_ANALYZER_UPDATE_URL`, config file `update_manifest_url`) so self-hosters point at their own copy.

**4. Compatibility logic — pure, contract-tested module.**

`src/infrastructure/helper/versionCompat.js` — no new dependencies; a ~100-line SemVer-subset comparator (semver.org rules: build metadata ignored, prerelease < release, numeric identifiers compared numerically) plus the protocol floor/ceiling, resolving to exactly one state:

| State | Condition | UI |
|---|---|---|
| `helper-missing` | no `/health` within timeout | "Download & run helper" — serves the *current* artifact straight from the manifest |
| `current` | helper ≥ manifest version floor, protocol in range, not older than manifest | silent |
| `update-available` | helper.version < manifest.version | banner + "Helper 1.2.0 → 1.3.0" with `Download` / `Later (7d)` / `Skip version`; running sessions never disrupted |
| `outdated` | helper.version < manifest.minimumHelper | blocking banner; helper itself refuses **new** sessions until upgraded (existing sessions keep working) |
| `protocol-mismatch` | helper.protocol outside [min, max] | blocking "update the other side" prompt |
| `ahead` | helper.version > manifest.version | benign info (dev/self-hosted channel) — never an error |
| `dev-build` | version is `0.0.0` / contains `-dev` | benign note |
| `app-stale` | `__APP_VERSION__` < manifest.minimumApp | "Reload for the latest analyzer build" |

Edge rules, enforced by tests: build metadata never affects ordering; a **newer** helper on a stable manifest is never an error; a **missing** manifest means "treat as current" (never nag on a deploy that predates the feature).

**5. The prompt UX.** Small banner in the SRT panel + at most one toast per session: "Helper 1.2.0 → 1.3.0", actions `Download` (URL copied verbatim from the manifest — the client never constructs an artifact URL), `Later` (7 days), `Skip version` (per-version dismissal in `localStorage`). After a run, the panel auto-re-probes and clears itself. On a static site the prompt is the *whole* update mechanism — there is no background channel to lean on.

**6. The helper checks too (beats stale caches).** The helper polls `updateManifestUrl` on start and every 6 h with ETag/`If-None-Match`; when newer, `/version` carries `updateAvailable: { version, url, sha256 }`. This means a stale cached page still renders a correct upgrade prompt, and offline poll failures are silent and never block analysis.

**7. Integrity & update policy.**

- Every artifact's `sha256` lives in the manifest and is displayed next to `Download` so a manually copied binary can be verified. Any helper-assisted update is hash-checked against the manifest before use.
- Public origin upgrades travel HTTPS; the homelab origin may be plain HTTP — there, the pinned `sha256` is the integrity anchor, and the UI says so explicitly.
- **v1 policy: prompt + link only. No silent self-replacement of a running binary.** This helper opens UDP sockets; auto-replacing it is precisely the supply-chain primitive we refuse to ship by default. If one-click updates are ever wanted, the shape is helper downloads to temp → verifies hash → asks the app for an explicit "install now" → replaces itself on next start (Linux rename-over-running is safe; Windows/macOS need a handoff dance). Assisted, never silent.
- Manifest authenticity today comes from your controlled origin. A minisign/cosign signature over the manifest is the natural hardening once self-hosted manifests circulate.

**8. CI responsibilities (single source of truth):** bump `helper/VERSION` → CI builds the matrix → writes `dist/helper/manifest.json` with per-artifact hashes → ships site + binaries + manifest in one atomic artifact; non-tag builds get `+main.<sha>` metadata so a user can name exactly what is running. GitHub Releases attaches the same six binaries for parity.

**9. Tests first (Phase 0):** the comparator, state machine, and manifest schema are pure functions — red-first contract tests in `tests/heux/helper-version-contract.test.mjs`: the classic semver.org ordering table, protocol floor/ceiling, all eight states, manifest schema validation, stale-app handling, and missing-manifest tolerance.


## 4. Mapping SRT onto the existing architecture

### 4.1 Extension points (where SRT touches the codebase)

| Existing module | Impact |
|---|---|
| `features/streamInput/application/source-input-contract.js` | `validateHttpUrl()` **hard-rejects non-http(s) schemes** — must accept `srt://` (strictly validated, credentials/passphrase extracted to auth fields). |
| `features/streamInput/ui/components/smart-input.js` | `detectProtocol()` needs an `SRT` badge; batch import filters for `http(s)://` only today. |
| `infrastructure/worker/http.js`, `worker/handlers/analysisHandler.js`, `tier0Handler.js` | `fetch`-based; SRT sources bypass these — new transport branch in the worker (or, better, the worker talks to the sidecar over WS and treats SRT as a "virtual manifest" session). |
| `state/analysisStore.js` | New `srtSession` slice: mode (pull/push), negotiated params, stats time series, recording path. |
| `features/manifestUpdates` + `application/services/primaryStreamMonitorService.js` | Live poll/diff loop exists for HLS/DASH manifests. SRT's analog is a **stats stream** from the sidecar — same "poll → diff → highlight" model can be reused for telemetry. |
| `features/networkAnalysis` (HAR/headers/CMCD — all HTTP-shaped) | Cannot represent SRT. Needs a new **SRT link panel**; the redaction contract (`network-contract.js`) must learn `passphrase=`. |
| `features/segmentExplorer` + `infrastructure/parsing/ts/**` (PAT/PMT/PES/adaptation parsers) | **Directly reusable** — SRT payload is MPEG-TS. This is the single biggest reuse win. |
| `features/signalQuality` (WebCodecs frame QC) | Reusable if TS chunks are exposed to Shaka/WebCodecs — the synthetic-HLS façade makes this nearly free. |
| `features/playerSimulation` / `multiPlayer` (Shaka) | Shaka plays TS segments (it does so for HLS-TS today); the façade gives SRT playback/ABR simulation without new player work. |
| `infrastructure/parsing/scte35` | SCTE-35 rides in TS PES on SRT links — ad-break analysis works unchanged once TS is flowing. |
| `ui/shell` (view-manager, navigation-contract) | New "SRT Monitor" view; lazy view registration only. |
| `tests/heux/*.test.mjs` | Project convention: **contract-first tests**. New `srt-contract.test.mjs` (URL schema, stats normalization, façade shape) should precede implementation per the manifesto's test-first rule. |

### 4.2 Build vs. adapt: the sidecar engine research (user-requested)

Question: adapt existing open-source SRT building blocks, or write lean/from-zero? All candidates verified today (status, API surface, license):

| Candidate | What it is | Status / risk | Verdict |
|---|---|---|---|
| **`datarhei/gosrt`** | Pure-Go SRT protocol implementation (handshake v4/v5, message mode, caller/listener, TSBPD, too-late drop, LiveCC, NAK, **encryption/passphrase/KM**, full `srt://` URL option table), `Conn.Stats()` with libSRT-equivalent counters (`PktRecvLoss`, `PktRetrans`, `PktRecvRetrans`, interval stats…), `Dial`/`Listen`/`Server{HandleConnect,HandlePublish,HandleSubscribe}` | **MIT, redistributable**; tagged releases (v0.12.0); **not yet v1** by Go norms; battle-tested as **MediaMTX's SRT engine**; missing: buffer mode (irrelevant for TS), **rendezvous**, FileCC, bonding | **ADAPT — engine of the sidecar.** Pure Go ⇒ one static binary per OS/arch, no toolchain on user machines, no bundled-libsrt CVE lag, ideal for the run-once-binary static route (§3.2 R2, §3.4). Our custom layer stays thin: control plane + TS ring buffer + synthetic HLS façade + stats normalization ≈ 600–1000 lines of Go. |
| `@eyevinn/srt` | Node native addon bindings to libSRT (createSocket/bind/listen/connect/accept/read/write/stats) | v0.8.3 (Nov 2023), lightly maintained; open memory-leak and worker-termination heap-corruption issues; **bundled libSRT v1.5.5 carried CVEs** (PRs pending); installs compile libSRT via node-gyp | **Reject as primary** — stale, CVE-lagged, adds a native build chain. Acceptable fallback only. |
| `srt-live-transmit` (official CLI) | libSRT reference app; caller↔listener relay | Stats only to file/stdout (`-statsout`, `-pf json|csv`); **no HTTP stats**; no multi-session framework for us to build on | Reject (wrong shape); keep as **Phase 0 interop test peer**. |
| `voc/srtrelay` | Go SRT relay with HTTP stats API (`/sockets` in libSRT JSON field naming) | SRT↔SRT relay only; interesting only as a **stats-field naming reference** for our normalized telemetry | Reject as component; useful reference. |
| `alexandre-leites/srt-ws-relay` | WS relay of *stats* from an srt-live-server | Docker-oriented, stats-only, unmaintained toy; demo `listener.html` | Reject. |
| MediaMTX / Prism | Full media servers | Too heavy for an embedded analysis helper | Reject (unchanged; remains the Option-C gateway path). |
| Write SRT from zero in-house | Own protocol implementation from `standard/srt.txt` | Full protocol stack: handshake, TSBPD, LiveCC, retransmission, KM — **months of protocol-level QA**, and any peer-interop break becomes our bug | **Reject.** The vendored RFC is the spec we *test against*, not the code we write. |

**Conclusion:** adapt **gosrt**, build only the thin analyzer-specific layer. Net helper footprint: one ~5–8 MB static binary, zero runtime dependencies — the leanest path to the chosen R2 delivery (run-once binary, §3.4). Protocol fidelity risk moves to gosrt upstream (shared with MediaMTX, a large user base); our Phase 0/1 interop suite (libSRT `srt-live-transmit`, OBS Studio SRT output, ffmpeg SRT) guards the integration.

### 4.3 The central design decision: "virtual manifest" model

Two viable models:

**Model 1 — SRT façade over the existing HLS pipeline (recommended).**
The sidecar continuously chops the received TS into local segment files (time-aligned on PAT boundaries), publishes them on a localhost HTTP endpoint, and **synthesizes a live `m3u8`** pointing at them. The analyzer then analyzes a normal (virtual) HLS session. SRT-specific telemetry lives in a parallel, first-class store and a dedicated monitor view.
- Pros: reuses playback, QC, timeline, segmentExplorer, live-diffing, comparison — weeks of machinery for free; SRT-ness stays additive and isolated.
- Cons: an indirection layer (façade must stay honest — no hiding of loss); segment slicing must not distort timing analysis (keep TS raw, slice on packet boundaries only).

**Model 2 — first-class SRT IR end-to-end.**
New parser/IR/UI pipeline dedicated to SRT, TS-decoded independently.
- Pros: conceptually clean, no façade.
- Cons: duplicates the entire downstream stack (playback, QC, timeline, diffing) — high cost, high drift risk with the HSL/DASH features.

**Decision sought: adopt Model 1** (façade + telemetry store), keeping the door open for Model 2 later.

### 4.4 Proposed new surfaces (DDD vertical slice, matching `features/*` convention)

- `src/features/srtSource/` — application contracts (session lifecycle, URL schema), UI (SRT monitor view, connection/stats panels, helper upgrade prompt).
- `src/infrastructure/helper/bridgeClient.js` — browser ↔ helper control channel (WS to `127.0.0.1:<port>`): connect/disconnect, stats stream, recording control, chunk reads.
- `src/infrastructure/srt/statsNormalizer.js` — gosRT/libSRT stats → bounded, redacted, time-series records (mirrors `network-contract.js` norms; candidate for a `heux` contract test).
- `src/infrastructure/helper/versionCompat.js` — SemVer-subset comparator + 8-state compatibility machine (§3.5), pure and contract-tested.
- `src/features/srtSource/ui/helper-upgrade-banner.js` — upgrade prompt states + per-version dismissals.
- `tools/srt-helper/` (repo, separate Go module) — the helper binary: SRT caller/listener via **gosrt**, TS ring buffer + synthetic HLS + chunk endpoint, stats/recording over the control plane, loopback-by-default control API with token, `//go:embed` version + `/health`+`/version` endpoints (§3.5). Cross-compiled from CI for linux/darwin/windows × amd64/arm64 (the flake's existing system set).
- `flake.nix` — add the Go toolchain to the devShell.

---

## 5. The analysis capabilities this unlocks

**Transport telemetry (per connection, time-series + thresholds):**
negotiated latency/TSBPD delay, cipher + KM state, streamid, packet delivery mode, RTT, send/recv bitrate, packet totals, loss, retransmissions, sender/receiver drops incl. **too-late drops**, buffer occupancy (bytes/ms), socket state transitions, rejection reasons (e.g. `SRT_REJ_ROGUE`, `SRT_REJ_VERSION`), handshake parameters (min version, extension flags `0x4A17`).

**Payload analysis (reusing the existing TS parser):**
packet inventory & PID table, PAT/PMT structure, TS **continuity-counter errors** (the payload-level signature of loss), PCR timing/jitter and bitrate timeline, frame/GOP alignment of synthesized segments, SCTE-35 ad markers via the existing parser.

**Correlation analyses (the differentiators):**
- SRT loss/drop events ↔ TS continuity errors ↔ buffer underrun — one timeline.
- RTT vs latency adequacy check (draft recommends TsbpdDelay ≈ 3–4× RTT; hard floor 120 ms).
- Retransmission ratio vs too-late drops → "is this link configured correctly for this RTT/jitter profile?"
- Bandwidth utilization vs link capacity (overflow/underflow trends).

**Compliance/QC rule candidates** (new rule family next to the existing DASH/HLS engines):
encryption disabled; TsbpdDelay < 120 ms; latency < 3× measured RTT; sustained too-late drops; retrans ratio above threshold; buffer overrun; TS continuity error rate above threshold; streamid mismatch/unexpected.

---

## 6. Pull vs Push — precise semantics for this tool

| Mode | SRT role | UX | Notes |
|---|---|---|---|
| **Pull** (analysis-initiated) | **Caller** — sidecar connects out to `srt://host:port` | Exactly like adding an HLS URL today; auto-starts monitoring | No inbound exposure; NAT-friendly. Covers 90 % of "analyze this source" requests. |
| **Push** (peer-initiated) | **Listener** — sidecar accepts an incoming connection on a local UDP port; remote encoder must be aimed at it | "Listen & record" flow with explicit consent | Requires an exposed port / firewall / NAT-path planning; **the highest-value form for an analyzer is "listen → spool to disk → analyze the recording at leisure"**, which converts live push input into on-demand analysis material (and replayable evidence). |

"Push" could also mean the analyzer *re-publishing* to a remote listener — useful for a "tap" feature later (analyze + forward), but that is not analysis-critical and is out of scope for v1.

---

## 7. Security & privacy (the project enforces strict redaction)

- **Credential leakage**: The de-facto `srt://host:port?...` URI convention used by libSRT tooling (`srt-live-transmit`, ffmpeg) legitimately carries `?passphrase=`, `?streamid=` (max 512 bytes, handshake extension per RFC §3.2.1.3), `?latency=`, etc. `features/networkAnalysis/application/network-contract.js` redacts tokens/keys but **not `passphrase`** — close this gap before SRT URLs can flow through any logging/analytics path.
- **Listener-mode exposure**: bind `127.0.0.1` by default; explicit "expose to LAN" toggle; per-session token; UDP rate/size caps; single active listener unless consented.
- **Sidecar control API**: localhost-only bind, CORS-locked to the app origin, token shown once at daemon start; no cloud paths.
- Encryption-off should be surfaced prominently in the UI (SRT encryption is optional and off by default).

---

## 8. Phased plan (contract-first, per project test-first convention)

| Phase | Content | Rough effort |
|---|---|---|
| 0 — Contracts | **Protocol-agnostic `transportAdapter` + `LinkTelemetry` contracts** (§3.3), `srt://` URL schema, helper control-protocol contract incl. `/version` + **manifest schema + version-compat machine** (§3.5), stats normalization; `tests/heux/srt-contract.test.mjs` + `tests/heux/helper-version-contract.test.mjs` red-first | ~3–4 d |
| 1 — SRT pull MVP | Helper (caller, `/health` + `/version`, ring buffer, synthetic HLS + chunk endpoint, stats WS); `srt://` input acceptance; SRT Monitor view (link state, stats charts); **helper-missing download prompt + upgrade banner wired to `/helper/manifest.json`**; segment inspection of TS chunks via existing explorer | ~2–2.5 w |
| 2 — Push + record | Listener mode, spool-to-disk, replay recordings as sessions, security hardening (127.0.0.1 bind, token, consent UX) | ~1.5 w |
| 3 — Deep analysis | Stats↔TS-continuity correlation timeline, SRT compliance rule family, synthetic-HLS QC (freeze/black via WebCodecs), SCTE-35 | ~1–2 w |
| 4 — Packaging & versioning | Helper binaries committed under `helper/bin/<os>-<arch>/` **and** built by the CI matrix (linux/darwin/windows × amd64/arm64) → GitHub Releases; CI generates `manifest.json` **with sha256 per artifact** into `dist/helper/` in the same atomic build as the site; both static sites serve `/helper/…` same-origin; CSP `connect-src` guard test; Nix devShell Go toolchain; docs | ~1.5 w |
| 5 — Optional extension + native transports | **Chromium extension as PNA/CORS bypass for the public HTTPS origin (optional)**; then **WebRTC adapter (WHEP/WHIP + `getStats`)** via the existing shaka network-plugin seam — reuses all Phase 0–3 UI/analysis; WebTransport/MoQ adapter as the standard matures | ~0.5 w (ext) + ~1–1.5 w each |

Total: ~6–8 focused dev-weeks to a strong v1 *plus* the WebRTC fast-follow.

---

## 9. Risks & open decisions

1. **Helper language/prebuilt risk** — resolved by research (§4.2): a pure-Go binary via gosrt means no toolchain on user machines and cross-compiled CI artifacts; remaining risk is gosrt pre-v1.0 maturity and interop gaps (no rendezvous / FileCC / bonding), mitigated by a Phase 0 interop test against libSRT peers (OBS, `srt-live-transmit`, a hardware encoder if available).
2. **Virtual-manifest model** — recommend Model 1 (façade); needs sign-off.
3. **Push semantics** — recommend "listen + record + replay" for v1; defer re-publish/tap.
4. **Static-only surfaces** — no server-side helper is possible anywhere (user directive), so every user performs exactly one manual action per machine: run the downloaded binary. UX must make that step obvious and self-verifying (`/health` auto-detect before/after), and the public site additionally needs either plain CORS on the helper + PNA tolerance or the optional extension (§3.4). The public HTTPS origin → `http://127.0.0.1` fetch is the sharpest remaining edge; keep an explicit test for it.
5. **Extension is optional and deferred (Option D)** — the static mandate removed its only mandatory role; it remains a Phase-5 convenience as the PNA bypass on the public HTTPS origin (and native-messaging auto-launch is moot since users run the binary themselves). If ever built, note: native-messaging hosts are **not self-registering** (per-OS registry-key / JSON-manifest install), MV3 service-worker idle termination must be designed around for long-lived streams, and Safari/iOS stay excluded — the helper path must remain browser-agnostic so the extension is never a gate.
6. **Update model is deliberately conservative (§3.5):** v1 is prompt-only — no silent self-replacement of a binary that owns UDP sockets. The integrity story for self-hosted/plain-HTTP origins rests on the manifest's `sha256` pins plus the origin's control; adequate for a first version, but revisit (manifest signature) once self-hosted helpers circulate.
7. **Validation needed for the version subsystem itself:** a stale cached app, a self-hosted manifest, and a clock behind by days must all still resolve to sane states — covered by the Phase 0 contract tests, but they are the gate, not an afterthought.

---

## 10. Recommendation

Proceed. **Adapter-first, SRT-second; static everywhere.** Final shape: the existing static app (unchanged deployment model, GitHub Pages + Gitea `cp -a dist/.`), plus **one fully static Go binary (gosrt engine) committed under `helper/bin/<os>-<arch>/` and served same-origin at `/helper/…`**, run once per machine (the only user action in the entire flow; no installer, no registration, no server). The helper implements the same protocol-agnostic `transportAdapter` + `LinkTelemetry` contract the **native WebRTC/WebTransport adapters will later implement with zero new analysis UI** (§3.3) — SRT is merely the hardest transport in the roadmap, and the generic contract keeps it from becoming a dead-end feature. Start with Model 1 (façade + telemetry store), Phase 0 contracts first (tests before code, matching the repo's `heux` suite). The existing TS parser, segment explorer, live-diff monitor, QC engine, shaka network-plugin seam and comparison views make the marginal analysis surface unusually cheap; the genuinely new work is the Go helper and the SRT telemetry view — both small, local, and bounded by the vendored SRT draft in `standard/srt.txt`.

---

## 11. Implementation status (worktree `feat/srt-integration`)

Implemented and verified in the worktree (commit-in-progress):

| Phase | Status | Evidence |
|---|---|---|
| 0 — Contracts | **done** | `tests/heux/helper-version-contract.test.mjs` (10 tests: semver.org chain, build-metadata, 8-state machine, manifest schema, platform artifact injection), `tests/heux/srt-contract.test.mjs` (8 tests: URL schema incl. `srt://:port` listener forms, redaction, telemetry normalization, derived signals, SRT rule family, correlation) |
| 1 — Pull MVP | **done** | Go helper `tools/srt-helper/` builds+ vets+tests clean (7 packages, real loopback gosrt sessions); `/health` `/version` `/sessions` `/events` (SSE) control plane with bearer token, loopback default, CORS+PNA; synthetic HLS façade with **PCR-derived EXTINF**; web input accepts `srt://`, SRT Monitor view registered (route `srt`), upgrade banner + run-once prompt wired to `/helper/manifest.json` |
| 2 — Push + record | **done** | Listener mode with reject-then-survive semantics (`enforcedencryption`), recording spool + disk replay as VOD playlist, tested in Go and in the real-SRT smoke |
| 3 — Deep analysis | **done** | `evaluateSrtRules` rule family + `correlateLoss` alignment (§5 candidates) as pure contract-tested modules; TS continuity comes from the existing TS parser on the façade segments |
| 4 — Packaging | **done** | 7 static binaries committed under `tools/srt-helper/bin/`, `manifest.json` (schema 1, sha256+bytes per artifact), `scripts/build-helper.sh`, both CI workflows build+serve `dist/helper/` |
| 5 — Extension + WebRTC | **partial** | WebRTC adapter (WHEP + `getStats` → LinkTelemetry): contract done in §3.3 normalization table; runtime adapter pending. Chromium extension: not built — remains explicitly optional (PNA bypass only; homelab origin works without it) |

**Verification:** 81/81 node tests (63 pre-existing + 18 new), 97/97 Go tests, ESLint 0 problems, `tsc` error count equal to main baseline (zero new), production build OK, and `scripts/smoke-srt.sh` — real end-to-end with **ffmpeg as the SRT peer**: encrypted listener session, negotiated streamid, PAT-aligned PCR-timed façade chunks (258 TS packets, 0 sync errors), VOD recording replay, 401-on-missing-token enforcement.

**Deferred by design (per adopted decisions):** Chromium extension (optional; PNA-only), hosted gateway (violates static mandate), silent auto-update (supply-chain primitive; prompt-only stays).
