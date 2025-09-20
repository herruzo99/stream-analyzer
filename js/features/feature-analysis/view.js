import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { tooltipTriggerClasses } from '../../shared/constants.js';
import { generateFeatureAnalysis } from './logic.js';

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
                <p
                    class="text-xs text-gray-400 italic mt-1 font-mono"
                >
                    ${unsafeHTML(feature.details)}
                </p>
            </div>
        </div>
    `;
};

const categoryTemplate = (category, categoryFeatures) => html`
    <div class="mt-8">
        <h4 class="text-lg font-semibold text-gray-300 mb-3">${category}</h4>
        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            ${categoryFeatures.map((feature) =>
                featureCardTemplate(feature)
            )}
        </div>
    </div>
`;

export function getFeaturesAnalysisTemplate(manifest, protocol) {
    if (!manifest) return html`<p class="warn">No manifest loaded to display.</p>`;

    const viewModel = generateFeatureAnalysis(manifest, protocol);

    const groupedFeatures = viewModel.reduce((acc, feature) => {
        if (!acc[feature.category]) {
            acc[feature.category] = [];
        }
        acc[feature.category].push(feature);
        return acc;
    }, {});

    return html`
        <h3 class="text-xl font-bold mb-2">Feature Usage Analysis</h3>
        <p class="text-sm text-gray-400 mb-4">
            A breakdown of key features detected in the manifest and their
            implementation details.
        </p>
        ${Object.entries(groupedFeatures).map(([category, features]) =>
            categoryTemplate(category, features)
        )}
    `;
}