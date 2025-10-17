import { html } from 'lit-html';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { createComparisonModel } from '../domain/comparisonEngine.js';
import { comparisonHeaderTemplate } from './components/comparisonHeader.js';
import { comparisonSectionTemplate } from './components/comparisonSection.js';
import { semanticDiffTemplate } from './components/semanticDiff.js';

/**
 * Main entry point for the Segment Comparison view.
 * @returns {import('lit-html').TemplateResult}
 */
export function getSegmentComparisonTemplate() {
    const { streams, segmentsForCompare } = useAnalysisStore.getState();
    const { segmentComparisonHideSame } = useUiStore.getState();
    const { get: getFromCache } = useSegmentCacheStore.getState();

    if (segmentsForCompare.length < 2) {
        return html`<div class="text-center py-12 text-gray-400">
            <p>Select at least two segments from the Segment Explorer to compare.</p>
        </div>`;
    }

    // Enrich segment data with stream and segment info for the comparison engine
    const enrichedSegments = segmentsForCompare.map(item => {
        const cachedEntry = getFromCache(item.segmentUniqueId);
        if (!cachedEntry || cachedEntry.status !== 200 || !cachedEntry.parsedData) {
            return null; // Segment not loaded or has an error
        }
        const stream = streams.find(s => s.id === item.streamId);
        
        /** @type {(import('@/types').MediaSegment | import('@/types').HlsSegment)[]} */
        const allSegments = (stream.protocol === 'dash' 
            ? stream.dashRepresentationState.get(item.repId)?.segments
            : stream.hlsVariantState.get(item.repId)?.segments) ||
            stream.segments || []; // Fallback for 'local' protocol
        
        const segment = allSegments.find(s => s.uniqueId === item.segmentUniqueId);
        
        if (!stream || !segment) return null;
        
        return {
            ...cachedEntry.parsedData, // Correctly spread the nested parsedData object
            stream: stream,
            segment: segment,
        };
    }).filter(Boolean);

    if (enrichedSegments.length !== segmentsForCompare.length) {
         return html`<div class="text-center py-12 text-yellow-400">
            <p>One or more selected segments have not been loaded yet. Please load them from the Segment Explorer first.</p>
        </div>`;
    }

    try {
        const { headers, sections, structuralDiff } = createComparisonModel(enrichedSegments);
        
        const filteredSections = sections.map(section => ({
            ...section,
            rows: segmentComparisonHideSame ? section.rows.filter(row => row.status !== 'same') : section.rows
        })).filter(section => section.rows.length > 0);

        return html`
            <div class="flex flex-col h-full">
                 <div class="flex justify-between items-center mb-4 shrink-0">
                    <h3 class="text-xl font-bold">Segment Comparison</h3>
                    <div class="flex items-center gap-4">
                        <div class="flex items-center gap-2">
                            <label for="hide-same-toggle" class="text-sm text-gray-400">Hide identical rows</label>
                            <button
                                @click=${() => uiActions.toggleSegmentComparisonHideSame()}
                                role="switch"
                                aria-checked="${segmentComparisonHideSame}"
                                id="hide-same-toggle"
                                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${segmentComparisonHideSame ? 'bg-blue-600' : 'bg-gray-600'}"
                            >
                                <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${segmentComparisonHideSame ? 'translate-x-6' : 'translate-x-1'}"></span>
                            </button>
                        </div>
                        <button 
                            @click=${() => analysisActions.clearSegmentsToCompare()}
                            class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-md transition-colors text-sm"
                        >
                            Clear Selection
                        </button>
                    </div>
                </div>
                <div class="overflow-auto grow">
                    <div class="min-w-[1024px]">
                        ${comparisonHeaderTemplate(headers)}

                        ${structuralDiff ? html`
                            <div class="mt-6">
                                <h3 class="text-xl font-bold text-gray-200 mb-2">Structural Diff</h3>
                                <p class="text-sm text-gray-400 mb-2">Visual comparison of the ISOBMFF box tree. Only the first two selected segments are used for this view.</p>
                                ${semanticDiffTemplate(structuralDiff)}
                            </div>
                        ` : ''}

                        ${filteredSections.map(section => comparisonSectionTemplate(section, headers.length))}
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        return html`<div class="text-center py-12 text-red-400">
            <p class="font-bold">Could not generate comparison:</p>
            <p class="font-mono mt-2">${e.message}</p>
        </div>`;
    }
}