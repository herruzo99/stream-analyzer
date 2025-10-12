import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
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

const HEX_BYTES_PER_PAGE = 1024;
const ALL_TOOLTIPS_DATA = {
    ...getIsobmffTooltipData(),
    ...getTsTooltipData(),
};

function initializeAllInteractivity(dom, cachedSegment, byteMap) {
    let findFn, parsedDataForLogic, format;
    if (cachedSegment.parsedData?.format === 'ts') {
        parsedDataForLogic = cachedSegment.parsedData;
        findFn = findPacketByOffset;
        format = 'ts';
    } else if (cachedSegment.parsedData?.format === 'isobmff') {
        parsedDataForLogic = cachedSegment.parsedData;
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
    }
}

const tabButton = (label, tabKey) => {
    const { interactiveSegmentActiveTab } = useUiStore.getState();
    const isActive = interactiveSegmentActiveTab === tabKey;
    return html`
        <button
            @click=${() => uiActions.setInteractiveSegmentActiveTab(tabKey)}
            class="py-2 px-4 font-semibold text-sm rounded-t-lg transition-colors ${isActive
                ? 'bg-slate-800 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}"
        >
            ${label}
        </button>
    `;
};

export function getInteractiveSegmentTemplate(dom) {
    const { activeSegmentUrl } = useAnalysisStore.getState();
    const {
        interactiveSegmentCurrentPage: currentPage,
        interactiveSegmentActiveTab,
        pagedByteMap,
        isByteMapLoading,
    } = useUiStore.getState();
    const { get: getFromCache } = useSegmentCacheStore.getState();

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
        uiActions.setIsByteMapLoading(true);
        workerService
            .postTask('generate-paged-byte-map', {
                parsedData: cachedSegment.parsedData,
                page: currentPage,
                bytesPerPage: HEX_BYTES_PER_PAGE,
            })
            .then((mapArray) => {
                uiActions.setPagedByteMap(mapArray);
            })
            .finally(() => {
                uiActions.setIsByteMapLoading(false);
            });
    }

    const onPageChange = (offset) => {
        const totalPages = Math.ceil(
            cachedSegment.data.byteLength / HEX_BYTES_PER_PAGE
        );
        const newPage = currentPage + offset;
        if (newPage >= 1 && newPage <= totalPages) {
            uiActions.setInteractiveSegmentPage(newPage);
        }
    };

    let inspectorContent, hexContent;
    const isLoading = isByteMapLoading || (!pagedByteMap && cachedSegment.parsedData?.format !== 'vtt');

    if (isLoading) {
        const loadingTemplate = html`<div class="text-center py-12">
            <div
                class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
            ></div>
            <p class="text-gray-400">Generating paged view...</p>
        </div>`;
        inspectorContent = loadingTemplate;
        hexContent = loadingTemplate;
    } else {
        if (cachedSegment.parsedData?.format === 'vtt') {
            const vttTemplate = getInteractiveVttTemplate(cachedSegment.data);
            inspectorContent = vttTemplate;
            hexContent = vttTemplate; // Show same content for both tabs for VTT
        } else if (cachedSegment.parsedData?.format === 'ts') {
            inspectorContent = getInteractiveTsTemplate();
            hexContent = getInteractiveTsTemplate(true);
        } else if (cachedSegment.parsedData?.format === 'isobmff') {
            inspectorContent = getInteractiveIsobmffTemplate();
            hexContent = getInteractiveIsobmffTemplate(true);
        } else {
            const unsupportedTemplate = html`<div class="text-yellow-400 p-4">
                Interactive view not supported for this segment format.
            </div>`;
            inspectorContent = unsupportedTemplate;
            hexContent = unsupportedTemplate;
        }
        setTimeout(
            () => initializeAllInteractivity(dom, cachedSegment, pagedByteMap),
            0
        );
    }
    
    const inspectorClasses = { hidden: interactiveSegmentActiveTab !== 'inspector', 'lg:block': true };
    const hexClasses = { hidden: interactiveSegmentActiveTab !== 'hex', 'lg:block': true };

    return html`
        <div class="mb-6">
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-xl font-bold text-white">
                    🔍 Interactive Segment View
                </h3>
                <button
                    @click=${() =>
                        /** @type {HTMLElement | null} */ (
                            document.querySelector('[data-tab="explorer"]')
                        )?.click()}
                    class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 text-sm"
                >
                    &larr; Back to Segment Explorer
                </button>
            </div>
            <p class="text-sm text-gray-400 mb-4 font-mono break-all bg-gray-800 p-2 rounded">
                ${activeSegmentUrl}
            </p>
        </div>
        
        <!-- Mobile Tab Navigation -->
        <div class="lg:hidden border-b border-gray-700 mb-4">
            ${tabButton('Inspector', 'inspector')}
            ${tabButton('Hex View', 'hex')}
        </div>
        
        <!-- Responsive Content Grid -->
        <div class="lg:grid lg:grid-cols-[minmax(300px,25%)_1fr] lg:gap-4">
            <div class=${classMap(inspectorClasses)}>
                ${inspectorContent}
            </div>
            <div class=${classMap(hexClasses)}>
                ${hexContent}
            </div>
        </div>
    `;
}