# Icecast / SHOUTcast integration — analysis & design

Item 6 of `ai/protocol-implementation-plan.md`. Unlike SRT/RTMP this protocol needs **no
helper**: Icecast is plain HTTP(S), so the browser can stream a mount directly with
`fetch()` and read the in-band metadata itself.

## 1. The protocol, as deployed

A listener request is HTTP with one extra header:

```
GET /ClassicFM HTTP/1.1
Host: icecast.example:8000
Icy-MetaData: 1
```

The response is the audio body prefixed by headers (`icy-name`, `icy-genre`, `icy-url`,
`icy-pub`, `icy-br`, `Content-Type`, `Server`). When metadata was requested and the mount
supports it, `icy-metaint: N` describes the in-band framing:

```
┌────────┬─ N audio bytes ─┬─ 1 length byte L ─┬─ L*16 metadata bytes ─┐ … repeat
```

`L = 0` means "no update this window". The block is a NUL-padded, semicolon-separated list
of `Key='value'` fields; single quotes are escaped by doubling them. `StreamTitle` is what
players show; other fields are station-specific (live observations include `inf`,
`track_info` (base64) and `UTC`).

SHOUTcast v1 servers answer `ICY 200 OK` instead of an HTTP status line, which
`fetch()` rejects — the UI reports that verbatim instead of failing silently.

## 2. What real stations look like (verified live 2026-10-15)

| Station | Codec | `icy-br` | `icy-metaint` | CORS | Behaviour |
|---|---|---|---|---|---|
| `icecast.thisisdax.com/ClassicFM` | AAC | 48 | 8000 | `*` (+ exposes `Icy-MetaInt`) | metadata events every ~1.3 s |
| `stream.radioparadise.com/mp3-192` | MP3 | — | — | `*` | no in-band metadata; measured rate only |
| `stream.radioparadise.com/aac-128` | AAC | 128 | — | `*` | as above |
| `ice1.somafm.com/*` | MP3 | 128/256 | — | `*` | 403 to browser fetches (needs a browser UA) |

Three consequences that shaped the implementation:

1. **Metadata is optional.** Stations without `icy-metaint` get *no* events, and the panel
   reports the measured rate with `advertised`/`efficiency` left null instead of guessing.
2. **Headers are not guaranteed to be readable.** Icecast exposes ICY headers to browsers
   via `Access-Control-Expose-Headers`; thisisdax does, most do not. The parser therefore
   treats a missing field as "unknown", never as zero, and `parseIcyHeaders` records
   whether the station actually exposed the values we read.
3. **Some stations block non-browser clients** (403). The controller surfaces that error
   verbatim.

## 3. Architecture

```
http(s)://host:port/mount[.mp3|.aac|.ogg]
        │  fetch() with Icy-MetaData: 1 — no helper, no install
        ▼
  domain/icy.js (pure, heux-tested)
    parseIcyHeaders()      headers → mount descriptor (codec, br, metaint, CORS)
    parseIcyMetadataBlock()  L*16 bytes → {StreamTitle, StreamUrl, …}
    IcyStreamParser        framing state machine (chunk-boundary safe)
    summarizeMount()       measured vs advertised rate, last title, event count
        │
        ▼
  application/icecastController.js
    startIcecastSession()  fetch + reader + parser → store, 1 Hz live stats
    stopIcecastSession()   abort + cleanup
        │
        ▼
  SRT Monitor → Icecast panel: codec, advertised/measured rate, in-band metadata
  interval, station name, metadata timeline (track changes with timestamps)
```

Route into the store mirrors the MoQ controller so the monitor, exports and rule pipeline
work unchanged.

## 4. Honest-null policy (unchanged)

Loudness (EBU R128) is deliberately **not** part of this first pass: it would need an
AudioWorklet PCM tap on a `MediaElementSource`, which is a second, separable feature. The
plan lists it as the follow-up. Nothing here reports a number it did not measure.

## 5. Verification

- 13 heux contract tests (header parsing, metadata blocks incl. doubled quotes, framing
  across arbitrary chunk boundaries, L=0 windows, metaint-0, summary math)
- Live, in a real browser: Classic FM returns AAC/48 kbps with `icy-metaint: 8000` and 20
  real metadata events over 13 s (titles arriving ~1.3 s apart, i.e. 8000 bytes at
  ~48 kbps — the framing math is confirmed by the station, not by a test double); Radio
  Paradise MP3 returns no metadata and the honest-null path is exercised
- SomaFM returns 403 to non-browser clients; reported verbatim
