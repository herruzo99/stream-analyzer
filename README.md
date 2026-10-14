# Stream Analyzer

> **Work in Progress**: This project is under active development. Features may change, and documentation might be incomplete. Issues may exists.

An advanced, browser-based tool for analyzing and comparing DASH & HLS streaming media manifests and segments. This tool provides deep inspection capabilities, compliance checking, and side-by-side comparisons to aid in debugging and validation of streaming content.

> **Note**: This project was co-developed by a large language model (LLM) to accelerate design, implementation, and documentation. Issues may exists

![Screenshot of the analyzer UI](https://via.placeholder.com/800x450.png?text=UI+Screenshot+Here)

## Features

- **Multi-Stream Comparison**: Analyze and compare multiple DASH and HLS streams simultaneously.
- **Interactive Manifest View**: Syntax-highlighted, interactive manifest viewer with tooltips explaining every element and attribute.
- **Interactive Segment Inspector**: A hex/ASCII viewer for segments with a structured tree view of ISOBMFF boxes or TS packets.
- **Compliance Checking**: Validate manifests against industry standards (MPEG-DASH, HLS) and best practices.
- **Timeline Visualization**: Visual representation of segments, events, and ad breaks.
- **Feature Analysis**: A summary of which streaming features (e.g., low latency, multi-period, DRM) are being used.
- **Live Stream Monitoring**: Automatically fetch and diff manifest updates for live streams, highlighting changes and new compliance issues.
- **WebRTC (WHEP playback / WHIP publish)**: native browser transport with getStats-derived telemetry (RTT, loss, NACKs, quality limitation) in the same monitor, charts, rules and exports as SRT.
- **Low-Latency analysis**: part-level LL-HLS (EXT-X-PART / EXT-X-PART-INF / server-control) timeline and LL-DASH ServiceDescription latency view with LL conformance checks.

### SRT (Secure Reliable Transport) support

SRT runs over raw UDP, which browsers cannot speak. The analyzer therefore ships a tiny, fully static companion binary (`tools/srt-helper/`, pure Go) that owns the UDP sockets and serves your streams to the web app as a synthetic HLS façade:

- **Pull (caller)** — paste `srt://host:port?streamid=…&passphrase=…` into the smart input; the helper connects out and the session opens in the analyzer.
- **Push (listener)** — start a listener session from the **SRT Monitor** view; point any encoder at the shown port. Recordings spool to disk and replay later with full analysis.
- **Telemetry & analytics** — live RTT, loss, retransmission, drop, buffer and negotiated-latency charts; an SRT compliance rule family (encryption off, latency < 3×RTT, sub-minimum TSBPD, sustained loss, too-late drops); PCR-accurate synthetic segments; TS stream-contents analytics (PID inventory/bitrate, GOP spacing, continuity errors, A/V offset, EBU R128 loudness); threshold alerts with history; handshake forensics with rejection codes; link advisor (latency/inputbw/pbkeylen) and latency-budget breakdown; failover comparison; exports (CSV/JSONL/session summary/full report); a Prometheus `/metrics` scrape target for homelab monitoring; WebRTC (WHEP) and WebTransport sessions in the same monitor.

Run once, then forget it: download the binary for your platform from `/helper/<os>-<arch>/stream-analyzer-helper` on either deployment, run it (token printed at startup — paste it into the SRT Monitor once), and the site detects it automatically. The helper defaults to accepting the public site's origin (plus localhost dev origins) and answers Chrome's private-network preflight, so **no browser extension is needed on GitHub Pages** — the extension remains an optional fallback for users whose browser adds a local-network permission prompt. The helper's `/version` and the published `/helper/manifest.json` drive update prompts; `-origin` overrides the allow-list. See `ai/srt-integration-analysis.md` for the full architecture.

Local development: `bash scripts/build-helper.sh "$PWD" "$(node -p "require('./package.json').version")"` builds the 7-platform matrix + manifest; `bash scripts/smoke-srt.sh` runs a real end-to-end test with ffmpeg as the SRT peer.

**Testing against real public sources** (nothing to build locally — all verified live 2026-10-14, and shipped as one-click entries in the analyzer's example list):

- **SRT contribution beacons** (free IN/OUT-SRT UTC-timecode test signals, caller/pull, sessions capped ~30 min):
    ```
    srt://de.inoutsrt.com:6999?streamid=read:beacon&latency=200
    srt://usa.inoutsrt.com:6999?streamid=read:beacon&latency=200
    ```
    Paste either URL into the SRT Monitor (Connect) — the helper dials out and telemetry + the synthetic façade populate within seconds.
- **LL-HLS**: `https://llhls-demo.ovenmediaengine.com/app/stream/llhls.m3u8` — OvenMediaEngine live demo (12 `EXT-X-PART` per variant, `PART-TARGET=1.0`, `CAN-BLOCK-RELOAD=YES`, `PART-HOLD-BACK=3.0`). Analyze as usual, then open the **Low-Latency** view.
- **LL-DASH**: `https://cmafref.akamaized.net/cmaf/live-ull/2006350/akambr/out.mpd` — the Akamai CMAF ultra-low-latency reference (the stream the dash.js low-latency testplayer uses), with `ServiceDescription/Latency`.
- **WHIP/WHEP**: there is currently no stable _public_ WHIP/WHEP test endpoint worth curating (the community demos are down or certificate-broken, and cloud ones need accounts). The adapters are fully implemented and were live-verified against a local MediaMTX (`aiortc` publisher → WHIP, WHEP playback); to spin up your own: download the MediaMTX single binary and point the Monitor's transport selector at `http://host:8889/live/whip` or `/live/whep`.

Recordings are capped by `-max-record-mb` (default 2048 MiB; 0 = unlimited) and flagged `truncated` in `/recordings` when the budget is hit.

## Local Development

This project uses [Nix](https://nixos.org/) and [direnv](https://direnv.net/) to provide a reproducible development environment.

### Prerequisites

1.  **Install Nix**: Follow the instructions at [https://nixos.org/download.html](https://nixos.org/download.html).
2.  **Enable Flakes**: Enable the `flakes` and `nix-command` experimental features.
3.  **Install direnv**: Follow the instructions at [https://direnv.net/docs/installation.html](https://direnv.net/docs/installation.html).
4.  **Hook direnv into your shell**: Follow the instructions from the direnv installation.

### Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```
2.  Allow direnv to load the environment:

    ```bash
    direnv allow
    ```

    The first time you do this, Nix will download all the required dependencies. This may take a few minutes. Subsequent loads will be instantaneous.

3.  Install Node.js dependencies:
    ```bash
    npm install
    ```

### Available Scripts

- `npm run dev`: Starts a local development server with live reloading (e.g., on `http://localhost:8000`). This is the primary command for local development.
- `npm run build`: Builds the static assets for production into the `dist/` directory. This includes content hashing for cache-busting.
- `npm run start`: Serves the production-ready `dist/` folder. Use this to preview a production build locally.
- `npm run lint`: Lints the JavaScript codebase.
- `npm run format`: Formats the code using Prettier.
- `npm run typecheck`: Runs the TypeScript checker on the JSDoc-annotated code.

## Deployment

This repository is configured for continuous deployment to GitHub Pages. Any push to the `main` branch will trigger a GitHub Action that will automatically build, and deploy the application.
