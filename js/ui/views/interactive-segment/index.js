import { html } from 'lit-html';
import { useStore, storeActions } from '../../../core/store.js';
import {
    getInteractiveIsobmffTemplate,
    findBoxByOffset,
} from './components/isobmff/index.js';
import {
    getInteractiveTsTemplate,
    findPacketByOffset,
} from './components/ts/index.js';
import {
    cleanupSegmentViewInteractivity,
    initializeSegmentViewInteractivity,
} from './components/interaction-logic.js';

import { getTooltipData as getIsobmffTooltipData } from '../../../protocols/segment/isobmff/index.js';
import { getTooltipData as getTsTooltipData } from '../../../protocols/segment/ts/index.js';

let lastProcessedSegmentUrl = null;
const HEX_BYTES_PER_PAGE = 1024;

const ALL_TOOLTIPS_DATA = {
    ...getIsobmffTooltipData(),
    ...getTsTooltipData(),
};

let isInitialized = false;

function initializeAllInteractivity(dom, cachedSegment) {
    if (isInitialized) return;

    let byteMap, findFn, parsedDataForLogic;
    if (cachedSegment.parsedData?.format === 'ts') {
        const tsData = cachedSegment.parsedData;
        byteMap = tsData.byteMap;
        findFn = findPacketByOffset;
        parsedDataForLogic = tsData;
    } else if (cachedSegment.parsedData?.format === 'isobmff') {
        const isobmffData = cachedSegment.parsedData;
        byteMap = isobmffData.byteMap;
        findFn = findBoxByOffset;
        parsedDataForLogic = isobmffData.data;
    }

    if (byteMap && findFn && parsedDataForLogic) {
        initializeSegmentViewInteractivity(
            dom,
            parsedDataForLogic,
            byteMap,
            findFn
        );
        isInitialized = true;
    }
}

export function getInteractiveSegmentTemplate(dom) {
    const { activeSegmentUrl, segmentCache, interactiveSegmentCurrentPage } =
        useStore.getState();

    if (activeSegmentUrl !== lastProcessedSegmentUrl) {
        cleanupSegmentViewInteractivity(dom);
        isInitialized = false; // Reset for the new segment
        lastProcessedSegmentUrl = activeSegmentUrl;
        // The page is now reset automatically by the `setActiveSegmentUrl` action.
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
        const newPage = interactiveSegmentCurrentPage + offset;
        if (newPage >= 1 && newPage <= totalPages) {
            isInitialized = false;
            storeActions.setInteractiveSegmentPage(newPage);
        }
    };

    let contentTemplate;
    if (cachedSegment.parsedData?.format === 'ts') {
        contentTemplate = getInteractiveTsTemplate(
            interactiveSegmentCurrentPage,
            HEX_BYTES_PER_PAGE,
            onPageChange,
            ALL_TOOLTIPS_DATA
        );
    } else if (cachedSegment.parsedData?.format === 'isobmff') {
        contentTemplate = getInteractiveIsobmffTemplate(
            interactiveSegmentCurrentPage,
            HEX_BYTES_PER_PAGE,
            onPageChange,
            ALL_TOOLTIPS_DATA
        );
    } else {
        contentTemplate = html`<div class="text-yellow-400 p-4">
            Interactive view not supported for this segment format.
        </div>`;
    }

    // Defer initialization until after the first render of the new segment
    setTimeout(() => initializeAllInteractivity(dom, cachedSegment), 0);

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
