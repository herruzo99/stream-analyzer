import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import {
    getInteractiveIsobmffTemplate,
    findItemByOffset,
} from './components/isobmff/index.js';
import {
    getInteractiveTsTemplate,
    findPacketByOffset,
} from './components/ts/index.js';
import {
    cleanupSegmentViewInteractivity,
    initializeSegmentViewInteractivity,
    renderInspectorPanel,
} from './components/interaction-logic.js';
import { getInteractiveVttTemplate } from './components/vtt/index.js';
import { getTooltipData as getIsobmffTooltipData } from '@/infrastructure/parsing/isobmff/index';
import { getTooltipData as getTsTooltipData } from '@/infrastructure/parsing/ts/index';
import { workerService } from '@/infrastructure/worker/workerService';

let lastProcessedSegmentUrl = null;
const HEX_BYTES_PER_PAGE = 1024;
const ALL_TOOLTIPS_DATA = {
    ...getIsobmffTooltipData(),
    ...getTsTooltipData(),
};

let isInitialized = false;
let pagedByteMap = null;
let isByteMapLoading = false;

function initializeAllInteractivity(dom, cachedSegment, byteMap) {
    if (isInitialized) return;

    let findFn, parsedDataForLogic, format;
    if (cachedSegment.parsedData?.format === 'ts') {
        parsedDataForLogic = cachedSegment.parsedData.data;
        findFn = findPacketByOffset;
        format = 'ts';
    } else if (cachedSegment.parsedData?.format === 'isobmff') {
        parsedDataForLogic = cachedSegment.parsedData.data;
        findFn = findItemByOffset;
        format = 'isobmff';
    }

    if (findFn && parsedDataForLogic && format) {
        initializeSegmentViewInteractivity(
            dom,
            parsedDataForLogic,
            byteMap,
            findFn,
            format
        );
        renderInspectorPanel(); // Render initial placeholder
        isInitialized = true;
    }
}

export function getInteractiveSegmentTemplate(dom) {
    const { activeSegmentUrl } = useAnalysisStore.getState();
    const { interactiveSegmentCurrentPage: currentPage } = useUiStore.getState();
    const { get: getFromCache } = useSegmentCacheStore.getState();

    if (activeSegmentUrl !== lastProcessedSegmentUrl) {
        cleanupSegmentViewInteractivity(dom);
        isInitialized = false;
        pagedByteMap = null;
        lastProcessedSegmentUrl = activeSegmentUrl;
    }

    if (!activeSegmentUrl) {
        return html`<!-- placeholder -->`;
    }

    const cachedSegment = getFromCache(activeSegmentUrl);

    if (
        !cachedSegment ||
        cachedSegment.status === -1 ||
        !cachedSegment.parsedData
    ) {
        return html`<!-- loading -->`;
    }
    if (cachedSegment.status !== 200 || !cachedSegment.data) {
        return html`<!-- error -->`;
    }

    if (!pagedByteMap && !isByteMapLoading) {
        isByteMapLoading = true;
        workerService
            .postTask('generate-paged-byte-map', {
                parsedData: cachedSegment.parsedData,
                page: currentPage,
                bytesPerPage: HEX_BYTES_PER_PAGE,
            })
            .then((mapArray) => {
                pagedByteMap = new Map(mapArray);
                isByteMapLoading = false;
                render(
                    getInteractiveSegmentTemplate(dom),
                    dom.tabContents['interactive-segment']
                );
            });
    }

    const onPageChange = (offset) => {
        const totalPages = Math.ceil(
            cachedSegment.data.byteLength / HEX_BYTES_PER_PAGE
        );
        const newPage = currentPage + offset;
        if (newPage >= 1 && newPage <= totalPages) {
            isInitialized = false;
            pagedByteMap = null; // Invalidate current map
            uiActions.setInteractiveSegmentPage(newPage);
        }
    };

    let contentTemplate;

    if (pagedByteMap || cachedSegment.parsedData?.format === 'vtt') {
        if (cachedSegment.parsedData?.format === 'vtt') {
            contentTemplate = getInteractiveVttTemplate(cachedSegment.data);
        } else if (cachedSegment.parsedData?.format === 'ts') {
            contentTemplate = getInteractiveTsTemplate(
                currentPage,
                HEX_BYTES_PER_PAGE,
                onPageChange,
                ALL_TOOLTIPS_DATA,
                pagedByteMap
            );
        } else if (cachedSegment.parsedData?.format === 'isobmff') {
            contentTemplate = getInteractiveIsobmffTemplate(
                currentPage,
                HEX_BYTES_PER_PAGE,
                onPageChange,
                ALL_TOOLTIPS_DATA,
                pagedByteMap
            );
        } else {
            contentTemplate = html`<div class="text-yellow-400 p-4">
                Interactive view not supported for this segment format.
            </div>`;
        }
        setTimeout(
            () => initializeAllInteractivity(dom, cachedSegment, pagedByteMap),
            0
        );
    } else {
        contentTemplate = html`<div class="text-center py-12">
            <div
                class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
            ></div>
            <p class="text-gray-400">Generating paged view...</p>
        </div>`;
    }

    return html`
        <div class="mb-6">
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-xl font-bold text-white">
                    🔍 Interactive Segment View
                </h3>
                <button
                    @click=${() =>
                        (
                            /** @type {HTMLElement | null} */ (
                                document.querySelector('[data-tab="explorer"]')
                            )
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