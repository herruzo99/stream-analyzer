import { getParsedSegment } from '@/infrastructure/segments/segmentService.js';
import { workerService } from '@/infrastructure/worker/workerService';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { hexViewTemplate } from './components/hex-view.js';
import { inspectorPanelTemplate } from './components/inspector-panel.js';
import {
    cleanupSegmentViewInteractivity,
    initializeSegmentViewInteractivity,
} from './components/interaction-logic.js';
import { structureContentTemplate as isoStructureTemplate } from './components/structure-tree.js';
import {
    inspectorPanelTemplate as tsInspectorTemplate,
    structureContentTemplate as tsStructureTemplate,
} from './components/ts/index.js';

class InteractiveSegmentView {
    // Port note: was `extends BaseView` (never committed). Plain class
    // with inlined mount/unmount/subscribe (no shell slots in 1.2.0).
    constructor() {
        this._unsubs = [];
        this.container = null;
        this.stream = null;
        this.fullByteMap = null;
        this._mounted = false;
        this.viewState = {
            lastRenderedSegmentUrl: null,
            lastRenderedEntryReference: null,
            lastRenderedSelectedItem: null,
        };
    }

    subscribe(store, listener) {
        const unsubscribe = store.subscribe(listener);
        this._unsubs.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * @param {HTMLElement} containerElement
     * @param {{ stream?: any }} [args]
     */
    mount(containerElement, { stream } = {}) {
        this.container = containerElement;
        this.stream = stream || null;
        this._mounted = true;
        this.onMount();
    }

    unmount() {
        this.onUnmount();
        for (const unsubscribe of this._unsubs.splice(0)) {
            try {
                unsubscribe();
            } catch {
                /* ignore late unsubscribe errors */
            }
        }
        if (this.container) render(html``, this.container);
        this.container = null;
        this.stream = null;
        this._mounted = false;
    }

    onMount() {
        // Subscribe to stores
        this.subscribe(useUiStore, (state, prevState) => {
            const urlChanged = state.activeSegmentUrl !== prevState?.activeSegmentUrl;
            const selectionChanged = state.interactiveSegmentSelectedItem !== prevState?.interactiveSegmentSelectedItem;
            const loadingChanged = state.isByteMapLoading !== prevState?.isByteMapLoading;
            const themeChanged = state.activeThemeId !== prevState?.activeThemeId; // React to theme changes

            if (urlChanged || selectionChanged || loadingChanged || themeChanged) {
                this.render();
            }
        });

        this.subscribe(useSegmentCacheStore, () => this.render());

        // Ensure the contextual sidebar (Inspector) is open
        uiActions.setActiveSidebar('contextual');

        // Initialize view
        this.render();
    }

    onUnmount() {
        cleanupSegmentViewInteractivity({ mainContent: this.container });
        this.fullByteMap = null;
        this.viewState = {
            lastRenderedSegmentUrl: null,
            lastRenderedEntryReference: null,
            lastRenderedSelectedItem: null,
        };
    }

    render() {
        if (!this.container) return;

        const {
            activeSegmentUrl,
            isByteMapLoading,
            activeSegmentIsIFrame,
            interactiveSegmentSelectedItem
        } = useUiStore.getState();
        const { get } = useSegmentCacheStore.getState();
        const isSolid = true; // Port: no themes in 1.2.0; solid styling.

        // 1. Reset local state if URL changes
        if (activeSegmentUrl !== this.viewState.lastRenderedSegmentUrl) {
            this.fullByteMap = null;
            this.viewState.lastRenderedSegmentUrl = activeSegmentUrl;
            this.viewState.lastRenderedEntryReference = null;
            this.viewState.lastRenderedSelectedItem = null;
        }

        // --- EMPTY STATE ---
        if (!activeSegmentUrl) {
            this._clearSlots();
            render(
                html`
                <div class="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-900 relative overflow-hidden">
                    <div class="p-8 bg-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-lg text-center z-10 max-w-md ring-1 ring-white/5">
                        <div class="text-blue-400 mb-4 scale-150 drop-shadow-[0_0_10px_#3b82f6]">
                            ${icons.searchCode}
                        </div>
                        <p class="text-lg font-bold text-slate-100 mb-2">No Segment Selected</p>
                        <p class="text-sm text-slate-400 mb-6">Select a segment from the timeline to inspect its internal structure.</p>
                        <button @click=${() => uiActions.setActiveTab('explorer')} class="px-4 py-2 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-blue-400 border border-[#3b82f6]/30 rounded-lg text-sm font-bold uppercase tracking-wider transition-all hover:shadow-[0_0_15px_#3b82f6]">
                            Go to Segment Explorer
                        </button>
                    </div>
                </div>
                `,
                this.container
            );
            return;
        }

        const cachedEntry = get(activeSegmentUrl);

        // 2. Selective Render Check
        if (
            cachedEntry === this.viewState.lastRenderedEntryReference &&
            interactiveSegmentSelectedItem === this.viewState.lastRenderedSelectedItem &&
            !isByteMapLoading &&
            this.fullByteMap
        ) {
            return;
        }

        this.viewState.lastRenderedEntryReference = cachedEntry;
        this.viewState.lastRenderedSelectedItem = interactiveSegmentSelectedItem;

        // --- LOADING STATE ---
        if (!cachedEntry || cachedEntry.status === -1) {
            this._clearSlots();
            render(this._loadingTemplate('Fetching & Parsing...'), this.container);
            if (!cachedEntry) {
                getParsedSegment(activeSegmentUrl, null, null, { isIFrame: activeSegmentIsIFrame }).catch(console.error);
            }
            return;
        }

        // --- ERROR STATE ---
        if (cachedEntry.status >= 400 || !cachedEntry.data) {
            this._clearSlots();
            render(this._errorTemplate(`HTTP ${cachedEntry.status}`), this.container);
            return;
        }

        // --- PROCESSING STATE ---
        if (isByteMapLoading) {
            this._clearSlots();
            render(this._loadingTemplate('Optimizing Bitstream View...'), this.container);
            return;
        }

        const { parsedData, data: rawBuffer } = cachedEntry;
        const format = parsedData?.format;

        // Trigger Worker if needed
        if (!this.fullByteMap && (format === 'isobmff' || format === 'ts')) {
            uiActions.setIsByteMapLoading(true);
            render(this._loadingTemplate('Optimizing Bitstream View...'), this.container);

            requestAnimationFrame(() => {
                workerService.postTask('full-segment-analysis', { parsedData, rawData: rawBuffer })
                    .promise.then(({ byteMap }) => {
                        this.fullByteMap = byteMap;
                        uiActions.setIsByteMapLoading(false);
                        this.viewState.lastRenderedEntryReference = null; // Force re-render
                        this.render();
                    })
                    .catch((e) => {
                        console.error('Optimization failed:', e);
                        uiActions.setIsByteMapLoading(false);
                    });
            });
            return;
        }

        // --- ACTIVE CONTENT ---

        // 1. Top Bar (Header)
        const fileName = activeSegmentUrl.split('/').pop().split('?')[0];
        const header = html`
            <div class="flex items-center gap-4 h-full">
                <button
                    @click=${() => uiActions.setActiveTab('explorer')}
                    class="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800/80 text-slate-400 hover:text-blue-400 border border-slate-800 hover:border-[#3b82f6]/50 transition-all duration-300 group shadow-sm hover:shadow-[0_0_15px_#3b82f6]"
                >
                    <span class="group-hover:-translate-x-0.5 transition-transform duration-300">${icons.arrowLeft}</span>
                    Back to Explorer
                </button>
                <div class="h-4 w-px bg-slate-800"></div>
                <div class="flex items-center gap-2 text-sm">
                    <span class="text-blue-400 scale-90 drop-shadow-[0_0_8px_#3b82f6]">${icons.fileText}</span>
                    <span class="font-mono text-slate-100 font-bold truncate max-w-[400px] tracking-tight" title="${fileName}">
                        ${fileName}
                    </span>
                </div>
            </div>
        `;
        // (1.2.0 has no shell slots: header composes into the template below)

        // Generate Content based on format
        let structureContent, inspectorContent, hexContent;

        if (format === 'isobmff') {
            structureContent = isoStructureTemplate(parsedData.data);
            inspectorContent = inspectorPanelTemplate(parsedData);
            hexContent = hexViewTemplate(rawBuffer, this.fullByteMap);
        } else if (format === 'ts') {
            structureContent = tsStructureTemplate(parsedData);
            inspectorContent = tsInspectorTemplate(parsedData);
            hexContent = hexViewTemplate(rawBuffer, this.fullByteMap);
        } else if (format === 'vtt' || format === 'ttml') {
            structureContent = html`
                <div class="p-6 text-center text-slate-400 text-xs italic bg-slate-800/30 h-full flex flex-col items-center justify-center">
                    <div class="mb-2 scale-150 opacity-50 text-blue-400">${icons.fileText}</div>
                    <p>Text-based format (${format.toUpperCase()})</p>
                    <p class="mt-1 opacity-70">Structure tree not available.</p>
                </div>
            `;
            inspectorContent = inspectorPanelTemplate(parsedData);
            hexContent = hexViewTemplate(rawBuffer, null);
        } else {
            // Unsupported
            this._clearSlots();
            render(html`<div class="p-10 text-center">Visualizer not available for: ${format}</div>`, this.container);
            return;
        }

        // 2. Sub Nav (Structure Tree)
        // Wrapped in layout-card if Solid, or just cleaner container
        const subNavWrapper = html`
            <div class="h-full w-full flex flex-col ${isSolid ? 'bg-slate-800 border-r border-slate-800' : ''}">
                <div class="px-4 py-2 text-xs font-black uppercase text-slate-400 tracking-widest shrink-0">Structure</div>
                <div class="grow overflow-y-auto custom-scrollbar">
                    ${structureContent}
                </div>
            </div>
        `;
        // (subNav composes in-container below)

        // 3. Right Sidebar (Inspector)
        const sidebarWrapper = html`
            <div class="h-full w-full flex flex-col ${isSolid ? 'bg-slate-800 border-l border-slate-800' : ''}">
                 <div class="px-4 py-2 text-xs font-black uppercase text-slate-400 tracking-widest shrink-0 border-b border-slate-800/10">Inspector</div>
                 <div class="grow overflow-y-auto custom-scrollbar">
                    ${inspectorContent}
                 </div>
            </div>
        `;
        // (sidebar composes in-container below)

        // 4. Main Content (Hex View) with header, structure + inspector
        // columns composed in-container (no shell slots in 1.2.0).
        render(
            html`
            <div class="flex flex-col h-full w-full overflow-hidden">
                <div class="shrink-0 px-2 pt-2">${header}</div>
                <div class="grow min-h-0 flex overflow-hidden">
                    <div
                        class="w-72 shrink-0 overflow-hidden hidden lg:block"
                    >
                        ${subNavWrapper}
                    </div>
                    <div
                        class="grow min-h-0 overflow-hidden relative bg-slate-900 shadow-inner flex flex-col"
                    >
                        ${hexContent}
                    </div>
                    <div
                        class="w-80 shrink-0 overflow-hidden hidden xl:block"
                    >
                        ${sidebarWrapper}
                    </div>
                </div>
            </div>
        `,
            this.container
        );

        // Activate Interactivity
        setTimeout(() => {
            initializeSegmentViewInteractivity(
                { mainContent: this.container }, // Pass main container for event delegation
                parsedData,
                this.fullByteMap,
                null,
                format
            );
        }, 0);
    }

    _clearSlots() {
        // Port: no shell slots in 1.2.0; clear the contextual sidebar.
        // Container callers render their own state right after this.
        const sidebarContainer =
            document.getElementById('contextual-sidebar');
        if (sidebarContainer) render(html``, sidebarContainer);
    }

    _loadingTemplate(message) {
        return html`
            <div class="flex flex-col items-center justify-center h-full w-full text-slate-400 bg-slate-900 gap-4 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-[#3b82f6]/10 rounded-full blur-[120px] animate-pulse-slow mix-blend-screen"></div>
                </div>
                <div class="relative z-10 flex flex-col items-center gap-6">
                    <div class="relative">
                        <div class="w-20 h-20 border-4 border-slate-800/30 border-t-[#3b82f6] rounded-full animate-spin shadow-[0_0_30px_#3b82f6]"></div>
                        <div class="absolute inset-0 flex items-center justify-center text-blue-400 drop-shadow-[0_0_10px_#3b82f6]">${icons.binary}</div>
                    </div>
                    <p class="text-sm font-bold uppercase tracking-widest animate-pulse text-blue-400">${message}</p>
                </div>
            </div>
        `;
    }

    _errorTemplate(msg) {
        return html`
             <div class="flex flex-col items-center justify-center h-full w-full text-red-400 bg-slate-900 gap-6 relative overflow-hidden">
                <div class="p-6 bg-slate-800/40 backdrop-blur-xl rounded-full ring-1 ring-red-500/30 shadow-[0_0_40px_#ef4444/20] z-10 relative group">
                    ${icons.alertTriangle}
                </div>
                <div class="text-center z-10 space-y-2">
                    <p class="font-black text-xl tracking-tight text-slate-200">Failed to load segment</p>
                    <p class="text-sm text-red-400/80 max-w-md font-mono bg-slate-800/50 px-4 py-2 rounded border border-red-500/20">${msg}</p>
                </div>
            </div>
        `;
    }
}

export const interactiveSegmentView = new InteractiveSegmentView();
