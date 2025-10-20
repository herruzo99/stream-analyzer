import { html, render } from 'lit-html';
import { createComparisonViewModel } from '@/features/comparison/ui/view-model';
import { comparisonRowTemplate } from '@/features/comparison/ui/row';
import { useAnalysisStore } from '@/state/analysisStore';

let container = null;
let analysisUnsubscribe = null;

const sectionTemplate = (title, points, streams) => html`
    <h3 class="text-xl font-bold mt-6 mb-2">${title}</h3>
    <div class="border-b border-gray-700">
        ${points.map((point) => comparisonRowTemplate(point, streams.length))}
    </div>
`;

function renderComparison() {
    if (!container) return;
    const { streams } = useAnalysisStore.getState();

    if (streams.length < 2) {
        render(
            html`<div class="text-center py-12 text-gray-400">
                <p>At least two streams are required for comparison.</p>
            </div>`,
            container
        );
        return;
    }

    const groupedComparisonPoints = createComparisonViewModel(streams);

    const template = html`
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
    render(template, container);
}

export const comparisonView = {
    mount(containerElement) {
        container = containerElement;
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = useAnalysisStore.subscribe(renderComparison);
        renderComparison(); // Render immediately with current state
    },
    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
    },
};
