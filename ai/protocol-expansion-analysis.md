# Protocol expansion analysis — what to add after HLS / DASH / SRT

> Investigative deliverable (no code). Grounded in the current tree
> (`feat/srt-integration`, merged to main) and in 2025-2026 standards facts.

## What the analyzer can ingest today

| Protocol | Status | Substrate |
|---|---|---|
| **HLS** (incl. LL-HLS parts) | full parser, compliance, timeline, segment inspector | browser-native HTTP |
| **DASH** (incl. low-latency profile) | full parser, compliance, timeline, segment inspector | browser-native HTTP |
| **SRT** | helper (Go/gosrt) + façade + SRT Monitor + analytics + WebRTC/**WebTransport adapters** | **local helper** (browser cannot do UDP) |
| **WebRTC** | WHEP adapter implemented, live-verified against MediaMTX | browser-native |
| **WebTransport** | adapter implemented (contract-tested; datagram + stream ducts) | browser-native (Safari partial) |
| MSS | input **detected only** (`.ism`) — no parser | HTTP |

The reusable core for everything below: the same façade pattern (bytes + a
synthetic manifest), the TS/ISOBMFF parsers, the telemetry store, the SRT
Monitor's charts/rules/exports, and the contract-test discipline.

## Candidate protocols (user asked for "webrtc, quic, wapi and any other")

"WAPI" is not a streaming protocol; assuming **WHIP/WHEP** (WebRTC-HTTP,
IETF WISH WG). Full landscape:

### Master table

| Protocol | Transport | Browser-native? | Status 2025/26 | Analysis value here | Feasibility | Priority |
|---|---|---|---|---|---|---|
| **WebRTC WHIP** (ingest) | QUIC/UDP (SRTP) | ✅ yes (RTCPeerConnection) | **RFC 9725, Proposed Standard (Mar 2025)** | publish path: getStats telemetry (loss/jitter/RTT), DTLS/ICE forensics | **Very high** — WHEP adapter exists; mirror it ~2-3 days | **P1** |
| **WebRTC WHEP** (playback) | QUIC/UDP | ✅ yes | draft, near-RFC (WISH WG) | done + live-verified | done | — |
| **MoQ / Media over QUIC** | QUIC via **WebTransport** | ✅ via WebTransport (Chrome/Edge 97+, FF 114+, Safari 26.4*) | WG draft-15; **Cloudflare runs a public MoQ relay network (330+ cities)** | object/catalog tracing, subscription-level QoE, relay-level stats | **High** — WebTransport substrate already built; needs a MoQT client (~1-2 w) | **P1** |
| **RTMP / RTMPS** | TCP+TLS | ❌ | legacy but **#1 ingest** (Twitch/YouTube/FB still speak it) | handshake+command forensics, FLV container stats, a/v sync | Medium — FLV parser + TCP client in helper or Go (ffmpeg subprocess as fallback) | **P2** |
| **RTSP / RTP / RTCP** | UDP/TCP+RTCP | ❌ (SDP parsing only) | IP cameras, ONVIF, OTT probes | **richest transport stats**: RTCP jitter/loss/RTT, SDP codec negotiation | Medium-High — `aler9/gortsplib` (Go, mature) or helper subprocess | **P2** |
| **RIST** (VSF TR-06) | RTP/UDP+ARQ/FEC | ❌ | broadcast contribution; multipath/multicast/bonding | TR-06 profiles, ARQ/FEC counters | Medium — Go libs exist (`ristgo` etc.); interop needs profile work | P3 |
| **SRTLA** (bonding) | SRT×N + proxy | ❌ | experimental (BELABOX), IRL bonding community | multi-link SRT aggregation view | Medium-High, niche audience | P3 |
| **HESP** | CMAF over HTTPS | ⚠️ JS players only (Synamedia/THEO) | niche (DVB-I synergy) | sub-segment fetch tracing | Low-Medium — manifest parser + player work; small audience | P4 |
| **MSS** | Smooth Streaming XML | ✅ HTTP | declining legacy | period/stream manifest like DASH | Medium — empty parser slot already detected in smart-input | P4 |
| **Icecast/SHOUTcast** | HTTP stream | ✅ fully | alive for radio/audio | metadata, audio QC (loudness module exists!) | Trivial (HTTP + ICY metadata parse, ~days) | P3 |
| **SMPTE ST 2110/2022-7** | UDP multicast, PTP | ❌ needs NIC teaming | broadcast plant, not WAN | packet-level, seamless switching proofs | Very high (multicast capture, 2110-20/30 parsing), niche | P5 |
| **NDI / Zixi / proprietary** | various | ❌ | closed SDKs/licensing | — | licensing blocks | ✗ excluded |
| **LL-HLS / LL-DASH** | HLS/DASH | ✅ | — | incremental on existing parsers | trivial (part-level views) | P2 quick win |

\* Safari 26.4 ships the API per moq.dev transport docs (18.4 needed a flag).

## Feasibility logic (what drives the ranking)

1. **Substrate availability** — browser-native (WHEP/WHIP/MoQ/Icecast/HESP-playback) reuses everything; UDP protocols need the local helper pattern that SRT already proved.
2. **Reuse of what exists** — WHIP ≈ the WHEP adapter mirrored (days); MoQ rides the WebTransport adapter (weeks); RTSP reuses TS parsing + gosrt-style stats; RTMP needs one new container parser (FLV).
3. **Standards maturity** — WHIP is an RFC (safe to build on); MoQ is draft-but-deployed (Cloudflare's public relay makes it real); WHEP near-done; RIST niche; HESP waning.
4. **Engineering audience value** — ingest debugging (RTMP/RTSP/WHIP) and next-gen CDN tracing (MoQ) are where analysis beats "can it play?"; SMPTE 2110 requires plant hardware (out of scope for a browser tool).
5. **Cost** — helper-side protocols are bounded by the SRT precedent: same control plane, same façade, same tests. Pure-browser protocols are cheaper still.

## Recommended sequence

1. **WHIP** (days): complete the browser-native transport story (pull + push + play-side) with the same telemetry/exports; the analyzer then covers contribution AND playback of WebRTC.
2. **MoQ client** (1-2 w): subscribe to a public Cloudflare MoQ relay or a local relay; object/catalog metrics in the SRT Monitor; the strategic bet (it subsumes the WebRTC-signaling + CDN model).
3. **RTSP/RTP** (1-2 w): gosrt-style helper session + SDP/RTCP analytics; huge value for camera/remote-production workflows and it reuses the TS parser when RTP carries TS.
4. **RTMP/RTMPS** (1-2 w): FLV parser + TCP session forensics; the practical ingest protocol most engineers still debug.
5. Quick wins: **Icecast** (days, exercises the loudness/audio path) and **LL-HLS part-level view** (days, on top of the existing parser).

## Open questions for the user

- Scope preference: browser-native-first (WHIP/MoQ/Icecast) or helper-first (RTSP/RTMP)?
- Is RTSP's SDP/RTCP stats (camera world) a priority, or is ingest (RTMP/WHIP) the target audience?
- Accept a ffmpeg-subprocess fallback inside the helper for exotic protocols, or keep the helper single-binary pure-Go (more code, no subprocess dependency)?
