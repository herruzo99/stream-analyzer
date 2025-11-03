import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { createComparisonViewModel } from '@/features/comparison/ui/view-model';
import { comparisonSectionTemplate } from './components/comparison-section.js';
import * as icons from '@/ui/icons';

let container = null;
let analysisUnsubscribe = null;
let uiUnsubscribe = null;

const streamHeaderCard = (stream) => {
    const icon =
        stream.protocol === 'dash' ? icons.newAnalysis : icons.fileText;
    return html`
        <div class="bg-slate-800 rounded-lg p-3 border border-slate-700 h-full">
            <div class="flex items-center gap-2">
                <span class="text-blue-400">${icon}</span>
                <h4
                    class="font-bold text-slate-200 truncate"
                    title=${stream.name}
                >
                    ${stream.name}
                </h4>
            </div>
            <p
                class="text-xs text-slate-400 mt-1 font-mono truncate"
                title=${stream.originalUrl}
            >
                ${stream.originalUrl}
            </p>
        </div>
    `;
};

function renderComparison() {
    if (!container) return;
    const { streams } = useAnalysisStore.getState();
    const { comparisonHideSameRows } = useUiStore.getState();

    if (streams.length < 2) {
        render(
            html`<div class="text-center py-12 text-slate-400">
                <p>At least two streams are required for comparison.</p>
            </div>`,
            container
        );
        return;
    }

    const groupedComparisonPoints = createComparisonViewModel(streams);
    const headerGridStyle = `grid-template-columns: 250px repeat(${streams.length}, minmax(200px, 1fr));`;

    const template = html`
        <div class="flex flex-col h-full">
            <div class="flex justify-between items-center mb-4 shrink-0">
                <h3 class="text-xl font-bold">Manifest Comparison</h3>
                <div class="flex items-center gap-2">
                    <label for="hide-same-toggle" class="text-sm text-slate-400"
                        >Hide identical rows</label
                    >
                    <button
                        @click=${() => uiActions.toggleComparisonHideSameRows()}
                        role="switch"
                        aria-checked="${comparisonHideSameRows}"
                        id="hide-same-toggle"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${comparisonHideSameRows
                            ? 'bg-blue-600'
                            : 'bg-slate-600'}"
                    >
                        <span
                            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${comparisonHideSameRows
                                ? 'translate-x-6'
                                : 'translate-x-1'}"
                        ></span>
                    </button>
                </div>
            </div>

            <div class="overflow-auto grow">
                <div class="min-w-[1024px]">
                    <div
                        class="sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10 py-2 grid gap-2"
                        style="${headerGridStyle}"
                    >
                        <div
                            class="font-semibold text-slate-300 p-3 flex items-center"
                        >
                            Property
                        </div>
                        ${streams.map((stream) => streamHeaderCard(stream))}
                    </div>

                    ${groupedComparisonPoints.map((group) =>
                        comparisonSectionTemplate(
                            group,
                            streams.length,
                            comparisonHideSameRows
                        )
                    )}
                </div>
            </div>
        </div>
    `;
    render(template, container);
}

export const comparisonView = {
    mount(containerElement) {
        container = containerElement;
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();

        analysisUnsubscribe = useAnalysisStore.subscribe(renderComparison);
        uiUnsubscribe = useUiStore.subscribe(renderComparison);

        renderComparison();
    },
    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();
        analysisUnsubscribe = null;
        uiUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
    },
};
