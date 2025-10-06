import { html } from 'lit-html';
import { createComparisonViewModel } from './view-model.js';
import { comparisonRowTemplate } from './row.js';

const sectionTemplate = (title, points, streams) => html`
    <h3 class="text-xl font-bold mt-6 mb-2">${title}</h3>
    <div class="border-b border-gray-700">
        ${points.map((point) => comparisonRowTemplate(point, streams.length))}
    </div>
`;

export function getComparisonTemplate(streams) {
    if (streams.length < 2) {
        return html``;
    }

    const groupedComparisonPoints = createComparisonViewModel(streams);

    return html`
        <div class="overflow-x-auto">
            <!-- Main Sticky Header -->
            <div
                class="grid bg-gray-900/50 sticky top-0 z-10 min-w-[800px]"
                style="grid-template-columns: 200px repeat(${streams.length}, minmax(200px, 1fr));"
            >
                <div
                    class="font-semibold text-gray-400 p-2 border-b border-r border-gray-700"
                >
                    Property
                </div>
                ${streams.map(
                    (stream) =>
                        html`<div
                            class="font-semibold text-gray-300 p-2 border-b border-r border-gray-700 truncate"
                            title="${stream.name}"
                        >
                            ${stream.name}
                        </div>`
                )}
            </div>

            <!-- Data Sections -->
            <div class="min-w-[800px]">
                ${groupedComparisonPoints.map((group) =>
                    sectionTemplate(group.title, group.points, streams)
                )}
            </div>
        </div>
    `;
}