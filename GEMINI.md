# Gemini Context: Stream Analyzer

This document provides context for the "Stream Analyzer" project, a browser-based tool for analyzing and comparing DASH & HLS streaming media manifests and segments.

## Project Overview

Stream Analyzer is a powerful, in-browser tool designed for developers and engineers working with streaming media. It offers deep inspection capabilities, compliance checking, and side-by-side comparisons to aid in debugging and validating streaming content. The project is built using a modern web stack, including vanilla JavaScript (with JSDoc for type safety), LitHTML for templating, TailwindCSS for styling, and esbuild for bundling. It leverages Web Workers for performance-intensive tasks like parsing and analysis. The development environment is managed by Nix and direnv for reproducibility.

### Key Technologies

- **Frontend:** JavaScript (ESM), LitHTML, TailwindCSS
- **Build:** esbuild, npm scripts
- **State Management:** Zustand
- **Development Environment:** Nix, direnv
- **Linting & Formatting:** ESLint, Prettier
- **Type Checking:** TypeScript (via JSDoc)

### Architecture

The application follows a modular architecture, separating concerns into distinct layers:

- **Application:** Contains the main application logic, use cases, and service orchestration.
- **Domain:** Defines the core business logic and data structures for streaming media analysis.
- **Infrastructure:** Handles external concerns like parsing, persistence (local storage), and communication with Web Workers.
- **UI:** Manages rendering, user interaction, and UI state.
- **State:** Centralized state management using Zustand.

## Building and Running

The project uses `npm` for script management and `esbuild` for bundling.

- **Development:**

    ```bash
    npm run dev
    ```

    This command starts a local development server with live reloading.

- **Production Build:**

    ```bash
    npm run build
    ```

    This command builds the static assets for production into the `dist/` directory.

- **Serve Production Build:**

    ```bash
    npm run start
    ```

    This command serves the production-ready `dist/` folder.

- **Linting:**

    ```bash
    npm run lint
    ```

- **Formatting:**

    ```bash
    npm run format
    ```

- **Type Checking:**
    ```bash
    npm run typecheck
    ```

## Development Conventions

- **Modularity:** The codebase is organized into modules with clear responsibilities.
- **Dependency Injection:** The application uses a simple dependency injection container to manage service dependencies.
- **Asynchronous Operations:** The application makes extensive use of asynchronous operations, particularly for file processing and communication with Web Workers.
- **State Management:** UI and application state are managed using the Zustand library.
- **Web Workers:** Computationally expensive tasks are offloaded to Web Workers to keep the main thread responsive.
- **Nix Environment:** The `flake.nix` file defines a reproducible development environment with all necessary dependencies.
