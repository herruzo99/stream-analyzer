import { eventBus } from '@/application/event-bus';
import {
    findDashMissingTooltips,
    findHlsMissingTooltips,
} from '@/features/parserCoverage/domain/tooltip-coverage-analyzer';
import { useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { openModalWithContent } from '@/ui/services/modalService';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html, render } from 'lit-html';
import xmlFormatter from 'xml-formatter';
import { dashManifestTemplate, flattenManifest } from './components/dash/renderer.js';
import { dashTooltipData } from './components/dash/tooltip-data.js';
import { hlsManifestTemplate } from './components/hls/renderer.js';
import { hlsTooltipData } from './components/hls/tooltip-data.js';
import './components/sidebar.js';

let container = null;
let sidebarContainer = null;
let currentStreamId = null;
let uiUnsubscribe = null;
let analysisUnsubscribe = null;
let delegatedEventHandler = null;
let hoverDebounceTimeout = null;

// Helper to scroll virtual list
function scrollListToIndex(index) {
    const virtualList = document.getElementById('manifest-virtual-list');
    
    // Cast to any to access custom element properties
    const listComponent = /** @type {any} */ (virtualList);
    
    // Check if the container property exists on the component instance
    if (listComponent && listComponent.container) {
        // Row height is fixed at 24px in the renderers
        const rowHeight = 24;
        listComponent.scrollTop = index * rowHeight - listComponent.clientHeight / 2;
    }
}

function handleInteraction(e) {
    const stream = useAnalysisStore
        .getState()
        .streams.find(
            (s) => s.id === useAnalysisStore.getState().activeStreamId
        );
    if (!stream) return;
    const target = e.target;
    const token = target.closest('[data-type]');

    if (hoverDebounceTimeout) clearTimeout(hoverDebounceTimeout);

    if (e.type === 'mouseout') {
        const relatedTarget = e.relatedTarget;
        if (!e.currentTarget.contains(relatedTarget)) {
            eventBus.dispatch('ui:interactive-manifest:item-unhovered');
        }
        return;
    }

    if (token) {
        const type = token.dataset.type;
        const name = token.dataset.name;
        const path = token.dataset.path;
        const tooltipData =
            stream.protocol === 'dash' ? dashTooltipData : hlsTooltipData;
        const info = tooltipData[name] || {
            text: `No definition found for "${name}".`,
            isoRef: 'N/A',
        };
        const item = { type, name, info, path };

        if (e.type === 'mouseover') {
            hoverDebounceTimeout = setTimeout(() => {
                eventBus.dispatch('ui:interactive-manifest:item-hovered', {
                    item,
                });
            }, 30);
        } else if (e.type === 'click') {
            eventBus.dispatch('ui:interactive-manifest:item-clicked', { item });
            document.body.classList.add('contextual-sidebar-open');
        }
    }
}

function calculateMatches(manifestObject, manifestString, protocol, searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return [];

    const lowerTerm = searchTerm.toLowerCase();
    const indices = [];

    if (protocol === 'dash' && manifestObject) {
        const lines = [];
        flattenManifest(manifestObject, 'MPD', 0, lines);
        
        lines.forEach((line, index) => {
            const content = [
                line.tagName, 
                line.content, 
                ...Object.keys(line.attributes || {}), 
                ...Object.values(line.attributes || {})
            ].join(' ').toLowerCase();

            if (content.includes(lowerTerm)) {
                indices.push(index);
            }
        });
    } else {
        const lines = (manifestString || '').split(/\r?\n/);
        lines.forEach((line, index) => {
            if (line.toLowerCase().includes(lowerTerm)) {
                indices.push(index);
            }
        });
    }
    return indices;
}

function renderInteractiveManifest() {
    if (!container || currentStreamId === null) return;

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === currentStreamId);
    if (!stream || !stream.manifest) {
        render(
            html`<p class="text-slate-500 p-4">No Manifest loaded.</p>`,
            container
        );
        if (sidebarContainer) render(html``, sidebarContainer);
        return;
    }

    const {
        interactiveManifestShowSubstituted,
        interactiveManifestHoveredItem,
        interactiveManifestSelectedItem,
        manifestSearch,
    } = useUiStore.getState();

    let manifestToRender = null;
    let stringToRender = null;
    let diffData = null;
    let targetSerializedForAnalysis = stream.manifest.serializedManifest;

    // --- State Resolution ---
    if (
        stream.protocol === 'hls' &&
        stream.activeMediaPlaylistId &&
        stream.activeMediaPlaylistId !== 'master'
    ) {
        const mediaPlaylist = stream.mediaPlaylists.get(
            stream.activeMediaPlaylistId
        );
        if (!mediaPlaylist) return;
        stringToRender = mediaPlaylist.rawManifest;
        if (
            interactiveManifestShowSubstituted &&
            mediaPlaylist.manifest?.serializedManifest?.substitutedRaw
        ) {
            stringToRender =
                mediaPlaylist.manifest.serializedManifest.substitutedRaw;
        }
        if (mediaPlaylist.manifest) {
            targetSerializedForAnalysis =
                mediaPlaylist.manifest.serializedManifest;
        }
    } else {
        stringToRender = stream.rawManifest;
        manifestToRender = stream.manifest.serializedManifest;
        if (stream.patchedRawManifest) {
            stringToRender = stream.patchedRawManifest;
            manifestToRender = stream.manifest.serializedManifest;
        }

        if (stream.protocol === 'dash' && stringToRender) {
            const lines = stringToRender.split('\n').length;
            if (lines < 10 && stringToRender.length > 200) {
                try {
                    stringToRender = xmlFormatter(stringToRender, {
                        indentation: '  ',
                        collapseContent: true,
                        lineSeparator: '\n',
                    });
                } catch (e) {
                    console.warn('Failed to auto-format XML:', e);
                }
            }
        }
    }

    // --- Search Logic ---
    if (manifestSearch.term && manifestSearch.term.length >= 2) {
        const matches = calculateMatches(manifestToRender, stringToRender, stream.protocol, manifestSearch.term);
        
        if (matches.length !== manifestSearch.matchIndices.length || matches[0] !== manifestSearch.matchIndices[0]) {
             setTimeout(() => uiActions.setManifestSearchMatches(matches), 0);
        }
    } else if (manifestSearch.matchIndices.length > 0) {
         setTimeout(() => uiActions.setManifestSearchMatches([]), 0);
    }

    if (manifestSearch.currentResultIndex !== -1 && manifestSearch.matchIndices.length > 0) {
        const lineIndex = manifestSearch.matchIndices[manifestSearch.currentResultIndex];
        requestAnimationFrame(() => scrollListToIndex(lineIndex));
    }


    const handlePatcher = () => {
        openModalWithContent({
            title: 'Manifest Patcher',
            url: stream.originalUrl,
            content: { type: 'manifestPatcher', data: { streamId: stream.id } },
            isFullWidth: true,
        });
    };

    const handleTimingCalculator = () => {
        eventBus.dispatch(EVENTS.UI.SHOW_DASH_TIMING_CALCULATOR, {
            streamId: stream.id,
        });
    };

    const handleDownloadDebug = () => {
        let missingItems = [];
        if (stream.protocol === 'dash') {
            missingItems = findDashMissingTooltips(targetSerializedForAnalysis);
        } else if (stream.protocol === 'hls') {
            missingItems = findHlsMissingTooltips(targetSerializedForAnalysis);
        }
        const reportText =
            missingItems.length > 0
                ? missingItems.map((m) => `[${m.type}] ${m.name}`).join('\n')
                : 'No missing tooltip definitions found.';
        const content = `--- MANIFEST CONTENT (${stream.name}) ---\n\n${stringToRender}\n\n--- MISSING TOOLTIP DEFINITIONS REPORT ---\nGenerated: ${new Date().toISOString()}\nProtocol: ${stream.protocol.toUpperCase()}\nContext: ${stream.activeMediaPlaylistId || 'Main'}\n\n${reportText}\n`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${stream.name.replace(/[^a-z0-9]/gi, '_')}_debug_report.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const searchBar = html`
        <div class="flex items-center bg-slate-800 rounded-md border border-slate-700 p-0.5 mx-2 min-w-[240px]">
            <div class="pl-2 text-slate-500">${icons.search}</div>
            <input 
                type="text" 
                class="bg-transparent border-none text-xs text-white focus:ring-0 h-7 w-24 sm:w-32 placeholder-slate-500"
                placeholder="Find..."
                .value=${manifestSearch.term}
                @input=${(e) => uiActions.setManifestSearchTerm(e.target.value)}
                @keydown=${(e) => {
                    if (e.key === 'Enter') {
                        if (e.shiftKey) uiActions.prevManifestSearchResult();
                        else uiActions.nextManifestSearchResult();
                    }
                }}
            />
            ${manifestSearch.matchIndices.length > 0 ? html`
                <span class="text-[10px] text-slate-500 font-mono whitespace-nowrap px-1">
                    ${manifestSearch.currentResultIndex + 1}/${manifestSearch.matchIndices.length}
                </span>
                <div class="flex border-l border-slate-700 ml-1 pl-1">
                    <button @click=${() => uiActions.prevManifestSearchResult()} class="p-1 hover:text-white text-slate-400 hover:bg-slate-700 rounded">${icons.chevronUp}</button>
                    <button @click=${() => uiActions.nextManifestSearchResult()} class="p-1 hover:text-white text-slate-400 hover:bg-slate-700 rounded">${icons.chevronDown}</button>
                </div>
            ` : ''}
             ${manifestSearch.term ? html`
                <button @click=${() => uiActions.setManifestSearchTerm('')} class="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded ml-1">${icons.xCircle}</button>
            ` : ''}
        </div>
    `;

    const toolbar = html`
        <div
            class="h-12 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 shrink-0 z-10 relative"
        >
            <div class="flex items-center gap-2 text-sm text-slate-400">
                <span
                    class="font-bold text-slate-200 truncate max-w-[150px] sm:max-w-[200px]"
                    title="${stream.name}"
                    >${stream.name}</span
                >
                <span class="hidden sm:inline">•</span>
                <span
                    class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono hidden sm:inline"
                    >${stream.protocol.toUpperCase()}</span
                >
            </div>

            <div class="flex items-center gap-2">
                ${searchBar}

                <div class="hidden md:flex items-center gap-2">
                    ${stream.protocol === 'dash'
                        ? html`
                              <button
                                  @click=${handleTimingCalculator}
                                  class="text-xs bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-2 border border-blue-500/20"
                              >
                                  ${icons.calculator} Calc
                              </button>
                          `
                        : ''}
                    <button
                        @click=${handleDownloadDebug}
                        class="text-xs text-slate-500 hover:text-yellow-400 px-3 py-1.5 rounded-md border border-transparent hover:border-slate-700 transition-colors flex items-center gap-2"
                        title="Download Manifest & Debug Report"
                    >
                        ${icons.download} Report
                    </button>
                    <button
                        @click=${handlePatcher}
                        class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-2 shadow-sm"
                    >
                        ${icons.code} Patcher
                    </button>
                    <button
                        @click=${() =>
                            copyTextToClipboard(stringToRender, 'Copied!')}
                        class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md border border-slate-700 transition-colors flex items-center gap-2"
                    >
                        ${icons.clipboardCopy} Copy
                    </button>
                </div>
            </div>
        </div>
    `;

    // Prepare Highlight Props
    const searchMatchLineIndex = (manifestSearch.matchIndices.length > 0 && manifestSearch.currentResultIndex !== -1)
        ? manifestSearch.matchIndices[manifestSearch.currentResultIndex] 
        : -1;
    const allMatchIndices = new Set(manifestSearch.matchIndices);

    let codeView;
    if (stream.protocol === 'hls') {
        codeView = hlsManifestTemplate(
            stream,
            stringToRender,
            interactiveManifestHoveredItem,
            interactiveManifestSelectedItem,
            new Set(),
            diffData,
            searchMatchLineIndex,
            allMatchIndices
        );
    } else {
        codeView = dashManifestTemplate(
            manifestToRender,
            interactiveManifestHoveredItem,
            interactiveManifestSelectedItem,
            new Set(),
            diffData,
            searchMatchLineIndex,
            allMatchIndices
        );
    }

    const template = html`
        <div class="flex flex-col h-full min-w-0 bg-slate-900 relative">
            ${toolbar}
            <div
                class="grow relative overflow-hidden bg-slate-900"
                id="manifest-code-container"
            >
                ${codeView}
            </div>
        </div>
    `;

    render(template, container);

    if (sidebarContainer) {
        render(
            html`<interactive-manifest-sidebar></interactive-manifest-sidebar>`,
            sidebarContainer
        );
    }
}

export const interactiveManifestView = {
    hasContextualSidebar: true,

    mount(containerElement, { stream }) {
        container = containerElement;
        sidebarContainer = document.getElementById('contextual-sidebar');
        currentStreamId = stream.id;
        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();
        uiUnsubscribe = useUiStore.subscribe(renderInteractiveManifest);
        analysisUnsubscribe = useAnalysisStore.subscribe(
            renderInteractiveManifest
        );

        delegatedEventHandler = (e) => handleInteraction(e);
        container.addEventListener('mouseover', delegatedEventHandler);
        container.addEventListener('mouseout', delegatedEventHandler);
        container.addEventListener('click', delegatedEventHandler);

        renderInteractiveManifest();
    },
    unmount() {
        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();
        uiUnsubscribe = null;
        analysisUnsubscribe = null;
        if (container && delegatedEventHandler) {
            container.removeEventListener('mouseover', delegatedEventHandler);
            container.removeEventListener('mouseout', delegatedEventHandler);
            container.removeEventListener('click', delegatedEventHandler);
        }
        if (container) render(html``, container);
        if (sidebarContainer) render(html``, sidebarContainer);
        container = null;
        sidebarContainer = null;
    },
};