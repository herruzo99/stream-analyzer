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