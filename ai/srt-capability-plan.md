# SRT capability expansion — from the helper to the analyzer

> Grounded in what `30bcd23` actually shipped: a local UDP-owning helper that
> hands the browser (a) normalized SRT telemetry and (b) a PAT-aligned,
> PCR-timed synthetic HLS façade whose segments the **existing** TS/HLS
> machinery already parses. Everything below builds on those two channels.

## What the engineer already gets (verify first, extend second)

| Channel | Today | Comes free because |
|---|---|---|
| Transport | RTT, loss, retrans, drops, buffers, negotiated latency, link capacity, encrypted flag — live charts + rules | helper telemetry → srtStore |
| Segment | every façade segment is analyzed by the existing pipeline: HLS timeline, segment explorer, ISOBMFF/TS box views, SCTE-35, ad detection, QC (freeze/black via WebCodecs), compliance scoring | façade = a live m3u8 over `http://127.0.0.1:<port>` |
| Recording | spool-to-disk, VOD replay for after-the-fact analysis | recorder + replay endpoints |

## High-value additions (ranked, with effort)

### Tier 1 — days each, pure/reusable, big daily value

1. **TS-level analytics on the façade** (`domain/tsAnalytics.js`, contract-tested):
   PID inventory (PID → declared type via PMT), per-PID bitrate timeline,
   continuity-counter error ledger per PID, transport_error indicators,
   PAT/PMT repetition intervals. This is the "show me what's inside the stream"
   panel that SRT monitoring tools lack.
2. **GOP/keyframe structure**: keyframe PID sequence + GOP length histogram →
   tells an encoder/ABR engineer whether the GOP pacing matches the latency
   target (GOP ≲ latency budget).
3. **PCR/PTS analytics**: PCR interval histogram + PCR accuracy indicator
   (OI) + PTS discontinuity detection + measured frame rate. Directly derived
   from bytes the helper already delivers.
4. **Telemetry export**: JSONL/CSV export of the session series + session
   summary (config, negotiated params, issues) for tickets/postmortems.
5. **Loss↔TS correlation view**: render `correlateLoss()` on the timeline —
   SRT drops vs CC errors vs discontinuities in one chart (the differentiator
   no HLS tool can produce).

### Tier 2 — 1–2 weeks, needs helper or UI work

6. **SRT handshake forensics** (`helper` addition): log insisted/negotiated
   options (latency, cipher, KM state, streamid, rejection reason codes
   SRT_REJ_*). "Why won't my encoder connect?" is the #1 SRT support question;
   a readable handshake timeline answers it.
7. **Threshold alerts**: user-defined rules (RTT > X ms, loss > Y%) → in-UI
   alert history + optional local webhook (homelab-friendly, no cloud).
8. **Multi-session failover view**: 2+ SRT links (main/backup) compared
   side-by-side on the same clock — contribution redundancy analysis.
9. **Loudness/AV-sync extension of QC**: the façade carries AAC/PCM audio;
   WebCodecs + WebAudio already exist in the repo — loudness (EBU R128) and
   A/V drift measurement on SRT feeds is a small delta.
10. **Latency budget breakdown**: encoder→SRT (RTT/2 + TSBPD) → helper →
    browser decode; show per-stage contributions (SCTE-35 markers as the
    wall-clock anchor when present).

### Tier 3 — larger, roadmap-coupled

11. **WebRTC/QUIC-WebTransport adapters** into the same monitor (per §3.3 the
    LinkTelemetry schema is prepared; WHEP + getStats is the fast-follow).
12. **Shared session reports**: export a comparable report per stream (DASH,
    HLS, SRT) — extends the existing integratorsReport concept to transport
    quality.
13. **Helper as a light Prometheus exporter** (`/metrics`) for homelab
    Grafana dashboards — external monitoring of SRT ingest.
14. **Config advisor**: from observed bandwidth/loss/RTT, recommend
    `maxbw`/`inputbw`/`latency`/`pbkeylen` for the link (utilizing the SRT
    draft's 3–4×RTT rule).

## Status after the Tier 2/3 implementation pass — ALL TIERS IMPLEMENTED

### Tier 1 (done, commit fbaabc3)
- `src/features/srtSource/domain/tsAnalytics.js` — items 1–3 as pure,
  contract-tested functions (TS byte scanner: PAT/PMT/PCR/PES walk, PID
  inventory, per-PID bitrate, continuity errors, GOP spacing, PCR interval,
  per-stream PTS export).
- Telemetry + analytics export (`srtExport.js`): JSONL/CSV series export and
  a session summary document.
- Monitor UI: "Stream contents" panel + export buttons.

### Tier 2 (done)
- **#6 Handshake forensics** — Go ledger (`internal/session/handshake.go`):
  every accept/reject with SRT rejection codes (`REJ_BADSECRET`,
  `REJ_UNSECURE`, …) and negotiated parameters; `GET /sessions/{id}/handshake`;
  persisted rejection/success records in recording sessions; Monitor panel.
- **#7 Threshold alerts** — `domain/alerts.js`: threshold config with
  warn/critical levels, hysteresis (fire on transitions, clear on recovery),
  alert history in srtStore (bounded 200), Monitor panel.
- **#8 Failover view** — `domain/failover.js`: 1 Hz time alignment + pairwise
  rate/RTT/loss deltas; Monitor comparison section.
- **#9 A/V sync + loudness** — `domain/avSync.js` (PTS/PCR offset + drift ppm,
  discontinuity summary) and `domain/loudness.js` (EBU R128: K-weighting per
  BS.1770-4, 400 ms gated blocks, -70/-10 LU gates, short-term/momentary max,
  WebAudio decode path); A/V offset shown in Stream Contents.
- **#10 Latency budget** — `domain/latencyBudget.js`: staged budget
  (link half-RTT + TSBPD + helper window + player buffer) with honest
  "unknown" stages; draft formula RTT/2 + latency; Monitor panel.

### Tier 3 (done)
- **#11 WebTransport/MoQ adapter** — `infrastructure/webrtc/webtransport-adapter.js`:
  datagram + unidirectional-stream ducts with cancellation, 1 Hz byte/datagram
  counters, honest nulls (no RTT/loss in WebTransport); controller wiring
  (`startWebTransportSession`); 4 contract tests.
- **#12 Unified session reports** — `domain/report.js`: one schema for
  dash/hls/srt/webrtc (session + telemetry + advisories + TS contents +
  issues), SRT URL redaction enforced, Markdown rendering; Monitor "Export
  full report".
- **#13 Prometheus exporter** — Go `internal/api/metrics.go`:
  `GET /metrics` exposition (per-session counters/gauges for RTT, loss,
  retransmission, drops, buffers, TSBPD, rates) with pure render function +
  tests; link surfaced in the Monitor.
- **#14 Config advisor** — `domain/advisor.js`: latency = max(120 ms floor,
  4× worst RTT) on a 25 ms grid, inputbw = peak × 1.3 headroom, pbkeylen
  escalation under sustained loss, paste-ready query string + rationale;
  Monitor panel.

### Verification for this pass
- 19 new contract tests (alerts, advisor, budget, A/V sync, loudness,
  failover, report, WebTransport) — 109/109 node tests total.
- Go: handshake ledger + Prometheus tests; 7 packages green (incl. real
  loopback reject-then-accept forensics), `gofmt`/`vet` clean.
- Real binary: `/metrics`, `/version`, `/sessions/{id}/handshake` verified
  against a live helper process; `scripts/smoke-srt.sh` (real ffmpeg/libsrt
  end-to-end) passes again.
- ESLint 0, tsc exactly at the main baseline (43).
