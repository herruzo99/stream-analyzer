# Stream Analyzer Project Context

## Project Overview

Stream Analyzer is an advanced, browser-based tool for analyzing and comparing DASH & HLS streaming media manifests and segments. This tool provides deep inspection capabilities, compliance checking, and side-by-side comparisons to aid in debugging and validation of streaming content.

### Key Features

- Multi-Stream Comparison: Analyze and compare multiple DASH and HLS streams simultaneously
- Interactive Manifest View: Syntax-highlighted, interactive manifest viewer with tooltips
- Interactive Segment Inspector: Hex/ASCII viewer for segments with structured tree views
- Compliance Checking: Validate manifests against industry standards
- Timeline Visualization: Visual representation of segments, events, and ad breaks
- Feature Analysis: Summary of streaming features being used
- Live Stream Monitoring: Automatically fetch and diff manifest updates for live streams

### Architecture

The application follows a layered architecture with clear separation of concerns:

- **Application Layer**: Contains controllers, services, and use cases
- **Infrastructure Layer**: Handles workers, segments, decryption, and network operations
- **UI Layer**: User interface components and shell
- **State Layer**: Global application state management
- **Features Layer**: Feature-specific modules
- **Data Layer**: Data processing and handling utilities

## Technology Stack

### Frontend Technologies

- **HTML/CSS/JavaScript**: Core web technologies
- **Lit-HTML**: Template rendering library
- **Tailwind CSS v4**: Styling framework
- **ES2022**: Modern JavaScript features
- **TypeScript**: Type checking via JSDoc annotations

### Build Tools

- **esbuild**: Fast JavaScript bundler
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing
- **Prettier**: Code formatting

### External Libraries

- **Shaka Player**: Media player library
- **Fast-XML-Parser**: XML parsing
- **ECharts**: Data visualization
- **Zustand**: State management
- **Diff**: For comparing manifests

### Development Environment

- **Nix**: Reproducible build environment
- **direnv**: Environment management
- **Vitest**: Testing framework (MSW for mocking)
- **ESLint**: Code linting
- **Playwright**: E2E testing (browser support via Nix)

## Project Structure

```
streamAnalyzer/
├── css/                # Tailwind CSS and custom styles
├── public/             # Static assets
├── src/                # Source code
│   ├── application/    # Core application logic
│   ├── data/           # Data processing
│   ├── features/       # Feature modules
│   ├── infrastructure/ # Low-level services
│   ├── shared/         # Shared utilities
│   ├── state/          # Global state management
│   └── ui/             # User interface components
├── dist/               # Build output
├── standard/           # Streaming standards documentation
└── types/              # TypeScript definitions
```

## Development Setup

### Prerequisites

1. Install Nix: Follow instructions at https://nixos.org/download.html
2. Enable flakes and nix-command experimental features
3. Install direnv: Follow instructions at https://direnv.net/docs/installation.html
4. Hook direnv into your shell

### Initial Setup

1. Clone the repository
2. Run `direnv allow` to load the development environment
3. Install Node.js dependencies with `npm install`

### Available Scripts

- `npm run dev`: Starts a local development server with live reloading on http://localhost:8000
- `npm run build`: Creates a production build in the `dist/` directory
- `npm run start`: Serves the production-ready `dist/` folder locally
- `npm run lint`: Lints the JavaScript codebase
- `npm run format`: Formats code using Prettier
- `npm run typecheck`: Runs TypeScript checker on JSDoc-annotated code

## Build Process

The build system uses esbuild to bundle JavaScript and Tailwind CSS for styling. The build process:

1. Compiles application JavaScript to `dist/assets/app.js`
2. Compiles worker JavaScript to `dist/assets/worker.js`
3. Generates an optimized CSS file
4. Creates a production-ready `dist/` folder with a generated index.html
5. Implements content hashing for cache-busting in production builds

## Security Features

- Content Security Policy (CSP) implemented with nonces
- Secure handling of external script loading via consent manager
- Sandboxed execution environment via Nix

## Deployment

The repository is configured for continuous deployment to GitHub Pages. Any push to the `main` branch triggers a GitHub Action that builds and deploys the application automatically.

## Development Conventions

- Modular, component-based architecture
- Event-driven communication via EventBus
- Dependency injection via container pattern
- TypeScript type checking through JSDoc annotations
- ESLint for code quality and consistency
- Prettier for consistent formatting
- Comprehensive error handling and logging
- Accessibility compliance through semantic HTML
