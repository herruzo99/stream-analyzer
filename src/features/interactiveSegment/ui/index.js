import { html } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import {
    inspectorPanelTemplate as isobmffInspector,
    structureContentTemplate as isobmffStructure,
    findItemByOffset as findItemIsobmff,
} from './components/isobmff/index.js';
import {
    inspectorPanelTemplate as tsInspector,
    structureContentTemplate as tsStructure,
    findPacketByOffset as findItemTs,
} from './components/ts/index.js';
import {
    cleanupSegmentViewInteractivity,
    initializeSegmentViewInteractivity,
} from './components/interaction-logic.js';
import { getInteractiveVttTemplate } from './components/vtt/index.js';
import { inspectorLayoutTemplate } from './components/shared/inspector-layout.js';
import { hexViewTemplate } from '@/ui/components/hex-view';
import { getTooltipData as getIsobmffTooltipData } from '@/infrastructure/parsing/isobmff/index';
import { getTooltipData as getTsTooltipData } from '@/infrastructure/parsing/ts/index';
import { workerService } from '@/infrastructure/worker/workerService';

const HEX_BYTES_PER_PAGE = 512;
const ALL_TOOLTIPS_DATA = {
    ...getIsobmffTooltipData(),
    ...getTsTooltipData(),
};

function initializeAllInteractivity(dom, cachedSegment, byteMap) {
    let findFn, parsedDataForLogic, format;
    if (cachedSegment.parsedData?.format === 'ts') {
        parsedDataForLogic = cachedSegment.parsedData;
        findFn = findItemTs;
        format = 'ts';
    } else if (cachedSegment.parsedData?.format === 'isobmff') {
        parsedDataForLogic = cachedSegment.parsedData;
        findFn = findItemIsobmff;
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
        // The initial render is handled declaratively by the main template.
        // This function only needs to set up the event listeners for subsequent interactions.
        // The redundant call to renderInspectorPanel() is removed from here.
    }
}

const loadingTemplate = (message) =>
    html`<div class="text-center py-12">
        <div
            class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
        ></div>
        <p class="text-gray-400">${message}</p>
    </div>`;

export function getInteractiveSegmentTemplate(dom) {
    const { activeSegmentUrl } = useAnalysisStore.getState();
    const {
        interactiveSegmentCurrentPage: currentPage,
        pagedByteMap,
        isByteMapLoading,
    } = useUiStore.getState();
    const { get: getFromCache } = useSegmentCacheStore.getState();

    if (!activeSegmentUrl) {
        return html``;
    }

    const cachedSegment = getFromCache(activeSegmentUrl);

    if (
        !cachedSegment ||
        cachedSegment.status === -1 ||
        !cachedSegment.parsedData
    ) {
        return loadingTemplate('Loading and parsing segment...');
    }
    if (cachedSegment.status !== 200 || !cachedSegment.data) {
        return html`<div class="text-red-400 p-4">
            Error loading segment: HTTP ${cachedSegment.status}
        </div>`;
    }

    const format = cachedSegment.parsedData?.format;
    const isBinaryFormat = format === 'isobmff' || format === 'ts';

    if (isBinaryFormat && !pagedByteMap && !isByteMapLoading) {
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

    let inspectorContent, structureContent, hexContent;

    const isLoading = isByteMapLoading || (!pagedByteMap && isBinaryFormat);

    if (isLoading) {
        const loadingSpinner = loadingTemplate('Generating paged view...');
        inspectorContent = loadingSpinner;
        structureContent = loadingSpinner;
        hexContent = loadingSpinner;
    } else {
        setTimeout(
            () =>
                initializeAllInteractivity(
                    dom,
                    cachedSegment,
                    pagedByteMap || new Map()
                ),
            0
        );

        if (format === 'vtt') {
            const vttTemplate = getInteractiveVttTemplate(cachedSegment.data);
            return vttTemplate; // VTT has a simple, single-pane layout for now
        } else if (format === 'ts') {
            inspectorContent = tsInspector(cachedSegment.parsedData);
            structureContent = tsStructure(cachedSegment.parsedData);
        } else if (format === 'isobmff') {
            inspectorContent = isobmffInspector(cachedSegment.parsedData.data);
            structureContent = isobmffStructure(cachedSegment.parsedData.data);
        } else {
            const unsupported = html`<div class="text-yellow-400 p-4">
                Interactive view not supported for this segment format.
            </div>`;
            inspectorContent = unsupported;
            structureContent = html``;
            hexContent = unsupported;
        }

        const onHexPageChange = (offset) => {
            const totalPages = Math.ceil(
                cachedSegment.data.byteLength / HEX_BYTES_PER_PAGE
            );
            const newPage = currentPage + offset;
            if (newPage >= 1 && newPage <= totalPages) {
                uiActions.setInteractiveSegmentPage(newPage);
            }
        };
        hexContent = hexViewTemplate(
            cachedSegment.data,
            pagedByteMap,
            currentPage,
            HEX_BYTES_PER_PAGE,
            onHexPageChange,
            ALL_TOOLTIPS_DATA
        );
    }

    return html`
        <div class="mb-6 shrink-0">
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
            <p
                class="text-sm text-gray-400 mb-4 font-mono break-all bg-gray-800 p-2 rounded"
            >
                ${activeSegmentUrl.split('@')[0]}
            </p>
        </div>
        <div class="grow min-h-0">
            ${inspectorLayoutTemplate({
                inspectorContent,
                structureContent,
                hexContent,
            })}
        </div>
    `;
}
