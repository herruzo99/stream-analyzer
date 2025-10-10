import { html } from 'lit-html';

export const aboutModalTemplate = () => html`
    <div class="space-y-4 text-gray-300">
        <p>
            The
            <strong class="text-white">Stream Analyzer</strong> is an advanced,
            browser-based tool for analyzing and comparing DASH & HLS streaming
            media manifests and segments. It was designed to provide deep
            inspection capabilities, compliance checking, and side-by-side
            comparisons to aid in debugging and validation of streaming content.
        </p>
        <p>
            This project was architected and built with a focus on modern web
            principles, including a clean, decoupled architecture, a fully
            containerized and reproducible development environment via Nix, and
            a CI/CD pipeline for automated deployments.
        </p>
        <h4 class="text-lg font-bold text-white pt-2">Core Principles</h4>
        <ul class="list-disc pl-5 space-y-2">
            <li>
                <strong class="text-gray-200">Performance:</strong>
                All heavy parsing and analysis is offloaded to a Web Worker to
                ensure the UI remains fast and responsive at all times.
            </li>
            <li>
                <strong class="text-gray-200">Maintainability:</strong>
                Code is organized according to Clean Architecture principles,
                separating domain logic from application and UI concerns.
            </li>
            <li>
                <strong class="text-gray-200">Reproducibility:</strong>
                The entire development and build environment is managed by Nix
                Flakes, guaranteeing consistency across all machines.
            </li>
        </ul>
        <p class="pt-4 text-sm text-gray-400">
            &copy; 2025 The Principal Systems Architect
        </p>
    </div>
`;
