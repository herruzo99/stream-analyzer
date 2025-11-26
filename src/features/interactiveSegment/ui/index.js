import { html, render } from 'lit-html';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { workerService } from '@/infrastructure/worker/workerService';
import { inspectorLayoutTemplate } from './components/shared/inspector-layout.js';
import { hexViewTemplate } from './components/hex-view.js';
import { structureContentTemplate as isoStructureTemplate } from './components/structure-tree.js';
import {
    structureContentTemplate as tsStructureTemplate,
    inspectorPanelTemplate as tsInspectorTemplate,
} from './components/ts/index.js';
import { inspectorPanelTemplate } from './components/inspector-panel.js';
import {
    initializeSegmentViewInteractivity,
    cleanupSegmentViewInteractivity,
} from './components/interaction-logic.js';
import { getParsedSegment } from '@/infrastructure/segments/segmentService.js';
import * as icons from '@/ui/icons';

let container = null;
let uiUnsubscribe = null;
let cacheUnsubscribe = null;
let fullByteMap = null;

const loadingSkeleton = (message) => html`
    <div
        class="flex flex-col items-center justify-center h-full w-full text-slate-500 bg-slate-950 gap-4"
    >
        <div class="relative">
            <div
                class="w-16 h-16 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin"
            ></div>
            <div
                class="absolute inset-0 flex items-center justify-center text-blue-500"
            >
                ${icons.binary}
            </div>
        </div>
        <p class="text-sm font-medium animate-pulse">${message}</p>
    </div>
`;

const errorState = (msg) => html`
    <div
        class="flex flex-col items-center justify-center h-full w-full text-red-400 bg-slate-950 gap-4"
    >
        <div class="p-4 bg-red-900/10 rounded-full ring-1 ring-red-500/20">
            ${icons.alertTriangle}
        </div>
        <p class="font-bold">Failed to load segment</p>
        <p class="text-sm text-red-400/70 max-w-md text-center">${msg}</p>
    </div>
`;

const backToolbar = (segmentUrl) => {
    const fileName = segmentUrl
        ? segmentUrl.split('/').pop().split('?')[0]
        : 'Segment';

    return html`
        <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-4">
                <button
                    @click=${() => uiActions.setActiveTab('explorer')}
                    class="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all group"
                >
                    <span
                        class="group-hover:-translate-x-0.5 transition-transform"
                        >${icons.arrowLeft}</span
                    >
                    Back to Explorer
                </button>

                <div class="h-4 w-px bg-slate-800"></div>

                <div class="flex items-center gap-2 text-sm">
                    <span class="text-slate-500 scale-90"
                        >${icons.fileText}</span
                    >
                    <span
                        class="font-mono text-slate-200 font-semibold truncate max-w-[300px]"
                        title="${fileName}"
                    >
                        ${fileName}
                    </span>
                </div>
            </div>
        </div>
    `;
};

function renderView() {
    if (!container) return;

    const {
        activeSegmentUrl,
        isByteMapLoading,
        activeSegmentHighlightRange,
        activeSegmentIsIFrame,
    } = useUiStore.getState();
    const { get } = useSegmentCacheStore.getState();

    if (!activeSegmentUrl) {
        render(
            html`
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-600 gap-4"
                >
                    <p>No segment selected.</p>
                    <button
                        @click=${() => uiActions.setActiveTab('explorer')}
                        class="text-blue-400 hover:underline text-sm"
                    >
                        Go to Segment Explorer
                    </button>
                </div>
            `,
            container
        );
        return;
    }

    const cachedEntry = get(activeSegmentUrl);

    if (!cachedEntry || cachedEntry.status === -1) {
        render(loadingSkeleton('Fetching & Parsing...'), container);
        if (!cachedEntry) {
            getParsedSegment(activeSegmentUrl, null, null, {
                isIFrame: activeSegmentIsIFrame,
            }).catch((e) => console.error(e));
        }
        return;
    }

    if (cachedEntry.status >= 400 || !cachedEntry.data) {
        render(errorState(`HTTP ${cachedEntry.status}`), container);
        return;
    }

    if (isByteMapLoading) {
        render(loadingSkeleton('Optimizing Bitstream View...'), container);
        return;
    }

    const { parsedData, data: rawBuffer } = cachedEntry;
    const format = parsedData?.format;

    if (!fullByteMap && (format === 'isobmff' || format === 'ts')) {
        uiActions.setIsByteMapLoading(true);
        render(loadingSkeleton('Optimizing Bitstream View...'), container);

        requestAnimationFrame(() => {
            workerService
                .postTask('full-segment-analysis', {
                    parsedData,
                    rawData: rawBuffer,
                })
                .promise.then(({ byteMap }) => {
                    fullByteMap = byteMap;
                    uiActions.setIsByteMapLoading(false);
                })
                .catch((e) => {
                    console.error('Optimization failed:', e);
                    uiActions.setIsByteMapLoading(false);
                });
        });
        return;
    }

    let structureHTML, inspectorHTML, hexHTML;

    if (format === 'isobmff') {
        structureHTML = isoStructureTemplate(parsedData.data);
        inspectorHTML = inspectorPanelTemplate(parsedData);
        hexHTML = hexViewTemplate(rawBuffer, fullByteMap);
        setTimeout(() => {
            initializeSegmentViewInteractivity(
                { mainContent: container },
                parsedData,
                fullByteMap,
                null,
                format
            );
        }, 0);
    } else if (format === 'ts') {
        structureHTML = tsStructureTemplate(parsedData);
        // Use TS-specific inspector template
        inspectorHTML = tsInspectorTemplate(parsedData);
        hexHTML = hexViewTemplate(rawBuffer, fullByteMap);
        setTimeout(() => {
            initializeSegmentViewInteractivity(
                { mainContent: container },
                parsedData,
                fullByteMap,
                null,
                format
            );
        }, 0);
    } else {
        render(
            html`<div class="p-10 text-center text-slate-500">
                Visualizer not available for format: ${format}
            </div>`,
            container
        );
        return;
    }

    render(
        inspectorLayoutTemplate({
            structureContent: structureHTML,
            inspectorContent: inspectorHTML,
            hexContent: hexHTML,
            toolbar: backToolbar(activeSegmentUrl),
        }),
        container
    );
}

export const interactiveSegmentView = {
    mount(el) {
        container = el;
        fullByteMap = null;
        if (uiUnsubscribe) uiUnsubscribe();
        if (cacheUnsubscribe) cacheUnsubscribe();
        uiUnsubscribe = useUiStore.subscribe(renderView);
        cacheUnsubscribe = useSegmentCacheStore.subscribe(renderView);
        renderView();
    },
    unmount() {
        if (uiUnsubscribe) uiUnsubscribe();
        if (cacheUnsubscribe) cacheUnsubscribe();
        uiUnsubscribe = null;
        cacheUnsubscribe = null;
        if (container) render(html``, container);

        setTimeout(() => {
            cleanupSegmentViewInteractivity({ mainContent: container });
            fullByteMap = null;
            container = null;
        }, 0);
    },
};
