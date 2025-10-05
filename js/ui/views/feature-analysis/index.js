import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { tooltipTriggerClasses } from '../../../shared/constants.js';
import { createFeatureViewModel } from '../../../engines/feature-analysis/analyzer.js';

const featureCardTemplate = (feature) => {
    const badge = feature.used
        ? html`<span
              class="text-xs font-semibold px-2 py-1 bg-green-800 text-green-200 rounded-full"
              >Used</span
          >`
        : html`<span
              class="text-xs font-semibold px-2 py-1 bg-gray-600 text-gray-300 rounded-full"
              >Not Used</span
          >`;

    return html`
        <div
            class="grid grid-cols-[100px_1fr] items-center bg-gray-800 p-3 rounded-lg border border-gray-700"
        >
            <div class="text-center">${badge}</div>
            <div>
                <p
                    class="font-medium ${tooltipTriggerClasses}"
                    data-tooltip="${feature.desc}"
                    data-iso="${feature.isoRef}"
                >
                    ${feature.name}
                </p>
                <p class="text-xs text-gray-400 italic mt-1 font-mono">
                    ${unsafeHTML(feature.details)}
                </p>
            </div>
        </div>
    `;
};

const categoryTemplate = (category, categoryFeatures) => html`
    <div class="mt-8">
        <h4 class="text-lg font-semibold text-gray-300 mb-3">${category}</h4>
        <div class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(400px,1fr))]">
            ${categoryFeatures.map((feature) => featureCardTemplate(feature))}
        </div>
    </div>
`;

export function getFeaturesAnalysisTemplate(stream) {
    if (!stream) return html`<p class="warn">No stream loaded to display.</p>`;

    const { results, manifestCount } = stream.featureAnalysis;
    const viewModel = createFeatureViewModel(results, stream.protocol);

    const groupedFeatures = viewModel.reduce((acc, feature) => {
        if (!acc[feature.category]) {
            acc[feature.category] = [];
        }
        acc[feature.category].push(feature);
        return acc;
    }, {});

    const getStatusIndicator = () => {
        if (stream.manifest?.type !== 'dynamic') {
            return html`
                <div
                    class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-4 mb-6"
                >
                    <div
                        class="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-6 w-6 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                    <div>
                        <p class="font-semibold text-gray-200">
                            Static Manifest (VOD)
                        </p>
                        <p class="text-sm text-gray-400">
                            Feature analysis is based on the single, initial
                            manifest load.
                        </p>
                    </div>
                </div>
            `;
        }

        const isPolling = stream.isPolling;
        const statusText = isPolling ? 'Polling Active' : 'Polling Paused';
        const statusColor = isPolling ? 'text-cyan-400' : 'text-yellow-400';
        const iconColor = isPolling ? 'bg-cyan-500' : 'bg-yellow-500';

        return html`
            <div
                class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-4 mb-6"
            >
                <div
                    class="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 relative"
                >
                    ${isPolling
                        ? html`<div
                              class="absolute inset-0 rounded-full ${iconColor} opacity-75 animate-ping"
                          ></div>`
                        : ''}
                    <div
                        class="absolute inset-1 rounded-full ${iconColor} opacity-50"
                    ></div>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6 text-white relative"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h5M20 20v-5h-5"
                        />
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 9a9 9 0 0114.65-5.65M20 15a9 9 0 01-14.65 5.65"
                        />
                    </svg>
                </div>
                <div class="flex-grow">
                    <p class="font-semibold text-gray-200">
                        Live Analysis:
                        <span class="font-bold ${statusColor}"
                            >${statusText}</span
                        >
                    </p>
                    <p class="text-sm text-gray-400">
                        New features will be detected automatically as the
                        manifest updates.
                    </p>
                </div>
                <div class="text-right flex-shrink-0">
                    <div
                        class="text-xs text-gray-400 uppercase font-semibold tracking-wider"
                    >
                        Versions Analyzed
                    </div>
                    <div class="text-3xl font-bold text-white">
                        ${manifestCount}
                    </div>
                </div>
            </div>
        `;
    };

    return html`
        <h3 class="text-xl font-bold mb-2">Feature Usage Analysis</h3>
        ${getStatusIndicator()}
        <p class="text-sm text-gray-500 mb-4">
            A breakdown of key features detected across all analyzed manifest
            versions.
        </p>
        ${Object.entries(groupedFeatures).map(([category, features]) =>
            categoryTemplate(category, features)
        )}
    `;
}