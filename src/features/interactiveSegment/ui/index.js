import { html, render } from 'lit-html';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { workerService } from '@/infrastructure/worker/workerService';
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
    clearHighlights,
    applyHighlights,
} from './components/interaction-logic.js';
import { getInteractiveVttTemplate } from './components/vtt/index.js';
import { inspectorLayoutTemplate } from './components/shared/inspector-layout.js';
import { hexViewTemplate } from './components/hex-view.js';
import { getTooltipData as getIsobmffTooltipData } from '@/infrastructure/parsing/isobmff/index';
import { getTooltipData as getTsTooltipData } from '@/infrastructure/parsing/ts/index';

let container = null;
let uiUnsubscribe = null;
let segmentCacheUnsubscribe = null;
let isViewInitialized = false;
let fullByteMap = null;

const HEX_BYTES_PER_PAGE = 512;
const ALL_TOOLTIPS_DATA = {
    ...getIsobmffTooltipData(),
    ...getTsTooltipData(),
};

const loadingTemplate = (message) =>
    html`<div class="text-center py-12">
        <div
            class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
        ></div>
        <p class="text-gray-400">${message}</p>
    </div>`;

function renderInteractiveSegment() {
    if (!container) return;

    const {
        activeSegmentUrl,
        interactiveSegmentCurrentPage: currentPage,
        isByteMapLoading,
    } = useUiStore.getState();
    const { get: getFromCache, set: setInCache } =
        useSegmentCacheStore.getState();

    if (!activeSegmentUrl) {
        render(html``, container);
        return;
    }

    const cachedSegment = getFromCache(activeSegmentUrl);

    let content;

    if (
        !cachedSegment ||
        cachedSegment.status === -1 ||
        !cachedSegment.parsedData
    ) {
        content = loadingTemplate('Loading and parsing segment...');
    } else if (cachedSegment.status !== 200 || !cachedSegment.data) {
        content = html`<div class="text-red-400 p-4">
            Error loading segment: HTTP ${cachedSegment.status}
        </div>`;
    } else {
        const { parsedData } = cachedSegment;
        const format = parsedData?.format;
        const isBinaryFormat = format === 'isobmff' || format === 'ts';

        if (format === 'vtt') {
            content = getInteractiveVttTemplate(cachedSegment.data);
        } else if (isBinaryFormat) {
            const hasFullAnalysis =
                fullByteMap && (format === 'ts' || parsedData.samples);

            if (!hasFullAnalysis && !isByteMapLoading) {
                uiActions.setIsByteMapLoading(true);
                workerService
                    .postTask('full-segment-analysis', { parsedData })
                    .promise.then(({ samples, byteMap }) => {
                        const updatedParsedData = { ...parsedData, samples };
                        setInCache(activeSegmentUrl, {
                            ...cachedSegment,
                            parsedData: updatedParsedData,
                        });
                        fullByteMap = new Map(byteMap);
                        uiActions.setIsByteMapLoading(false);
                    })
                    .catch((err) => {
                        console.error('Failed to generate byte map:', err);
                        uiActions.setIsByteMapLoading(false);
                    });
            }

            if (isByteMapLoading || !hasFullAnalysis) {
                content = inspectorLayoutTemplate({
                    inspectorContent: loadingTemplate('Performing deep analysis...'),
                    structureContent: loadingTemplate('Performing deep analysis...'),
                    hexContent: loadingTemplate('Performing deep analysis...'),
                });
            } else {
                let inspectorContent, structureContent;
                if (format === 'ts') {
                    inspectorContent = tsInspector(parsedData);
                    structureContent = tsStructure(parsedData);
                } else if (format === 'isobmff') {
                    inspectorContent = isobmffInspector(
                        parsedData.data,
                        parsedData.samples
                    );
                    structureContent = isobmffStructure(parsedData.data);
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

                const hexContent = hexViewTemplate(
                    cachedSegment.data,
                    fullByteMap,
                    currentPage,
                    HEX_BYTES_PER_PAGE,
                    onHexPageChange,
                    ALL_TOOLTIPS_DATA
                );

                content = inspectorLayoutTemplate({
                    inspectorContent,
                    structureContent,
                    hexContent,
                });

                if (!isViewInitialized) {
                    const findFn =
                        parsedData.format === 'isobmff'
                            ? findItemIsobmff
                            : findItemTs;
                    setTimeout(() => {
                        initializeSegmentViewInteractivity(
                            { mainContent: container },
                            parsedData,
                            fullByteMap,
                            findFn,
                            parsedData.format
                        );
                        isViewInitialized = true;
                    }, 0);
                }
            }
        } else {
            content = html`<div class="text-yellow-400 p-4">
                Interactive view not supported for this segment format
                (${format}).
            </div>`;
        }
    }

    const template = html`
        <div class="mb-6 shrink-0">
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-xl font-bold text-white">
                    🔍 Interactive Segment View
                </h3>
                <button
                    @click=${() => uiActions.setActiveTab('explorer')}
                    class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 text-sm"
                >
                    &larr; Back to Segment Explorer
                </button>
            </div>
            <p
                class="text-sm text-gray-400 mb-4 font-mono break-all bg-gray-800 p-2 rounded"
            >
                ${(activeSegmentUrl || '').split('@')[0]}
            </p>
        </div>
        <div class="grow min-h-0">${content}</div>
    `;

    render(template, container);

    // Imperatively apply highlights after the render cycle completes.
    setTimeout(() => {
        const {
            interactiveSegmentSelectedItem,
            interactiveSegmentHighlightedItem,
        } = useUiStore.getState();
        clearHighlights();
        if (interactiveSegmentHighlightedItem?.item) {
            applyHighlights(
                container,
                interactiveSegmentHighlightedItem.item,
                interactiveSegmentHighlightedItem.field
            );
        }
        if (interactiveSegmentSelectedItem?.item) {
            // Re-apply selection highlights over any hover highlights
            applyHighlights(container, interactiveSegmentSelectedItem.item);
        }
    }, 0);
}

export const interactiveSegmentView = {
    mount(containerElement, stream) {
        container = containerElement;
        isViewInitialized = false; // Reset initialization flag on mount
        fullByteMap = null; // Clear local state on mount
        if (uiUnsubscribe) uiUnsubscribe();
        if (segmentCacheUnsubscribe) segmentCacheUnsubscribe();

        uiUnsubscribe = useUiStore.subscribe(renderInteractiveSegment);
        segmentCacheUnsubscribe = useSegmentCacheStore.subscribe(
            renderInteractiveSegment
        );
        renderInteractiveSegment();
    },
    unmount() {
        if (uiUnsubscribe) uiUnsubscribe();
        if (segmentCacheUnsubscribe) segmentCacheUnsubscribe();
        uiUnsubscribe = null;
        segmentCacheUnsubscribe = null;
        isViewInitialized = false;
        fullByteMap = null; // Clear local state on unmount

        cleanupSegmentViewInteractivity({ mainContent: container });
        if (container) {
            render(html``, container);
        }
        container = null;
    },
};