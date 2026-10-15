# MSS (IIS Smooth Streaming) integration — analysis & design

Item 8 of `ai/protocol-implementation-plan.md`. MSS was the last manifest format this tool's
lineage claimed, and the plan marked it "backlog": the client manifest is XML like DASH, the
fragments are fragmented-MP4 (PIFF), and the smart input already tagged `.ism` URLs as MSS —
what was missing was the parser and the route into the existing pipeline.

## 1. The manifest, as deployed

The client manifest (`SmoothStreamingMedia`, served at `<path>.ism/Manifest`, on disk `.ismc`)
describes one presentation as a list of `StreamIndex` elements, each with a bitrate ladder and
a chunk timeline:

```xml
<SmoothStreamingMedia MajorVersion="2" MinorVersion="0" TimeScale="10000000" Duration="7340000000">
  <StreamIndex Type="video" Chunks="184" QualityLevels="5"
               Name="video_eng"
               Url="QualityLevels({bitrate})/Fragments(video_eng={start time})">
    <QualityLevel Index="0" Bitrate="401000" FourCC="AVC1" MaxWidth="224" MaxHeight="100"
                  CodecPrivateData="000000016742C00DA6…" />
    <c t="0" d="39680000" />
    <c d="39893333" />
  </StreamIndex>
</SmoothStreamingMedia>
```

Fragment URLs are templates on the `StreamIndex`, expanded per fragment:
`QualityLevels(<bitrate>)/Fragments(<stream>=<start time>)`.

## 2. Live survey (2026-10-15) — what shaped the implementation

Two public manifests are still served, and they exercise opposite styles:

| Manifest | Style | Notable |
|---|---|---|
| `demo.unified-streaming.com/…/tears-of-steel.ism/Manifest` | Unified Streaming | audio (AACL) + video (5 QLs), `FourCC="AVC1"`, **name-qualified** `{start time}` placeholders, `t` on the first chunk, `d`-only after |
| `playready.directtaps.net/…/SuperSpeedway_720.ism/Manifest` | classic IIS | video (8 QLs) + audio, `FourCC="H264"`, `d`-only chunks with no `n`, no `TimeScale`, hex `CodecPrivateData` |

Consequences:

1. **`CodecPrivateData` has two AVC layouts in the wild.** The classic
   `AVCDecoderConfigurationRecord` starts `01 <profile> <compat> <level>`, but IIS/Wowza-style
   servers emit the length-prefixed Annex-B form `00000001 67 <profile> <compat> <level>`.
   `avcCodecFromRecord()` accepts both and returns `avc1.PPCCLL`.
2. **The placeholder spelling varies.** `{start time}` (spec), `{start_time}` (an ExoPlayer
   interop quirk), and name-qualified `Fragments(audio_eng={start time})` all appear.
3. **Manifests contradict themselves.** DirectTaps declares `Duration="1209510000"` while its
   61 chunks sum to `1207870001` ticks — a 1.64 M-tick (1.64 s) discrepancy. The adapter
   computes the delta and exposes it as `smoothStreaming.timelineDurationMismatchTicks`
   rather than silently trusting either number. For an analyzer this is the point.
4. **`TimeScale` is optional** (defaults to 10 000 000), and `Duration` may be `0` for live.

## 3. Architecture

```
<path>.ism/Manifest (XML)
        │  fast-xml-parser (same options family as the DASH path)
        ▼
  infrastructure/parsing/mss/parser.js     isMssManifest() + parseManifest()
        ▼
  infrastructure/parsing/mss/adapter.js
    adaptMssToIr()        → periods[0].adaptationSets[].representations[]  (DASH-shaped IR)
    expandChunkTimeline() → fragment timeline with r-run semantics, derived t/n
    expandFragmentUrl()   → {bitrate} / {start time} / {start_time} / name-qualified
    mssCodecString()      → FourCC + CodecPrivateData → avc1.* / mp4a.40.*
        ▼
  worker analysisHandler (protocol === 'mss' branch, isMssManifest-gated)
        ▼
  same IR the manifest viewer, compliance engine and feature analysis consume
```

MSS-only detail (URL template, chunk timeline, ladder, duration cross-check) is preserved
under `smoothStreaming` on the manifest and each adaptation set, so a Smooth-Streaming panel
can show it without a parallel model.

## 4. Verification

- 14 heux contract tests driven by the two real fixtures (plus inline manifests for live/DVR
  and empty cases): routing, stream/QualityLevel counts, ladder ordering, codec derivation
  for both AVC layouts, AAC AudioSpecificConfig → `mp4a.40.2`, chunk-run expansion,
  duration-mismatch detection, fragment-URL expansion, and non-MSS rejection
- Fixtures hash-locked into `tests/fixtures/manifest.json` (the corpus integrity test
  enforces it)
- Both manifests re-fetched live during verification and ship as verified example entries

## 5. Follow-ups

- MSS fragment (PIFF/ISOBMFF) inspection: resolve fragment URLs from the timeline and run
  them through the existing ISOBMFF box parser, giving segment-level detail like DASH/HLS
- A Smooth-Streaming analysis panel: stream table with ladders, the fragment timeline
  (including the duration mismatch), and resolved fragment URLs
