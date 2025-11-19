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
} from './components/interaction-logic.js';
import { getInteractiveVttTemplate } from './components/vtt/index.js';
import { inspectorLayoutTemplate } from './components/shared/inspector-layout.js';
import { hexViewTemplate } from './components/hex-view.js';
import { getTooltipData as getIsobmffTooltipData } from '@/infrastructure/parsing/isobmff/index';
import { getTooltipData as getTsTooltipData } from '@/infrastructure/parsing/ts/index';
import * as icons from '@/ui/icons';
import { getParsedSegment } from '@/infrastructure/segments/segmentService.js';
import { copyTextToClipboard } from '@/ui/shared/clipboard.js';
import { showToast } from '@/ui/components/toast.js';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details.js';

let container = null;
let uiUnsubscribe = null;
let segmentCacheUnsubscribe = null;
let isViewInitialized = false;
let fullByteMap = null;

const ALL_TOOLTIPS_DATA = {
    ...getIsobmffTooltipData(),
    ...getTsTooltipData(),
};

const loadingTemplate = (message) =>
    html`<div class="flex items-center justify-center h-full text-slate-400">
        <div class="text-center">
            <div class="animate-spin inline-block">${icons.spinner}</div>
            <p class="mt-2">${message}</p>
        </div>
    </div>`;

function renderInteractiveSegment() {
    if (!container) return;

    const {
        activeSegmentUrl,
        isByteMapLoading,
        activeSegmentHighlightRange,
        activeSegmentIsIFrame,
    } = useUiStore.getState();
    const { get: getFromCache } = useSegmentCacheStore.getState();

    if (!activeSegmentUrl) {
        render(html``, container);
        return;
    }

    const cachedSegment = getFromCache(activeSegmentUrl);

    let content;

    // --- ARCHITECTURAL FIX: Use getParsedSegment to trigger fetch-on-miss ---
    if (!cachedSegment || cachedSegment.status === -1) {
        content = loadingTemplate('Loading and parsing segment...');
        // If not in cache or pending, trigger the load. The store subscription will re-render.
        if (!cachedSegment) {
            getParsedSegment(activeSegmentUrl, null, null, {
                isIFrame: activeSegmentIsIFrame,
            }).catch((err) => {
                console.error(
                    `[InteractiveSegmentView] Failed to load segment: ${err.message}`
                );
                // The cache store will be updated with an error state, triggering a re-render.
            });
        }
    } else if (
        (cachedSegment.status !== 200 && cachedSegment.status !== 206) ||
        !cachedSegment.data
    ) {
        content = html`<div class="text-red-400 p-4">
            Error loading segment: HTTP ${cachedSegment.status}
        </div>`;
    } else {
        const { parsedData } = cachedSegment;
        const format = parsedData?.format;
        const isBinaryFormat = format === 'isobmff' || format === 'ts';

        if (format === 'vtt') {
            content = getInteractiveVttTemplate(cachedSegment.data);
        } else if (format === 'scte35') {
            content = scte35DetailsTemplate(parsedData.data);
        } else if (isBinaryFormat) {
            const hasFullAnalysis = !!fullByteMap;

            if (!hasFullAnalysis && !isByteMapLoading) {
                uiActions.setIsByteMapLoading(true);
                workerService
                    .postTask('full-segment-analysis', { parsedData })
                    .promise.then(({ byteMap }) => {
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
                    inspectorContent: loadingTemplate(
                        'Performing deep analysis...'
                    ),
                    structureContent: loadingTemplate(
                        'Building structure tree...'
                    ),
                    hexContent: loadingTemplate('Generating hex view...'),
                });
            } else {
                let inspectorContent, structureContent;
                if (format === 'ts') {
                    inspectorContent = tsInspector(parsedData);
                    structureContent = tsStructure(parsedData);
                } else {
                    inspectorContent = isobmffInspector(parsedData);
                    structureContent = isobmffStructure(parsedData.data);
                }

                const hexContent = hexViewTemplate(
                    cachedSegment.data,
                    fullByteMap,
                    ALL_TOOLTIPS_DATA,
                    activeSegmentHighlightRange
                );

                content = inspectorLayoutTemplate({
                    inspectorContent,
                    structureContent,
                    hexContent,
                });

                if (!isViewInitialized) {
                    const findFn =
                        format === 'isobmff' ? findItemIsobmff : findItemTs;
                    setTimeout(() => {
                        initializeSegmentViewInteractivity(
                            { mainContent: container },
                            parsedData,
                            fullByteMap,
                            findFn,
                            format
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

    const handleCopyDebug = () => {
        if (!cachedSegment?.parsedData) {
            showToast({ message: 'No parsed data to copy.', type: 'warn' });
            return;
        }

        let rawSegmentBase64 = null;
        if (cachedSegment.data instanceof ArrayBuffer) {
            const bytes = new Uint8Array(cachedSegment.data);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            rawSegmentBase64 = btoa(binary);
        }

        const replacer = (key, value) => {
            if (typeof value === 'bigint') {
                return value.toString() + 'n';
            }
            if (value instanceof Uint8Array) {
                // Return a summary for Uint8Arrays inside the parsed structure,
                // as the full raw data is now provided separately.
                return `[Uint8Array of length ${value.length}]`;
            }
            if (value instanceof Map) {
                return Array.from(value.entries());
            }
            if (value instanceof Set) {
                return Array.from(value.values());
            }
            return value;
        };

        try {
            const debugObject = {
                parsedData: cachedSegment.parsedData,
                rawSegmentBase64: rawSegmentBase64,
            };
            const debugString = JSON.stringify(debugObject, replacer, 2);
            copyTextToClipboard(
                debugString,
                'Segment debug data copied to clipboard!'
            );
        } catch (e) {
            console.error('Failed to serialize segment debug data:', e);
            showToast({
                message: 'Failed to generate debug data.',
                type: 'fail',
            });
        }
    };

    const template = html`
        <div class="flex flex-col h-full gap-y-4">
            <div class="flex justify-between items-center shrink-0">
                <h3 class="text-xl font-bold text-white">Segment Inspector</h3>
                <div class="flex items-center gap-2">
                    <button
                        @click=${handleCopyDebug}
                        class="bg-yellow-600 hover:bg-yellow-700 text-black font-bold text-xs py-2 px-3 rounded-md transition-colors flex items-center gap-2"
                        title="Copy all parsed segment data to the clipboard as JSON for debugging."
                    >
                        ${icons.debug} Copy Debug Data
                    </button>
                    <button
                        @click=${() => uiActions.setActiveTab('explorer')}
                        class="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 text-sm flex items-center gap-2"
                    >
                        ${icons.arrowLeft} Back to Explorer
                    </button>
                </div>
            </div>
            <p
                class="text-sm text-slate-400 -mt-2 mb-2 font-mono break-all bg-slate-800/50 p-2 rounded"
            >
                ${(activeSegmentUrl || '').split('@')[0]}
            </p>
            <div class="grow min-h-0">${content}</div>
        </div>
    `;

    render(template, container);
}

export const interactiveSegmentView = {
    mount(containerElement, stream) {
        container = containerElement;
        isViewInitialized = false;
        fullByteMap = null;
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
        fullByteMap = null;

        cleanupSegmentViewInteractivity({ mainContent: container });
        if (container) {
            render(html``, container);
        }
        container = null;
    },
};
