# Stream Analyzer - Project Analysis

## 1. Project Overview

**Stream Analyzer** is a sophisticated, browser-based tool designed for inspecting, validating, and comparing DASH and HLS streaming media. It allows developers and streaming engineers to visualize manifest structures, inspect segments (ISOBMFF/TS), and verify compliance with industry standards.

## 2. Technology Stack

- **Language**: JavaScript (ES Modules) with JSDoc for type checking (`npm run typecheck`). TypeScript definitions exist in `types.ts` but the codebase is primarily JS.
- **Frontend Framework**: **Lit** (lightweight web components).
- **Styling**: **Tailwind CSS** (utility-first).
- **State Management**: **Zustand** (vanilla usage, decoupled from UI framework).
- **Build System**: **Esbuild** (fast bundling).
- **Environment**: **Nix** & **direnv** for reproducible dev environments.
- **Testing/Quality**: ESLint, Prettier.

## 3. Architecture

The project follows a **Feature-Sliced** or **Clean Architecture** inspired structure, separating concerns into distinct layers:

### Directory Structure (`src/`)

- **`application/`**: Core application logic.
    - `app.js`: Main entry point, orchestrates startup.
    - `event-bus.js`: Central Pub/Sub mechanism for decoupling components.
    - `container.js`: Dependency injection container.
- **`features/`**: Vertical slices of functionality.
    - `streamInput/`: Handling user input for stream URLs.
    - `compliance/`: Logic for validating manifests against standards.
    - `playerSimulation/`: Simulating playback behavior.
    - `interactiveManifest/` & `interactiveSegment/`: Visualizers for deep inspection.
- **`infrastructure/`**: Low-level technical services.
    - `parsing/`: Parsers for DASH (XML), HLS (m3u8), ISOBMFF, and MPEG-TS.
    - `worker/`: Web Worker implementation for offloading heavy parsing tasks.
    - `http/`: Network layer.
- **`state/`**: Global state management.
    - `analysisStore.js`: The "brain" of the app, holding the state of loaded streams.
    - `uiStore.js`: UI-specific state (active tabs, view modes).
- **`ui/`**: Shared UI components and the application shell.

### Key Architectural Patterns

1.  **Event-Driven**: The application relies heavily on an `EventBus` (`src/application/event-bus.js`) to communicate between looseley coupled components (e.g., `analysisStore` dispatching `ANALYSIS_COMPLETE` which `Application` listens to).
2.  **Store-Centric Logic**: Business logic is often encapsulated within Zustand stores (`analysisStore.js`) or dedicated services, rather than in UI components.
3.  **Web Workers**: Heavy parsing logic (likely for segments and large manifests) is offloaded to a worker thread to keep the UI responsive.
4.  **Dependency Injection**: A `container` is used to wire up services and inject them into the application.

## 4. Data Flow

1.  **Input**: User provides a stream URL via `streamInput` feature.
2.  **Processing**:
    - `analysisActions.startAnalysis()` triggers the workflow.
    - Infrastructure parsers fetch and parse the manifest.
    - Data is normalized into a `Stream` object.
3.  **State Update**: The `Stream` object is stored in `analysisStore`.
4.  **UI Render**: Lit components subscribe to the store (or listen to events) and update the view (Summary, Comparison, Compliance, etc.).

## 5. Key Features

- **Multi-Stream Comparison**: Side-by-side view of different streams.
- **Deep Inspection**:
    - **Manifest**: Syntax highlighting and interactive tree.
    - **Segments**: Hex views, box/packet trees.
- **Live Monitoring**: Polling for dynamic manifests and tracking updates over time.
- **Compliance**: Automated checks for common errors and spec violations.

## 6. Development Workflow

- **Setup**: `direnv allow` sets up Node and dependencies via Nix.
- **Run**: `npm run dev` starts the local server with hot reloading.
- **Build**: `npm run build` produces a production-ready `dist/` folder.
