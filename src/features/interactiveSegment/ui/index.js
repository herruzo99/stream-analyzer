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

    const { activeSegmentUrl, isByteMapLoading } = useUiStore.getState();
    const { get: getFromCache, set: setInCache } =
        useSegmentCacheStore.getState();

    if (!activeSegmentUrl) {
        render(html``, container);
        return;
    }

    const cachedSegment = getFromCache(activeSegmentUrl);

    let content;

    if (!cachedSegment || cachedSegment.status === -1) {
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
                    ALL_TOOLTIPS_DATA
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

    const template = html`
        <div class="flex flex-col h-full gap-y-4">
            <div class="flex justify-between items-center shrink-0">
                <h3 class="text-xl font-bold text-white">Segment Inspector</h3>
                <button
                    @click=${() => uiActions.setActiveTab('explorer')}
                    class="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 text-sm flex items-center gap-2"
                >
                    ${icons.arrowLeft} Back to Explorer
                </button>
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
