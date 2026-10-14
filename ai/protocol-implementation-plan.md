# Protocol implementation queue — ordered, with the standards to fetch

> Follows ai/protocol-expansion-analysis.md. Every row with value + feasible
> coverage is queued. Docs you need to supply are listed FIRST per item; when
> the "blocked on docs" line is empty, I can start immediately.

## A. What already exists (verified in this tree)

**Low-latency logic already in the codebase** (your hint confirmed):
- `src/infrastructure/parsing/hls/adapter.js`, `delta-updater.js`,
  `feature-analyzer.js`, `compliance-rules/ll-hls.js`, `segments.js` already
  parse `#EXT-X-PART`, blocking-reload, preload hints and delta updates.
- `src/infrastructure/parsing/dash/parser.js` already models
  `ServiceDescription` latency/playback-rate (LL-DASH).
→ The "LL part-level view" item is a **UI/analysis job on existing parsers**,
  not a parser project.

**Standards already vendored in `standard/`**: RFC 8216 + 8216bis (+lowlatency
notes), ISO/IEC 23009-1:2022 (DASH incl. low-latency), ISO 13818-1 (TS),
ISO 23000-19 (CMAF), ISO 23001-7 (encryption), ISO 14496-12 (ISOBMFF),
VSF 23009-5 (DASH), ITU H.222, SCTE-35, RFC 6381, and the SRT RFC draft
(`srt.txt` — already used by the helper). Anything not in that list is below.

---

## Implementation order

> **STATUS: IMPLEMENTED (2026-10-14, commit in `feat/srt-integration`) — see §Implementation log.**

### 1. WebRTC WHIP (publish) — P1, ~2-4 days
**Why first:** RFC 9725 is final; the WHEP adapter is built and live-verified.
Mirroring it gives full browser-native coverage (pull AND push) and completes
the transport matrix with the least new code.
**Blocked on docs:** no — the browser does signaling; I have RFC 9725's numbering
from research, but **please fetch RFC 9725** so the contract tests cite it.
Fetch list:
- `RFC 9725` (WHIP) — datatracker/rfc-editor
- `RFC 9297` (WebTransport over HTTP/3) — needed anyway for item 3
- `W3C "Identifiers for WebRTC's Statistics API"` (webrtc-stats) — canonical
  field names for the getStats normalizer (already implemented, tightens tests)
- latest `draft-ietf-wish-whep` — parity reference for the egress side

> **STATUS: IMPLEMENTED (2026-10-14) — see §Implementation log.**

### 2. LL-HLS / LL-DASH part-level analysis — quick win, ~3-5 days
**Why second:** zero new transport work; the parsers already emit parts; the
missing piece is the *analysis surface* (part timeline, part-to-segment
alignment, LL-aware compliance view, latency accounting in the existing
timeline feature).
**Blocked on docs:** no — `standard/rfc_8216bis_lowlatency.md` and
`standard/iso_23009-1:2022_dash.md` are already vendored.
Scope: part timeline component, LL-DASH availability-window checks, join with
the SRT latency budget panel where both exist.

> **STATUS: IMPLEMENTED (2026-10-14, commit `a98bcc7`) — see §Implementation log.**

### 3. MoQ / Media over QUIC — P1, ~1-2 weeks (after docs land)
**Why third:** the strategic one (it merges the WebRTC-latency and CDN-scale
models; Cloudflare runs a public relay — testable for real). Rides the
WebTransport adapter already in the tree.
**Blocked on docs:** YES — needs the MoQT spec set:
- `draft-ietf-moq-transport` — latest (currently **-22**) — datatracker
- the companion drafts from the MoQ WG (messages/catalog/relay set) — grab the
  current set from https://datatracker.ietf.org/group/moq/documents/
- `RFC 9297` + `W3C WebTransport API` (if you skipped item 1's list)
Scope: MOQT subscribe over WebTransport (datagrams/streams), catalog
rendering, object-level tracing + QoE in the SRT Monitor under a "MoQ" transport
mode; test against a public relay (Cloudflare) or a local relay.
Risk: draft churn — implement against the frozen subset the docs define.

### 4. RTSP / RTP / RTCP — P2, ~1.5-2 weeks
**Why fourth:** richest transport diagnostics (RTCP jitter/loss/RTT, SDP
negotiation forensics) and huge pull value (cameras, remote production, OTT
probing); RTP payloads are usually TS, so the existing parser does the heavy
lifting.
**Blocked on docs:** YES:
- `RFC 7826` (RTSP 2.0), `RFC 3550` (RTP + RTCP), `RFC 4566` (SDP)
Scope: helper session (Go `gortsplib` or hand-rolled) exposing the same
control-plane API as SRT; SDP parse + codec inventory; RTCP-derived telemetry
normalized into LinkTelemetry; RTP→TS de-packetization into the façade.

### 5. RTMP / RTMPS — P2, ~1-2 weeks
**Why fifth:** the ingest protocol most engineers still debug (Twitch/YouTube/
Facebook). Needs exactly one new container parser (FLV).
**Blocked on docs:** YES:
- Adobe `RTMP 1.0 specification` (the canonical PDF incl. AMF0)
- `enhanced-rtmp` (veovera) spec repo — for E-RTMP/HEVC-era extensions
Scope: helper TCP/TLS session, RTMP handshake + command-message forensics,
connect/play/stream lifecycle, FLV demux (via existing ISOBMFF where possible;
new FLV parser otherwise), telemetry = handshake timing, ack sizes, bw probes.

### 6. Icecast / SHOUTcast — P3, ~2-4 days
**Why here:** cheap, fully browser-native (HTTP), and exercises the audio QC +
loudness modules you now have — good "radio network" story.
**Blocked on docs:** small:
- Icecast 2.x protocol documentation (icecast.org) — includes the ICY/
  Shoutcast metadata extension
Scope: ICY metadata parse, audio bitrate/format inventory, loudness QC over
the streamed audio, timeline of metadata events.

### 7. RIST — P3, ~2-3 weeks
**Why here:** broadcast-contribution niche, but high analysis value (ARQ/FEC
counters, profile interop) and it rides the same helper pattern as SRT.
**Blocked on docs:** YES:
- `VSF TR-06-1:2020` (RIST Simple Profile) — static.vsf.tv
- `VSF TR-06-2:2024` (RIST Main Profile) — static.vsf.tv
- TR-06-4 parts (multicast/bonding profiles) — only if bonding is in scope
Scope: RIST listener/caller in the helper (RTP-based), ARQ/FEC telemetry into
LinkTelemetry, profile/interop report (the classic "why won't these two
interoperate" analysis).

### 8. MSS (Smooth Streaming) — backlog, ~1 week
**Why backlog:** declining but cheap (XML manifest like DASH, fragments are
PIFF/ISOBMFF) and the smart input already detects `.ism` — closes the last
manifest gap in this tool's heritage.
**Blocked on docs:** YES:
- Microsoft Learn "IIS Smooth Streaming Client Manifest" documentation
- `PIFF 1.3` specification (fragmented-MP4 variant used by MSS)
Scope: manifest parser + reuse of the DASH-ish pipeline; fragment parse via
the ISOBMFF parser.

### 9. SRTLA (bonding) and HESP — backlog / optional
- **SRTLA**: ~2-3 w; needs multiple SRT sessions + reassembly in the helper;
  docs: BELABOX/srtla repo + protocol notes. Only worth it if IRL/bonding is
  your audience (niche).
- **HESP**: ~2 w; docs: Synamedia HESP spec (registration may be required —
  flag this). Niche browser players only; decide after MoQ lands.

### Excluded (by design, from the expansion analysis)
SMPTE ST 2110/2022-7 (plant hardware, not WAN), Zixi/NDI (proprietary SDKs).

---

---

## Implementation log

### Item 1 — WHIP (publish) — DONE
- `src/infrastructure/webrtc/adapter.js`: `connectWhip()` + `normalizePublishStats()`
  — sendonly transceivers with track attachment, RFC 9725 offer/answer
  handshake, 1 Hz publish-side telemetry (packetsSent/bytesSent → mbpsSend,
  server-side loss from remote-inbound-rtp, RTT, NACKs, quality limitation,
  DTLS state as the encryption signal).
- 5 heux contract tests (`tests/heux/whip-contract.test.mjs`).
- Wiring: `startWhipSession`/`stopWhipSession` in the SRT controller (getUserMedia
  track source with graceful fallback), stopAnySession routing, SRT Monitor
  transport selector, session titles, report taxonomy.
- **Live-verified**: aiortc publisher → MediaMTX WHIP endpoint → 202 packets,
  DTLS connected; the captured real stats normalize through
  `normalizePublishStats` (LIVE-WHIP-E2E pass).

### Item 2 — LL-HLS / LL-DASH part analysis — DONE
- `src/features/lowLatency/domain/llAnalysis.js` (pure): HLS part timeline
  (PART-TARGET, server control, per-segment parts, independent flags,
  preload hints), LL-HLS conformance checks (target drift, missing
  independent parts, part-sum mismatch, PART-INF presence), LL-DASH
  ServiceDescription/Latency view + range checks, playlist-declared latency
  accounting (never fabricating measured values).
- 8 heux contract tests + **4 integration tests** that bundle the REAL
  parsers (HLS + DASH) via esbuild and feed the domain module
  (`tests/integration/ll-integration.test.mjs`, wired into `npm test`).
- UI: `low-latency` route — per-variant part timeline (bar rendering with
  independent markers), LL-DASH latency table, checks panel; wired into the
  shell navigation.

### Item 3 — MoQ (draft-22) — DONE
Browser-side MOQT client (`src/infrastructure/moq/`: varint + wire + session), MSF catalog
normalization + telemetry derivation (`src/features/moq/domain/`), controller/store wiring
and SRT Monitor integration (transport selector, catalog and subscription panels).
Live-verified: Chromium over real WebTransport/QUIC ↔ `tools/moq-testrelay` (independent Go
draft-22 implementation) — SETUP exchange, SUBSCRIBE/OK with measured RTT, MSF catalog,
datagram + subgroup objects, telemetry. The live run caught four real bugs (uni-stream API
shape, subgroup header decode source, alias-before-reply buffering, first-object gap).
Cloudflare's public relay is draft-14 and wire-incompatible with this client; the bundled Go
relay is the verification path.

### Verification summary
- 132/132 node tests (63 baseline + 69 new heux/integration across all SRT
  work), ESLint 0, tsc at the 43-error main baseline, production build green.
- Go suite green; ffmpeg SRT smoke passes.

---

## Decision point before items 4/5/7 (helper-side protocols)
Same question as with SRT, now formal: for RTSP/RTMP/RIST, do you want the
helper **pure-Go** (hand-rolled/Go-lib clients; single static binary, full
telemetry) or **ffmpeg-subprocess-capable** (much less code, but adds a
runtime dependency and coarser stats)? My recommendation: **pure-Go** for RTSP
(`gortsplib` exists and is mature), pure-Go for RIST (libs exist), and
ffmpeg-subprocess **not** needed for RTMP if a Go FLV+RTMP client is acceptable
— decision affects effort estimates above.

## One-shot download list for you (only what's not in `standard/`)

| # | Document | For |
|---|---|---|
| 1 | RFC 9725 (WHIP) | item 1 |
| 2 | W3C webrtc-stats + WebTransport API specs | items 1, 3 |
| 3 | RFC 9297 (WebTransport over HTTP/3) | items 1, 3 |
| 4 | latest draft-ietf-wish-whep | item 1 |
| 5 | draft-ietf-moq-transport (latest, ~-22) + current MoQ WG companion drafts | item 3 |
| 6 | RFC 7826 (RTSP) | item 4 |
| 7 | RFC 3550 (RTP/RTCP) | item 4 |
| 8 | RFC 4566 (SDP) | item 4 |
| 9 | Adobe RTMP 1.0 spec (AMF0 included) + veovera enhanced-rtmp spec | item 5 |
| 10 | Icecast protocol docs (icecast.org) | item 6 |
| 11 | VSF TR-06-1:2020 + TR-06-2:2024 (+ TR-06-4 parts if bonding) | item 7 |
| 12 | Microsoft MSS client-manifest docs + PIFF 1.3 | item 8 |

Drop them anywhere (e.g. `standard/`) and I'll vendored them into the tree the
way `srt.txt` is, then work the queue in order, contract-first per item.
