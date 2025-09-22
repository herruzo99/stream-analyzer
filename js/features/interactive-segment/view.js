import { html } from 'lit-html';
import { analysisState } from '../../core/state.js';
import { getInteractiveIsobmffTemplate } from './isobmff-view.js';
import { getInteractiveTsTemplate } from './ts-view.js';

export function getInteractiveSegmentTemplate() {
    const { activeSegmentUrl, segmentCache } = analysisState;

    if (!activeSegmentUrl) {
        return html`
            <div class="text-center py-12">
                <div class="text-gray-400 text-lg mb-4">
                    📄 Interactive Segment View
                </div>
                <p class="text-gray-500">
                    Select a segment from the "Segment Explorer" tab and click
                    "View Raw" to inspect its content here.
                </p>
            </div>
        `;
    }

    const cachedSegment = segmentCache.get(activeSegmentUrl);

    if (!cachedSegment || cachedSegment.status === -1) {
        return html`
            <div class="text-center py-12">
                <div
                    class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
                ></div>
                <p class="text-gray-400">Loading and parsing segment data...</p>
            </div>
        `;
    }

    if (cachedSegment.status !== 200 || !cachedSegment.data) {
        return html`
            <div class="text-center py-12">
                <div class="text-red-400 text-lg mb-2">❌ Failed to Load</div>
                <p class="text-gray-400">
                    Failed to fetch segment. Status:
                    ${cachedSegment.status || 'Network Error'}.
                </p>
            </div>
        `;
    }

    let contentTemplate;
    // Dispatch to the correct view based on the parsed data format
    if (cachedSegment.parsedData?.format === 'ts') {
        contentTemplate = getInteractiveTsTemplate();
    } else {
        // Default to ISOBMFF view for everything else
        contentTemplate = getInteractiveIsobmffTemplate();
    }

    return html`
        <div class="mb-6">
            <h3 class="text-xl font-bold mb-2 text-white">
                🔍 Interactive Segment View
            </h3>
            <p
                class="text-sm text-gray-400 mb-4 font-mono break-all bg-gray-800 p-2 rounded"
            >
                ${activeSegmentUrl}
            </p>
        </div>
        ${contentTemplate}
    `;
}