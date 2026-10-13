#!/usr/bin/env bash
# Build the SRT helper for every supported platform and generate the
# published manifest (helper/manifest.json) consumed by the website's
# upgrade checks. Pure Go: cross-compilation needs no toolchain.
#
# Usage:
#   scripts/build-helper.sh <repo-root> <version> [out-dir]
#
# Outputs:
#   <out-dir>/bin/<os>-<arch>/stream-analyzer-helper[.exe]
#   <out-dir>/manifest.json   (schema 1; urls are site-relative)
set -euo pipefail

ROOT="${1:?repo root required}"
VERSION="${2:?version required}"
OUT="${3:-$ROOT/tools/srt-helper}"
HELPER_DIR="$ROOT/tools/srt-helper"

PLATFORMS=(
  "linux amd64"
  "linux arm64"
  "linux riscv64"
  "darwin amd64"
  "darwin arm64"
  "windows amd64"
  "windows arm64"
)

cd "$HELPER_DIR"
export CGO_ENABLED=0
export GOFLAGS="${GOFLAGS:-} -trimpath"
COMMIT="$(git -C "$ROOT" rev-parse --short=8 HEAD 2>/dev/null || echo dev)"
BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
LDFLAGS="-s -w -X main.version=${VERSION} -X main.commit=${COMMIT} -X main.buildDate=${BUILD_DATE}"

rm -rf "$OUT/bin"
mkdir -p "$OUT/bin"

for platform in "${PLATFORMS[@]}"; do
  set -- $platform
  os="$1"; arch="$2"
  bin="stream-analyzer-helper"
  [ "$os" = "windows" ] && bin="stream-analyzer-helper.exe"
  dest="$OUT/bin/${os}-${arch}"
  mkdir -p "$dest"
  echo "building ${os}/${arch}"
  GOOS="$os" GOARCH="$arch" go build -ldflags "$LDFLAGS" -o "$dest/$bin" .
done

echo "generating manifest.json"
python3 - "$OUT" "$VERSION" "$COMMIT" "$BUILD_DATE" <<'PY'
import hashlib, json, os, sys

out, version, commit, build_date = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
artifacts = {}
bin_root = os.path.join(out, "bin")
for entry in sorted(os.listdir(bin_root)):
    for fname in sorted(os.listdir(os.path.join(bin_root, entry))):
        data = open(os.path.join(bin_root, entry, fname), "rb").read()
        artifacts[entry] = {
            "url": f"/helper/{entry}/{fname}",
            "sha256": hashlib.sha256(data).hexdigest(),
            "bytes": len(data),
        }
manifest = {
    "schema": 1,
    "channel": "stable",
    "version": version,
    "helperProtocol": 1,
    "minimumHelper": "1.0.0",
    "minimumApp": "1.0.0",
    "publishedAt": build_date,
    "commit": commit,
    "artifacts": artifacts,
}
with open(os.path.join(out, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2)
    f.write("\n")
print(f"manifest: {len(artifacts)} artifacts")
PY
