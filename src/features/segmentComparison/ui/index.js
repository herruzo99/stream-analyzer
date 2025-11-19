import { html, render } from 'lit-html';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { createComparisonModel } from '../domain/comparisonEngine.js';
import { comparisonHeaderTemplate } from './components/comparisonHeader.js';
import { comparisonSectionTemplate } from './components/comparisonSection.js';
import { semanticDiffTemplate } from './components/semanticDiff.js';
import { connectedTabBar } from '@/ui/components/tabs';

let container = null;
let analysisUnsubscribe = null;
let uiUnsubscribe = null;

function renderSegmentComparison() {
    if (!container) return;

    const { streams, segmentsForCompare } = useAnalysisStore.getState();
    const { comparisonHideSameRows, segmentComparisonActiveTab } =
        useUiStore.getState();
    const { get: getFromCache } = useSegmentCacheStore.getState();

    let template;

    if (segmentsForCompare.length < 2) {
        template = html`<div class="text-center py-12 text-slate-400">
            <p>
                Select at least two segments from the Segment Explorer to
                compare.
            </p>
        </div>`;
    } else {
        const enrichedSegments = segmentsForCompare
            .map((item) => {
                const cachedEntry = getFromCache(item.segmentUniqueId);
                if (
                    !cachedEntry ||
                    cachedEntry.status !== 200 ||
                    !cachedEntry.parsedData
                ) {
                    return null;
                }
                const stream = streams.find((s) => s.id === item.streamId);
                if (!stream) return null;

                let segment = null;

                if (stream.protocol === 'dash') {
                    const repState = stream.dashRepresentationState.get(
                        item.repId
                    );
                    if (repState) {
                        segment = repState.segments.find(
                            (s) => s.uniqueId === item.segmentUniqueId
                        );
                    }
                } else if (stream.protocol === 'hls') {
                    const variantState = stream.hlsVariantState.get(item.repId);
                    if (variantState) {
                        segment = variantState.segments.find(
                            (s) => s.uniqueId === item.segmentUniqueId
                        );
                    }
                }

                if (!segment) return null;

                return { ...cachedEntry.parsedData, stream, segment };
            })
            .filter(Boolean);

        if (enrichedSegments.length !== segmentsForCompare.length) {
            template = html`<div class="text-center py-12 text-yellow-400">
                <p>
                    One or more selected segments have not been loaded yet.
                    Please load them from the Segment Explorer first.
                </p>
            </div>`;
        } else {
            try {
                const { headers, sections, structuralDiff } =
                    createComparisonModel(enrichedSegments);

                const hasStructuralDiff =
                    structuralDiff && structuralDiff.length > 0;
                const tabs = [
                    { key: 'tabular', label: 'Tabular Comparison' },
                    ...(hasStructuralDiff
                        ? [
                              {
                                  key: 'structural',
                                  label: 'Structural Diff',
                              },
                          ]
                        : []),
                ];

                const filteredSections = sections
                    .map((section) => ({
                        ...section,
                        rows: comparisonHideSameRows
                            ? section.rows.filter(
                                  (row) => row.status !== 'same'
                              )
                            : section.rows,
                        tableData: section.tableData,
                    }))
                    .filter(
                        (section) =>
                            section.rows.length > 0 || section.tableData
                    );

                let tabContent;
                if (segmentComparisonActiveTab === 'structural') {
                    tabContent = html`<div class="overflow-auto grow mt-6">
                        <p class="text-sm text-slate-400 mb-2">
                            Visual comparison of the ISOBMFF box tree. Only the
                            first two selected segments are used for this view.
                        </p>
                        ${semanticDiffTemplate(structuralDiff)}
                    </div>`;
                } else {
                    tabContent = html`
                        <!-- Sticky Table Header -->
                        <div class="shrink-0 mt-6">
                            <div class="min-w-[1024px]">
                                ${comparisonHeaderTemplate(headers)}
                            </div>
                        </div>
                        <!-- Scrollable Table Body -->
                        <div class="overflow-auto grow">
                            <div class="min-w-[1024px]">
                                ${filteredSections.map((section) =>
                                    comparisonSectionTemplate(
                                        section,
                                        headers.length
                                    )
                                )}
                            </div>
                        </div>
                    `;
                }

                template = html`
                    <div class="flex flex-col h-full">
                        <div
                            class="flex justify-between items-center mb-4 shrink-0"
                        >
                            <h3 class="text-xl font-bold">
                                Segment Comparison
                            </h3>
                            <div class="flex items-center gap-4">
                                <div class="flex items-center gap-2">
                                    <label
                                        for="hide-same-toggle"
                                        class="text-sm text-slate-400"
                                        >Hide identical rows</label
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
                                <button
                                    @click=${() =>
                                        analysisActions.clearSegmentsToCompare()}
                                    class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-md transition-colors text-sm"
                                >
                                    Clear Selection
                                </button>
                            </div>
                        </div>

                        <div class="shrink-0">
                            ${connectedTabBar(
                                tabs,
                                segmentComparisonActiveTab,
                                uiActions.setSegmentComparisonActiveTab
                            )}
                        </div>
                        ${tabContent}
                    </div>
                `;
            } catch (e) {
                template = html`<div class="text-center py-12 text-red-400">
                    <p class="font-bold">Could not generate comparison:</p>
                    <p class="font-mono mt-2">${e.message}</p>
                </div>`;
            }
        }
    }

    render(template, container);
}

export const segmentComparisonView = {
    mount(containerElement, { streams }) {
        container = containerElement;
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();

        analysisUnsubscribe = useAnalysisStore.subscribe(
            renderSegmentComparison
        );
        uiUnsubscribe = useUiStore.subscribe(renderSegmentComparison);

        renderSegmentComparison();
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
