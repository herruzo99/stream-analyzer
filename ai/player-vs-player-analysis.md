# Player vs Player (PvP) — Feature Analysis

> Status: **Analysis / pre-implementation**. Nothing in this document has been built yet.
> Goal: add a *real player vs. player comparison* experience to the app: two (or more)
> actual Shaka players running side by side, with frame-accurate alignment, metric
> math (add / subtract / ratio / variance / correlation) and the forensic tools a
> professional video engineer expects.

---

## 1. Current state (verified against the codebase)

The app is a browser-only DASH/HLS analyzer, Clean-Architecture style:
`src/features/*` vertical slices (`domain/`, `application/`, `ui/`), `src/state/*`
Zustand stores, `src/infrastructure/*` adapters, views registered in
`src/ui/shell/mainRenderer.js` and described by `src/ui/shell/navigation-contract.js`.

### 1.1 Real-playback infrastructure that already exists

| Capability | Where | Notes |
|---|---|---|
| Shaka loader | `src/infrastructure/player/shaka.js` (`getShaka()`) | dynamic `import('shaka-player')` |
| Single player | `src/features/playerSimulation/` | `playerService.js` (855 lines), telemetry sidebar, HUD, custom transport bar |
| Multi real players | `src/features/multiPlayer/` | `multiPlayerService.js` (861 lines): creates one `shaka.Player` per stream, attaches video elements, `getStats()` sampling on a 2 s tick, stall detection via `StallCalculator`, retry/backoff with session generations, sync-to-master, per-stream config overrides, stream duplication, event log |
| Player metrics model | `src/types.ts` → `PlayerStats`, `PlayerInstance` | `playbackQuality` (resolution, dropped/corrupted frames, stalls, stall duration, TTFF, decoded frames), `abr` (bitrate, estimated bandwidth, switches up/down, load latency), `buffer` (seconds, gaps, forwardBuffer), `session` (playtime, buffering time) |
| Player charts | `src/ui/shared/charts/chart-renderer.js` (ECharts wrapper) + `multiPlayer/ui/components/graphs-view.js` | buffer / latency / bandwidth / bitrate overlays, theme-aware |
| DRM + track config | `multiPlayer/application/playerConfigService.js` | `buildDrmConfig`, `setAbrEnabled`, `setGlobalTrackByHeight`, `selectVariantTrack`, `selectAudioLanguage`, `applyStreamConfig` |
| Live sync math | `multiPlayerService.syncAllTo()` | computes `offsetFromLive = seekRange.end - currentTime` on the master and re-applies it to all players; live-edge aware |

### 1.2 Comparison features that already exist

| Feature | Route | Nature |
|---|---|---|
| Manifest comparison | `comparison` (`src/features/comparison/`) | table / semantic-diff-timeline / structural-diff modes; pure manifest-level projection (`comparison-contract.js`, frozen view-model, limits, stable ids) |
| Segment comparison | `segment-comparison` (`src/features/segmentComparison/`) | ISOBMFF / TS / VTT structural comparators over fetched segments |

**Both are static/manifest-level.** Neither runs a player, neither measures real
playback behavior, and neither can compute relationships *between measured signals*.

### 1.3 The gap

1. **No route runs two real players for the purpose of comparing their measured
   behavior.** "Multi-View" can play many streams, but it is a grid of independent
   players whose only joint visualization is four independent overlay charts; there
   is no pairing, no alignment, no derived channels (A−B …), no session scorecard,
   no export.
2. **No metric-math layer.** There is no code anywhere that combines two time series
   (add/subtract/ratio), computes rolling variance or correlation, or estimates
   alignment offsets. `graphs-view.js` merely plots raw channels side by side.
3. **No frame-accurate alignment.** Nothing converts playhead time → frame index,
   nothing nudges by ±1 frame (`1/fps`), nothing estimates inter-stream offsets.
4. **No session-level comparison.** Startup time, stall tables, ABR oscillation,
   time-weighted quality, uptime/buffering ratios — no comparative scorecard exists.
5. **Sampling cadence is too coarse for forensics.** `multiPlayerService` samples on
   a 2-second tick and keeps 150 points (≈5 min). Frame-level work needs per-decoded-frame
   sampling (`requestVideoFrameCallback`, ~60 Hz) and a longer ring buffer.
6. Shell wiring for real-player views is fragile (see §5, risk R1).

---

## 2. Proposed feature: "Player vs Player"

### 2.1 Placement

The user wants this **in the players zone of the sidebar** — the `Playback & QC`
navigation group (`navigation-contract.js`), next to *Player Sim* and *Multi-View*:

```
Playback & QC
├── Player Sim        (existing, 'player-simulation')
├── Player vs Player  (NEW, 'player-vs-player')
├── Multi-View        (existing, 'multi-player')
├── Signal Quality    (existing)
└── Ad Verification   (existing)
```

Route key: `player-vs-player`; label: **Player vs Player**; icon: `git-compare-arrows`
(new entry in `src/ui/icons.js`). Visible when `streams.length > 1`. We keep the
manifest-level `comparison` feature untouched — this is a *sibling* capability in the
playback group, not a mode of manifest comparison.

### 2.2 Architecture — new vertical slice

Follow the repo's established slice pattern (like `multiPlayer` and `comparison`):

```
src/features/playerVsPlayer/
├── domain/                         # pure, dependency-free, unit-tested
│   ├── metric-channels.js          # canonical channel defs + sample extraction
│   ├── series-math.js              # add / subtract / ratio / |Δ| / rolling var / rolling corr
│   ├── alignment.js                # frame grid, rVFC mediaTime maps, tfdt/trun verification, correlation fallback
│   ├── statistics.js               # summarize() → n/min/mean/stddev/CV/percentiles + CI
│   ├── session-scorecard.js        # session metrics + delta + verdict comparator
│   ├── abr-analysis.js             # switches, time-weighted bitrate, rung histogram, oscillation
│   └── player-comparison-contract.js  # frozen projected view-model (mirrors comparison-contract.js)
├── application/
│   ├── playerVsPlayerService.js   # owns N shaka.Players, sampling, sync, export
│   ├── player-vs-player-contract.js # event payloads / limits / redaction
│   └── playerVsPlayerController.js  # eventBus wiring (mirrors multiPlayerController.js)
├── ui/
│   ├── index.js                    # view class: mount / unmount / activate / deactivate
│   └── components/
│       ├── player-pair.js          # video panes A/B + per-player HUD
│       ├── transport-bar.js        # play/pause both, nudge ±frames, sync, live-edge align
│       ├── overlay-graph.js        # ECharts overlay: channel toggles + op selector + Δ channel
│       ├── alignment-controls.js   # offset (frames/ms), method, confidence, auto-align
│       ├── scorecard.js            # session A-vs-B scorecard with delta + verdict chips
│       ├── stall-table.js          # stall forensics windows, side-by-side
│       ├── abr-compare.js          # switch counts, rung histograms, oscillation
│       └── export-dialog.js        # JSON session + CSV per-channel + import
└── index.js
src/state/playerVsPlayerStore.js   # zustand vanilla (mirrors multiPlayerStore.js)
tests/playerVsPlayer/*.test.mjs    # pure domain tests (node --test)
```

### 2.3 Core data model

```ts
// src/types.ts additions
interface PvpSample {            // one per decoded frame (rVFC cadence)
  t: number;                    // playhead seconds (video.currentTime)
  wall: number;                 // Date.now() at capture
  frame: number;                // decoded frame count (getVideoPlaybackQuality().totalVideoFrames)
  buffer: number;               // seconds ahead of playhead
  bitrate: number;              // active variant video bandwidth
  bandwidth: number;            // shaka estimatedBandwidth
  loadLatency: number;          // segment load latency (s)
  width: number; height: number;
  dropped: number;              // cumulative dropped frames
}
interface PvpPlayerState {
  role: 'A' | 'B' | 'C' | null; // experiment role
  sourceStreamId: number;
  streamName: string;
  streamType: 'live' | 'vod';
  state: 'idle'|'loading'|'playing'|'paused'|'buffering'|'ended'|'error';
  videoElement: HTMLVideoElement | null;
  player: any | null;                 // shaka.Player
  startupMs: number | null;           // load() → first presented frame
  samples: PvpSample[];               // ring buffer, cap ~18 000 (≈5 min @60 Hz)
  config: { abr: boolean|null; maxHeight: number|null; maxBandwidth: number|null; lockedTrack: string|null };
  ...
}
```

Sampling: `video.requestVideoFrameCallback` when available (records `metadata.mediaTime` — the presented frame's media PTS in Shaka's normalized clock — and `metadata.presentedFrames`), else 60 Hz `rAF` fallback. Ring buffer per player (FIFO) so memory stays bounded (~18k × ~60 B ≈ 1 MB/player), and collection continues in the background (see §6.2 — PvP players are wired into the persistent-player lifecycle: deactivate → keep running muted; unmount → destroy). This is the first feature in the codebase sampling at frame cadence with real frame timestamps; `multiPlayerService`'s 2 s tick stays as-is.

### 2.4 The comparison engine (what pro engineers asked for)

All in `domain/`, pure functions, unit-tested.

**a) Channels** (`metric-channels.js`)
Canonical, selectable channels: `buffer`, `bitrate`, `bandwidth`, `loadLatency`,
plus derived `dropped`/`frames`. Each channel has label, unit, formatter, and an
accessor over `PvpSample` so the UI never touches raw store shape.

**b) Math ops between two streams** (`series-math.js`)
After resampling both series onto one common (frame or fixed-Δt) grid:

| Op | Meaning | Typical use |
|---|---|---|
| `A`, `B` | overlay only | "put one stream over the other" |
| `A − B`, `B − A` | subtraction | who buffers more, delta channel |
| `A + B` | addition | combined load model (e.g. shared-CDN total) |
| `A / B` | ratio | normalized superiority/penalty |
| `\|A − B\|` | absolute delta | envelope of divergence |
| `rollingVar(A,B)` | rolling variance of the pair | stability comparison |
| `rollingCorr(A,B)` | rolling Pearson correlation | co-behavior vs. divergence |

**c) Frame-accurate alignment** (`alignment.js`)
- `toFrameIndex(t, fps)` = `round(t · fps)`; fps parsed from the active variant's
  `frameRate` (handles `"30"` and rational `"30000/1001"`).
- `estimateOffsetFrames(seriesA, seriesB)` — brute-force cross-correlation over a
  bounded lag window (default ±300 frames) on a normalized envelope, refined with a
  parabolic peak fit for sub-frame precision; returns `{ offsetFrames, offsetSeconds,
  confidence }`. Lag sweep is on the downsampled envelope so it stays O(n·log) cheap.
- `frameShift(offsetFrames, fps)` → seconds; nudge controls do
  `video.currentTime += offsetFrames / fps` (±1, ±10, ±1 s).
- Manual mode: user dials the offset; auto mode uses the estimator; both coexist
  with live-edge sync (reuses the `offsetFromLive` math from `multiPlayerService`).

**d) Statistics** (`statistics.js`)
`summarize(values)` → `{ n, min, p5, p50, p90, p95, max, mean, stddev, cv, meanCI95 }`;
`timeUnder(series, threshold)`; `longestExcursion(series, predicate)` (longest buffer
starvation window); `bufferHistogram(series, bins)`.

**e) Session scorecard** (`session-scorecard.js`)
Side-by-side session metrics with delta and a verdict (`better` / `worse` / `even`):
startup (TTFF), stall count, total stall seconds, buffering ratio, avg/min buffer,
time under 2 s, time-weighted avg bitrate, ABR switches up/down, decoded frames,
dropped frames, uptime. Verdicts use direction-aware rules per metric (lower/higher
is better).

**f) ABR analysis** (`abr-analysis.js`)
Switch counting from the rung history, time-weighted average bitrate, per-rung
time histogram (seconds at 1080p/720p/…), oscillation index (direction-change rate).

### 2.5 Experiment tooling (application layer, `playerVsPlayerService.js`)

Professional-video-engineer workflow support:
- **Config parity**: apply identical restrictions to both players (ABR on/off, max
  height, bandwidth cap, locked track) so a comparison is apples-to-apples; parity
  state is shown in the UI.
- **Startup benchmark**: run N load→first-frame measurements per player, report
  mean/variance. Uses the same pattern as multiPlayer retry logic (no new primitives).
- **Stall forensics**: per-player stall windows (start/end/duration, buffer at
  onset), merged onto one timeline, "who stalled first" at each joint window.
- **Live sync**: master/offset sync and live-edge alignment (ported from
  `multiPlayerService.syncAllTo`).
- **Export/import**: full JSON session (config + samples + computed models) and CSV
  per channel + scorecard; import a saved session to re-analyze offline.
- Patched-manifest interception already exists in `multiPlayerService` (response
  filter serving `patchedRawManifest`); replicate for PvP so the patcher feature
  works here too.

### 2.6 Reuse plan (no new infrastructure)

| Existing | Reused by PvP |
|---|---|
| `getShaka` (`infrastructure/player/shaka.js`) | player creation |
| `playerConfigService` (`multiPlayer/application`) | DRM, ABR, track lock, parity |
| `StallCalculator` (`multiPlayer/domain`) | stall metrics |
| `chart-renderer.js` (`ui/shared/charts`) | all ECharts rendering, theming |
| `format.js`, `icons.js`, `lit-html` conventions | UI |
| `comparison-contract.js` projection pattern | `player-comparison-contract.js` (frozen, limited, stable ids — testable) |
| `uiStore` tab-state pattern (`multiPlayerActiveTab`) | `pvpActiveTab` |

### 2.7 UI sketch

```
┌───────────────────────────────────────────────────────────────────┐
│ compare: [Stream A ▾]  vs  [Stream B ▾]   [parity: locked] [export]│
├───────────────────────────────┬───────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐ │  channel: [buffer▾]  op: [A−B▾]    │
│  │ A  [HUD]  │  │ B  [HUD]  │ │  ┌───────────────────────────────┐ │
│  │           │  │           │ │  │  overlay graph: A, B, Δ, var  │ │
│  └───────────┘  └───────────┘ │  └───────────────────────────────┘ │
│  ▶/⏸  ⏮ -1f  +1f ⏭  sync  align│  alignment: offset 12.3 f (410ms) │
├───────────────────────────────┴───────────────────────────────────┤
│ tabs: [scorecard] [stalls] [abr] [session]                        │
│  metric            A          B        Δ (A−B)    verdict         │
│  startup (ms)      812        644      -168       B better         │
│  stalls            3          0        -3         B better         │
│  buffer avg (s)    8.2        5.9      +2.3       A better         │
└───────────────────────────────────────────────────────────────────┘
```

Mobile: panes stack; ops/alignment collapse into the existing FAB-menu pattern used
by the comparison view (`fabMenuTemplate`).

---

## 3. Implementation plan (phased, each independently verifiable)

| Phase | Deliverable | Verification |
|---|---|---|
| 0 | Route registration (`navigation-contract.js`, `icons.js`, `viewMap`, lifecycle in `mainRenderer.js`), empty view shell, `playerVsPlayerStore` | app runs, route visible/clickable |
| 1 | `domain/` modules + `tests/playerVsPlayer/*.test.mjs` (series-math, alignment, statistics, scorecard, abr-analysis) | `npm test` green (test script extended) |
| 2 | `playerVsPlayerService.js`: pair creation, rVFC sampling, ring buffers, parity config, sync/nudge, export | manual: two streams play, samples accumulate |
| 3 | UI: player-pair + transport + overlay-graph (channels/ops) + alignment-controls + scorecard | manual A/B comparison end-to-end |
| 4 | Stall table, ABR compare, startup benchmark, export/import dialog | manual forensics pass |
| 5 | A11y, mobile FAB, theme tokens, README + `ai/` docs update, `npm run lint` + `npm run typecheck` | clean |

Phase 1 is test-first per the repo's stated doctrine (`ai/architectural-context.md`).
Total estimate: a substantial slice (~15 new files, ~3 small edits to existing files,
plus one bug fix noted below).

---

## 4. Files touched vs. created

**Create**: everything in §2.2 plus `src/state/playerVsPlayerStore.js`, tests, docs.

**Edit (small)**:
- `src/ui/shell/navigation-contract.js` — new item in `playback-qc` group (+ icon map entry).
- `src/ui/shell/mainRenderer.js` — register view in `viewMap`; add to the persistent-view
  special-case (`activate`/`deactivate`) exactly like `multi-player`.
- `src/ui/icons.js` — add `gitCompareArrows`.
- `src/types.ts` — `PvpSample`, `PvpPlayerState`, op/lag types.
- `src/state/uiStore.js` — `pvpActiveTab` (+ setter), mirroring `multiPlayerActiveTab`.
- `src/types/events.js` — new `PVP_*` events (rename-free: add a block next to `MP_*`).
- `package.json` — extend `test` script to include `tests/playerVsPlayer/*.test.mjs`.
- `README.md` — feature bullet.

---

## 5. Risks & mitigations

| # | Risk | Mitigation |
|---|---|---|
| R1 | **`multiPlayerView` has no `activate()`/`deactivate()`.** `mainRenderer.js:189` calls `newView.activate?.(container)` for `multi-player`; the class (`multiPlayer/ui/index.js`) defines only `mount/unmount/onMount/onUnmount`, so the Multi-View route currently mounts nothing. Our feature would inherit the same footgun. | Implement the new view with real `mount/unmount/activate/deactivate` **and fix `multiPlayerView`** by adding `activate(container){ if(!this.container) this.mount(container); }` + `deactivate(){}` (keep players alive across tab switches). This is a prerequisite, not scope creep — the players zone must be healthy. |
| R2 | Two+ concurrent Shaka instances (decoders, network). | Default exactly 2 (A/B); only A unmuted (muted autoplay policy, same as multiPlayer); pause on `visibilitychange` hidden; players destroyed on `unmount` (results→input) and optionally on long deactivate. Configurable later. |
| R3 | rVFC support (Firefox <132 lacks it; Safari OK on recent versions). | Feature-detect; fallback to 60 Hz `rAF` + `getStats()` cadence. All domain math works on whatever grid is present because alignment resamples. |
| R4 | fps unknown / VFR content. | Parse variant `frameRate` (string or rational); fall back to 30 fps for nudges with a visible "assumed fps" badge; offsets always also shown in ms. |
| R5 | Live streams: sync drift, seek windows. | Reuse the proven `syncAllTo` math (`offsetFromLive` vs `seekRange()`); PvP stores each side's live offset so Δ stays honest. |
| R6 | Ring-buffer memory/long sessions. | 18k-sample FIFO (~1 MB/player) + explicit "flush session" action; store keeps only derived aggregates for very long runs. |
| R7 | Cross-correlation O(n·lag) cost at 60 Hz. | Estimate on a 2 Hz envelope (downsample first), then refine the top ±5 lags at full resolution; bounded lag window (±300 frames default). |
| R8 | Timeline duplication with existing `comparison`/`segment-comparison` views. | PvP compares *measured playback*, not manifests/segments; cross-links (open manifest view for A) instead of merging code paths. |
| R9 | Patched manifests / MSW interceptor interaction. | Port the existing response-filter registration from `multiPlayerService.loadStreamIntoPlayer` verbatim. |

---

## 6. Decisions (confirmed with the operator)

1. **Scope**: A/B pairing only at launch; the store stays role-keyed so C/reference is additive later.
2. **Background sampling**: frame-cadence collection continues while the view is not focused. PvP players are wired into the *same persistent-player lifecycle* as the single-player sim (which lives in `#persistent-player-container`, survives tab switches, supports PiP): deactivate → keep players running muted; unmount (results→input) → destroy. The ring buffer keeps completing across tab switches so graphs/scores are seamless on return.
3. **Auto-align signal**: two-stage, both metadata-grade:
   - **Stage 1 (live, authoritative)**: `video.requestVideoFrameCallback(now, metadata)` delivers `metadata.mediaTime` (the presented frame's media PTS in the Shaka-normalized clock) plus `presentedFrames`. Because Shaka normalizes both players to one timeline, `mediaTime`/frame-index differences *are* frame metadata alignment — no estimation needed. This also gives us true per-frame sampling with presentation timestamps.
   - **Stage 2 (bitstream verification / offline)**: the app already parses ISOBMFF `tfdt` (baseMediaDecodeTime) and `trun` (sample count, per-sample durations, composition offsets) in `src/infrastructure/parsing/isobmff/parser.js` + `boxes/tfdt.js` + `boxes/trun.js` (TS: per-PES/PTS). A `frame-timing-map` domain module builds a frame→PTS table per stream from parsed segments and verifies/corrects the Stage-1 offset. This is also the fallback when one stream is a local file that cannot play.
   - Envelope cross-correlation remains the fallback heuristic when neither metadata source is available yet (buffering while loading).
