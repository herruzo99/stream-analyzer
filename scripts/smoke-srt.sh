#!/usr/bin/env bash
# Real end-to-end smoke test: runs the compiled helper, publishes a live
# MPEG-TS stream over SRT with ffmpeg (libsrt peer, encrypted), then verifies
# the synthetic HLS façade with the repo's own HLS and TS tooling.
#
# Requires: ffmpeg with SRT support, node. Usage: scripts/smoke-srt.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HELPER="$ROOT/tools/srt-helper/bin/linux-amd64/stream-analyzer-helper"
[ "$(uname -m)" = "aarch64" ] && HELPER="$ROOT/tools/srt-helper/bin/linux-arm64/stream-analyzer-helper"
TOKEN="smoke-token-0123456789abcdef"
PORT=7231
SRT_PORT=9100
WORK="$(mktemp -d)"
cleanup() {
  [ -n "${FFMPEG_PID:-}" ] && kill "$FFMPEG_PID" 2>/dev/null || true
  [ -n "${HELPER_PID:-}" ] && kill "$HELPER_PID" 2>/dev/null || true
}
trap cleanup EXIT

command -v ffmpeg >/dev/null || { echo "SKIP: ffmpeg not installed"; exit 0; }
[ -x "$HELPER" ] || { echo "FAIL: helper binary not built; run scripts/build-helper.sh"; exit 1; }

echo "== starting helper =="
"$HELPER" -addr "127.0.0.1:$PORT" -token "$TOKEN" -recordings "$WORK/recordings" \
  >"$WORK/helper.log" 2>&1 &
HELPER_PID=$!
sleep 1

echo "== health/version =="
HEALTH="$(curl -sf -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:$PORT/health")"
echo "$HEALTH" | grep -q '"ok": *true' || { echo "FAIL: health: $HEALTH"; exit 1; }
curl -sf -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:$PORT/version" > "$WORK/version.json"
grep -q '"version"' "$WORK/version.json" || { echo "FAIL: version"; exit 1; }
[ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/health")" = "401" ] \
  || { echo "FAIL: unauthenticated request should be 401"; exit 1; }
echo "auth enforced, version payload present"

echo "== push mode: ffmpeg publishes to helper listener =="
SESSION="$(curl -sf -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"url\":\"srt://:$SRT_PORT?mode=listener&passphrase=0123456789\",\"record\":true}" \
  "http://127.0.0.1:$PORT/sessions")"
ID="$(node -e "console.log(JSON.parse(process.argv[1]).id)" "$SESSION")"
echo "session $ID"

ffmpeg -hide_banner -loglevel error -re -f lavfi -i "testsrc=size=160x90:rate=15" \
  -c:v libx264 -preset ultrafast -tune stillimage -g 30 -pix_fmt yuv420p \
  -f mpegts -transtype live "srt://127.0.0.1:$SRT_PORT?mode=caller&streamid=smoke/live&passphrase=0123456789" \
  >"$WORK/ffmpeg.log" 2>&1 &
FFMPEG_PID=$!

sleep 6
DETAIL="$(curl -sf -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:$PORT/sessions/$ID")"
echo "$DETAIL" | grep -q '"status": *"connected"' || { echo "FAIL: not connected: $DETAIL"; cat "$WORK/ffmpeg.log"; exit 1; }
echo "$DETAIL" | grep -q '"streamId": *"smoke/live"' || { echo "FAIL: streamid missing"; exit 1; }
echo "$DETAIL" | grep -q '"encrypted": *true' || { echo "FAIL: not marked encrypted"; exit 1; }
echo "connected, streamid negotiated, encrypted"

echo "== façade playlist + chunk parsed by repo tooling =="
curl -sf -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:$PORT/sessions/$ID/playlist.m3u8" > "$WORK/live.m3u8"
head -6 "$WORK/live.m3u8"
grep -q "#EXT-X-MEDIA-SEQUENCE:" "$WORK/live.m3u8" || { echo "FAIL: no media sequence"; exit 1; }
SEG_URLS="$(grep -c "chunks/" "$WORK/live.m3u8")"
echo "playlist references $SEG_URLS chunks"
[ "$SEG_URLS" -ge 1 ] || { echo "FAIL: empty playlist"; exit 1; }

CHUNK="$(grep -oE 'chunks/[0-9]+\.ts' "$WORK/live.m3u8" | tail -1 | sed 's|chunks/||;s|\.ts||')"
curl -sf -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:$PORT/sessions/$ID/chunks/$CHUNK.ts" > "$WORK/chunk.ts"
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const b = readFileSync('$WORK/chunk.ts');
if (b.length < 188 || b[0] !== 0x47) { console.error('FAIL: chunk not TS-aligned'); process.exit(1); }
let packets = 0, syncErr = 0;
for (let i = 0; i + 188 <= b.length; i += 188) {
  if (b[i] !== 0x47) { syncErr++; continue; }
  packets++;
}
console.log('chunk', b.length, 'bytes ->', packets, 'TS packets, sync errors:', syncErr);
if (packets < 100 || syncErr > 0) { console.error('FAIL: TS integrity'); process.exit(1); }
"
echo "façade chunk is real MPEG-TS"

echo "== stop session, verify recording replay =="
curl -sf -X DELETE -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:$PORT/sessions/$ID" > /dev/null
wait $FFMPEG_PID 2>/dev/null || true
curl -sf -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:$PORT/recordings" > "$WORK/recordings.json"
REC="$(node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8')).recordings; console.log(r[0]?.id ?? '')" < "$WORK/recordings.json")"
[ -n "$REC" ] || { echo "FAIL: no recording persisted"; exit 1; }
curl -sf -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:$PORT/recordings/$REC/playlist.m3u8" > "$WORK/vod.m3u8"
grep -q "#EXT-X-ENDLIST" "$WORK/vod.m3u8" || { echo "FAIL: recording playlist has no ENDLIST"; exit 1; }
echo "recording $REC replays as VOD"

echo "SMOKE TEST PASSED"
