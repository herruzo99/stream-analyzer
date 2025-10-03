import { html, render } from 'lit-html';
import { useStore } from '../../../core/store.js';
import { dom } from '../../../core/dom.js';
import {
    getInteractiveIsobmffTemplate,
    inspectorPanelTemplate as isobmffInspector,
    findBoxByOffset,
} from './components/isobmff/index.js';
import { buildByteMap } from './components/isobmff/view-model.js';
import {
    getInteractiveTsTemplate,
    inspectorPanelTemplate as tsInspector,
    findPacketByOffset,
} from './components/ts/index.js';
import { buildByteMapTs } from './components/ts/view-model.js';
import {
    cleanupSegmentViewInteractivity,
    initializeSegmentViewInteractivity,
} from './components/interaction-logic.js';

// Import all tooltip data sources
import { getTooltipData as getIsobmffTooltipData } from '../../../protocols/segment/isobmff/index.js';
import { getTooltipData as getTsTooltipData } from '../../../protocols/segment/ts/index.js';

let currentSegmentUrl = null;
let hexCurrentPage = 1;
const HEX_BYTES_PER_PAGE = 1024;

// Aggregate all tooltip data once
const ALL_TOOLTIPS_DATA = {
    ...getIsobmffTooltipData(),
    ...getTsTooltipData(),
};

export function getInteractiveSegmentTemplate() {
    const { activeSegmentUrl, segmentCache } = useStore.getState();

    if (activeSegmentUrl !== currentSegmentUrl) {
        cleanupSegmentViewInteractivity();
        currentSegmentUrl = activeSegmentUrl;
        hexCurrentPage = 1; // Reset pagination when segment changes
    }

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

    const onPageChange = (offset) => {
        const totalPages = Math.ceil(
            cachedSegment.data.byteLength / HEX_BYTES_PER_PAGE
        );
        const newPage = hexCurrentPage + offset;
        if (newPage >= 1 && newPage <= totalPages) {
            hexCurrentPage = newPage;
            render(
                getInteractiveSegmentTemplate(),
                dom.tabContents['interactive-segment']
            );
        }
    };

    const startOffset = (hexCurrentPage - 1) * HEX_BYTES_PER_PAGE;
    const endByte = Math.min(
        startOffset + HEX_BYTES_PER_PAGE,
        cachedSegment.data.byteLength
    );

    let contentTemplate;
    if (cachedSegment.parsedData?.format === 'ts') {
        contentTemplate = getInteractiveTsTemplate(
            hexCurrentPage,
            HEX_BYTES_PER_PAGE,
            onPageChange,
            ALL_TOOLTIPS_DATA // Pass aggregated tooltips
        );
    } else {
        contentTemplate = getInteractiveIsobmffTemplate(
            hexCurrentPage,
            HEX_BYTES_PER_PAGE,
            onPageChange,
            ALL_TOOLTIPS_DATA // Pass aggregated tooltips
        );
    }

    // Defer initialization until after the first render
    setTimeout(() => {
        if (cachedSegment.parsedData?.format === 'ts') {
            const byteMap = buildByteMapTs(cachedSegment.parsedData);
            initializeSegmentViewInteractivity(
                cachedSegment.parsedData,
                byteMap,
                findPacketByOffset,
                tsInspector,
                startOffset,
                endByte
            );
        } else if (cachedSegment.parsedData?.format === 'isobmff') {
            const groupedBoxes = cachedSegment.parsedData.data.boxes || [];
            const byteMap = buildByteMap(groupedBoxes);
            initializeSegmentViewInteractivity(
                cachedSegment.parsedData.data,
                byteMap,
                findBoxByOffset,
                (box, rootData, highlightedField) =>
                    isobmffInspector(box, rootData, highlightedField),
                startOffset,
                endByte
            );
        }
    }, 0);

    return html`
        <div class="mb-6">
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-xl font-bold text-white">
                    🔍 Interactive Segment View
                </h3>
                <button
                    @click=${() =>
                        /** @type {HTMLElement} */ (
                            document.querySelector('[data-tab="explorer"]')
                        )?.click()}
                    class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 text-sm"
                >
                    &larr; Back to Segment Explorer
                </button>
            </div>

            <p
                class="text-sm text-gray-400 mb-4 font-mono break-all bg-gray-800 p-2 rounded"
            >
                ${activeSegmentUrl}
            </p>
        </div>
        ${contentTemplate}
    `;
}
