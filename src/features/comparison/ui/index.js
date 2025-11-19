import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { createComparisonViewModel } from '@/features/comparison/ui/view-model';
import { comparisonSectionTemplate } from './components/comparison-section.js';
import * as icons from '@/ui/icons';
import './components/abr-ladder-chart.js';

let container = null;
let analysisUnsubscribe = null;
let uiUnsubscribe = null;

const streamHeaderCard = (stream) => {
    const icon =
        stream.protocol === 'dash' ? icons.newAnalysis : icons.fileText;
    const type = stream.manifest?.type === 'dynamic' ? 'LIVE' : 'VOD';
    const typeColor =
        stream.manifest?.type === 'dynamic'
            ? 'bg-red-800 text-red-200'
            : 'bg-green-800 text-green-200';

    return html`
        <div class="bg-slate-900 rounded-lg p-3 border border-slate-700 h-full">
            <div class="flex items-center gap-2">
                <span class="text-blue-400 shrink-0">${icon}</span>
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
            <div class="flex items-center gap-2 mt-2">
                <span
                    class="text-xs font-semibold px-2 py-0.5 rounded-full ${typeColor}"
                    >${type}</span
                >
            </div>
        </div>
    `;
};

// ARCHITECTURAL REFACTOR: Create a shared <colgroup> for both tables
const colgroupTemplate = (streams) => html`
    <colgroup>
        <col style="width: 300px;" />
        ${streams.map(
            () =>
                html`<col
                    style="width: 20%; min-width: 250px; max-width: 400px;"
                />`
        )}
    </colgroup>
`;

function renderComparison() {
    if (!container) return;
    const { streams } = useAnalysisStore.getState();
    const { comparisonHideSameRows, comparisonHideUnusedFeatures } =
        useUiStore.getState();

    if (streams.length < 2) {
        render(
            html`<div class="text-center py-12 text-slate-400">
                <p>At least two streams are required for comparison.</p>
            </div>`,
            container
        );
        return;
    }

    const { abrData, sections } = createComparisonViewModel(streams);

    const template = html`
        <div class="flex flex-col h-full">
            <!-- Main Header -->
            <div class="flex justify-between items-center mb-4 shrink-0">
                <h3 class="text-xl font-bold">Manifest Comparison</h3>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                        <label
                            for="hide-unused-toggle"
                            class="text-sm text-slate-400"
                            >Hide unused features</label
                        >
                        <button
                            @click=${() =>
                                uiActions.toggleComparisonHideUnusedFeatures()}
                            role="switch"
                            aria-checked="${comparisonHideUnusedFeatures}"
                            id="hide-unused-toggle"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${comparisonHideUnusedFeatures
                                ? 'bg-blue-600'
                                : 'bg-slate-600'}"
                        >
                            <span
                                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${comparisonHideUnusedFeatures
                                    ? 'translate-x-6'
                                    : 'translate-x-1'}"
                            ></span>
                        </button>
                    </div>
                    <div class="flex items-center gap-2">
                        <label
                            for="hide-same-toggle"
                            class="text-sm text-slate-400"
                            >Hide identical properties</label
                        >
                        <button
                            @click=${() =>
                                uiActions.toggleComparisonHideSameRows()}
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
            </div>

            <!-- Sticky ABR Chart -->
            <div class="shrink-0 mb-4">
                <div
                    class="bg-slate-800 p-4 rounded-lg border border-slate-700 h-80"
                >
                    <abr-ladder-chart .data=${abrData}></abr-ladder-chart>
                </div>
            </div>

            <!-- Sticky Table Header -->
            <div class="shrink-0">
                <table
                    class="w-full"
                    style="table-layout: fixed; border-spacing: 0.5rem 0;"
                >
                    ${colgroupTemplate(streams)}
                    <thead>
                        <tr>
                            <th class="align-bottom p-0">
                                <div
                                    class="font-semibold text-slate-300 p-3 flex items-center"
                                >
                                    Property
                                </div>
                            </th>
                            ${streams.map(
                                (stream) =>
                                    html`<th class="p-0">
                                        ${streamHeaderCard(stream)}
                                    </th>`
                            )}
                        </tr>
                    </thead>
                </table>
            </div>

            <!-- Scrollable Table Body -->
            <div class="overflow-auto grow">
                <table
                    class="w-full border-separate"
                    style="table-layout: fixed; border-spacing: 0 0.5rem;"
                >
                    ${colgroupTemplate(streams)}
                    <tbody>
                        ${sections.map((group) =>
                            comparisonSectionTemplate(
                                group,
                                streams.length,
                                comparisonHideSameRows,
                                comparisonHideUnusedFeatures
                            )
                        )}
                    </tbody>
                </table>
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
