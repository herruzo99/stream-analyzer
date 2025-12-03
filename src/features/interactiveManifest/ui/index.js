import { eventBus } from '@/application/event-bus';
import {
    findDashMissingTooltips,
    findHlsMissingTooltips,
} from '@/features/parserCoverage/domain/tooltip-coverage-analyzer';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { openModalWithContent } from '@/ui/services/modalService';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html, render } from 'lit-html';
import xmlFormatter from 'xml-formatter';
import { dashManifestTemplate } from './components/dash/renderer.js';
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
    } = useUiStore.getState();

    let manifestToRender = null;
    let stringToRender = null;
    let diffData = null;
    let targetSerializedForAnalysis = stream.manifest.serializedManifest;

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

        // --- FIX: Auto-format DASH XML if unformatted ---
        if (stream.protocol === 'dash' && stringToRender) {
            const lines = stringToRender.split('\n').length;
            // If few lines but long content, it's likely minified XML
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

    const toolbar = html`
        <div
            class="h-12 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 shrink-0 z-10 relative"
        >
            <div class="flex items-center gap-2 text-sm text-slate-400">
                <span
                    class="font-bold text-slate-200 truncate max-w-[200px]"
                    title="${stream.name}"
                    >${stream.name}</span
                >
                <span>•</span>
                <span
                    class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono"
                    >${stream.protocol.toUpperCase()}</span
                >
            </div>
            <div class="flex items-center gap-2">
                ${stream.protocol === 'dash'
                    ? html`
                          <button
                              @click=${handleTimingCalculator}
                              class="text-xs bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-2 border border-blue-500/20"
                          >
                              ${icons.calculator} Timing Calc
                          </button>
                      `
                    : ''}
                <button
                    @click=${handleDownloadDebug}
                    class="text-xs text-slate-500 hover:text-yellow-400 px-3 py-1.5 rounded-md border border-transparent hover:border-slate-700 transition-colors flex items-center gap-2"
                    title="Download Manifest & Debug Report"
                >
                    ${icons.download} Debug Report
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
                    ${icons.clipboardCopy} Copy Raw
                </button>
            </div>
        </div>
    `;

    let codeView;
    if (stream.protocol === 'hls') {
        codeView = hlsManifestTemplate(
            stream,
            stringToRender,
            interactiveManifestHoveredItem,
            interactiveManifestSelectedItem,
            new Set(),
            diffData
        );
    } else {
        codeView = dashManifestTemplate(
            manifestToRender,
            interactiveManifestHoveredItem,
            interactiveManifestSelectedItem,
            new Set(),
            diffData
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
