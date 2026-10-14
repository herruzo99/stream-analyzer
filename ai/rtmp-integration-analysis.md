# RTMP/RTMPS integration — analysis & design

Item 5 of `ai/protocol-implementation-plan.md`. Same constraints as SRT (static-only
deployment, one Go helper binary, contract-first), so this note only covers what is
*different*.

## 1. Verdict

RTMP is implementable in this repo today with no new infrastructure: browsers cannot
speak raw TCP (or the RTMP chunk stream), so the RTMP session lives in the existing
static helper binary as a new session type — exactly the SRT pattern — and the browser
side reuses the SRT Monitor, rules and export surfaces through the shared
`LinkTelemetry` contract.

## 2. Why the engine is hand-rolled (decision record)

Two pure-Go libraries exist (`yutopp/go-rtmp` client+server, `yutopp/go-amf0`). Both
are **Boost Software License 1.0**, not MIT — acceptable but not free of obligation,
and more importantly both *hide the wire*: go-rtmp's chunk header fields are
unexported, so per-chunk forensics are impossible without forking.

The analyzer's value is precisely the forensics: which chunk formats each peer uses,
chunk-size negotiation, acknowledgement windows, message-type mix, command timing,
timestamp behaviour, AMF0 field-level detail. A library that abstracts those away is
worse than useless here, and the RTMP wire is small and fully specified
(`standard/rtmp-v1-0-spec.pdf`, extracted to `.txt` — handshake 1536-byte bodies,
128-byte default chunk size, five control message types, 12-bit/32-bit chunk stream
IDs, format 0–3 headers with extended timestamps).

**Decision: hand-roll the wire layer (handshake, chunk stream, message dispatch, AMF0)
in `tools/srt-helper/internal/rtmp`. No new dependencies.**

## 3. What RTMP adds that DASH/HLS/SRT cannot show

| Diagnostic | Where it lives |
|---|---|
| Handshake bandwidth/latency estimate (C1/S1 time + time2 fields) | handshake |
| Chunk format mix (type 0/1/2/3 per chunk stream) — reveals encoder behaviour | chunk reader |
| Chunk-size negotiation (Set Chunk Size, default 128 B) | control messages |
| Acknowledgement window + Ack cadence (stream vs window counters) | control messages |
| Set Peer Bandwidth limit type (hard/soft/dynamic) | control messages |
| Command lifecycle + transaction IDs (connect/createStream/play/publish/_result/_error) | AMF0 layer |
| Server `onStatus` codes (NetStream.Play.Start / Failed / StreamNotFound) | AMF0 layer |
| FLV tag timeline: audio/video/script mix, frame types, codec IDs, AV packet timing | FLV demux |
| `onMetaData` inventory (dimensions, fps, codec strings, bitrates) | script tags |
| E-RTMP enhanced audio/video codec IDs (hvc1/hev1/av01/vp09, opus/flac) | tag headers |

## 4. Architecture

```
rtmp://host:1935/app/streamkey?query
        |
        v  browser (no TCP possible)
  routeExampleUrl -> SRT_SESSION_REQUESTED (transport 'rtmp')
        |
        v  helper control plane (bearer token, CORS, PNA) — unchanged
  internal/rtmp/ session
    |- url.go        rtmp:// contract: host/port/app/playpath/tcUrl/params
    |- handshake.go  C0C1C2 / S0S1S2 (+ time/time2 latency estimate)
    |- chunk.go      reader+writer, fmt 0-3, extended timestamps, chunk sizes
    |- amf0.go       encoder+decoder (0=number,1=boolean,2=string,3=object,
    |               5=null,6=undefined,7=reference,8=ECMA-array,10=strict-array,
    |               11=date,long strings)
    |- message.go    control messages + user control events
    |- client.go     connect/createStream/play lifecycle, command forensics
    |- record.go     FLV recording with disk budget (reuses segment/recorder infra)
        |
        v  telemetry -> LinkTelemetry (honest nulls where RTMP has no metric)
  SRT Monitor: transport selector "RTMP", session panel, FLV/codec inventory,
  alerts (RTMP rule family), CSV/JSONL export
```

### Honest-null policy (unchanged)
RTMP exposes no RTT/packet-loss channel at the protocol level (TCP hides it; the
handshake time/time2 fields give a one-shot estimate only). Those `LinkTelemetry`
fields stay `null` with a documented `*Reason`, and the derived sample carries
RTMP-native counters (bytes in/out, chunk count, message-type mix, ack window,
audio/video tag rate).

### Scope cut for phase 1 (analysis, not playback)
In-browser playback of RTMP would need an FLV→fMP4 remux in the helper (a codec-level
muxer). Out of scope for the first cut: the helper records the raw FLV to disk with
the existing budget, and the Monitor offers it as a download; the analysis views are
the product. Playback can be added later behind the same façade pattern.

## 5. Verification plan (real world, per the standard)

1. **Local, deterministic**: helper `rtmp listen` mode (same as SRT listener) +
   `ffmpeg -re -i <sample> -c copy -f flv rtmp://127.0.0.1:1935/live/key`, then pull
   it back through the helper's client path — handshake, chunk formats, chunk-size
   negotiation, command lifecycle, FLV tags, recording, telemetry, Prometheus.
2. **Public**: attempt the classical public test publishing points and at least one
   live RTMP endpoint; ship a verified example entry only if it answers.
3. Cross-check the FLV recording with `ffprobe`.

## 6. Risks

- **Chunk reassembly bugs**: mitigated by contract tests with captured byte fixtures
  and by the local ffmpeg round-trip.
- **AMF0 edge cases** (ECMA arrays, references, dates): only what real servers send is
  required; unknown types must be skipped losslessly and reported, per the spec's
  extensibility rule.
- **Long-lived sessions**: idle timeouts + recording budget, same as SRT.
