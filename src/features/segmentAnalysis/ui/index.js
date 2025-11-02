import { html } from 'lit-html';
import { isobmffAnalysisTemplate } from './isobmff-analysis.js';
import { tsAnalysisTemplate } from './ts-analysis.js';
import { vttAnalysisTemplate } from './vtt-analysis.js';
import { useUiStore, uiActions } from '@/state/uiStore';
import { closeModal } from '@/ui/services/modalService';
import * as icons from '@/ui/icons';

export function getSegmentAnalysisTemplate(parsedData, parsedDataB = null) {
    const { modalUrl: uniqueId } = useUiStore.getState().modalState;

    if (parsedData?.error) {
        return html`<p class="text-red-400 p-4">
            Segment could not be parsed:
            <span class="block font-mono bg-gray-900 p-2 mt-2 rounded"
                >${parsedData.error}</span
            >
        </p>`;
    }

    if (!parsedData) {
        return html`<p class="text-gray-400 p-4">
            Segment data not available or is currently loading.
        </p>`;
    }

    // Comparison view remains unchanged for now.
    if (parsedDataB) {
        return html`<p class="text-yellow-400">
            Comparison view not yet updated.
        </p>`;
    }

    const handleExplore = () => {
        closeModal();
        uiActions.navigateToInteractiveSegment(uniqueId);
    };

    const format = parsedData.format;
    let contentTemplate;
    switch (format) {
        case 'isobmff':
            contentTemplate = isobmffAnalysisTemplate(parsedData);
            break;
        case 'ts':
            contentTemplate = tsAnalysisTemplate(parsedData);
            break;
        case 'vtt':
            contentTemplate = vttAnalysisTemplate(parsedData.data);
            break;
        default:
            contentTemplate = html`<p class="fail">
                Analysis view for format '${format}' is not supported.
            </p>`;
            break;
    }

    return html`
        <div class="flex flex-col h-full">
            <div
                class="flex justify-between items-center mb-4 pb-4 border-b border-slate-700"
            >
                <div>
                    <h4 class="font-bold text-lg text-white">
                        Segment Analysis Report
                    </h4>
                    <p class="text-sm text-slate-400">
                        A high-level summary of the segment's structure and
                        conformance.
                    </p>
                </div>
                <button
                    @click=${handleExplore}
                    class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 text-sm flex items-center gap-2"
                >
                    ${icons.binary}
                    <span>Explore in Interactive View</span>
                </button>
            </div>
            <div class="grow overflow-y-auto pr-2">${contentTemplate}</div>
        </div>
    `;
}