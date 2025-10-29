import { html, render } from 'lit-html';
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
        fullByteMap,
    } = useUiStore.getState();
    const { get: getFromCache } = useSegmentCacheStore.getState();

    if (!activeSegmentUrl) {
        render(html``, container);
        return;
    }

    const cachedSegment = getFromCache(activeSegmentUrl);
    const startOffset = (currentPage - 1) * HEX_BYTES_PER_PAGE;

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
        const format = cachedSegment.parsedData?.format;
        const isBinaryFormat = format === 'isobmff' || format === 'ts';

        // --- ARCHITECTURAL REFACTOR: Load full byte map once ---
        if (isBinaryFormat && !fullByteMap) {
            if (cachedSegment.parsedData.byteMap) {
                // The worker has provided the full map, store it in the UI state.
                uiActions.setFullByteMap(cachedSegment.parsedData.byteMap);
            }
            // A re-render will be triggered by the state change, so we can return a loading state.
            content = inspectorLayoutTemplate({
                inspectorContent: loadingTemplate('Initializing view...'),
                structureContent: loadingTemplate('Initializing view...'),
                hexContent: loadingTemplate('Initializing view...'),
            });
        } else if (format === 'vtt') {
            content = getInteractiveVttTemplate(cachedSegment.data);
        } else if (isBinaryFormat && fullByteMap) {
            let inspectorContent, structureContent;
            if (format === 'ts') {
                inspectorContent = tsInspector(cachedSegment.parsedData);
                structureContent = tsStructure(cachedSegment.parsedData);
            } else if (format === 'isobmff') {
                inspectorContent = isobmffInspector(
                    cachedSegment.parsedData.data
                );
                structureContent = isobmffStructure(
                    cachedSegment.parsedData.data
                );
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

            // Slice the current page's data from the full map
            const pagedByteMap = new Map();
            for (
                let i = startOffset;
                i < startOffset + HEX_BYTES_PER_PAGE;
                i++
            ) {
                if (fullByteMap.has(i)) {
                    pagedByteMap.set(i, fullByteMap.get(i));
                }
            }

            const hexContent = hexViewTemplate(
                cachedSegment.data,
                pagedByteMap,
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
                    cachedSegment.parsedData.format === 'isobmff'
                        ? findItemIsobmff
                        : findItemTs;
                setTimeout(() => {
                    initializeSegmentViewInteractivity(
                        { mainContent: container },
                        cachedSegment.parsedData,
                        fullByteMap,
                        findFn,
                        cachedSegment.parsedData.format
                    );
                    isViewInitialized = true;
                }, 0);
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

        cleanupSegmentViewInteractivity({ mainContent: container });
        if (container) {
            render(html``, container);
        }
        container = null;
    },
};
