import { html, render } from 'lit-html';
import { useUiStore } from '@/state/uiStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { dashManifestTemplate } from './components/dash/renderer.js';
import { hlsManifestTemplate } from './components/hls/renderer.js';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { isDebugMode } from '@/shared/utils/env';
import { generateMissingTooltipsReport } from '@/features/parserCoverage/domain/tooltip-coverage-analyzer';
import { eventBus } from '@/application/event-bus';
import { dashTooltipData } from './components/dash/tooltip-data.js';
import { hlsTooltipData } from './components/hls/tooltip-data.js';
import * as icons from '@/ui/icons';
import { shallow } from 'zustand/vanilla/shallow';

// Import sidebar component for its side-effects (registration)
import './components/sidebar.js';

let container = null;
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

    const target = /** @type {HTMLElement} */ (e.target);
    const token = /** @type {HTMLElement} */ (
        target.closest('.interactive-dash-token, .interactive-hls-token')
    );

    if (hoverDebounceTimeout) {
        clearTimeout(hoverDebounceTimeout);
    }

    if (e.type === 'mouseout') {
        const relatedTarget = /** @type {Node | null} */ (e.relatedTarget);
        if (!e.currentTarget.contains(relatedTarget)) {
            eventBus.dispatch('ui:interactive-manifest:item-unhovered');
        }
        return;
    }

    if (token) {
        const type = /** @type {'tag' | 'attribute'} */ (token.dataset.type);
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
            html`<p class="warn">No Manifest loaded to display.</p>`,
            container
        );
        return;
    }

    const {
        interactiveManifestShowSubstituted,
        interactiveManifestHoveredItem,
        interactiveManifestSelectedItem,
    } = useUiStore.getState();

    let activeManifest;
    let rawManifestStringForToggle;
    let activeUpdate;
    let playlistData;

    // ARCHITECTURAL FIX: Make HLS playlist selection explicit.
    if (
        stream.protocol === 'hls' &&
        stream.activeMediaPlaylistId &&
        stream.activeMediaPlaylistId !== 'master'
    ) {
        const mediaPlaylist = stream.mediaPlaylists.get(
            stream.activeMediaPlaylistId
        );
        if (!mediaPlaylist)
            return html`<div class="text-yellow-400 p-4">Loading...</div>`;
        
        activeUpdate = (mediaPlaylist.updates || []).find(
            (u) => u.id === mediaPlaylist.activeUpdateId
        );

        rawManifestStringForToggle =
            activeUpdate?.rawManifest || mediaPlaylist.rawManifest;
        activeManifest = activeUpdate
            ? {
                  ...mediaPlaylist.manifest,
                  serializedManifest: activeUpdate.serializedManifest,
              }
            : mediaPlaylist.manifest;
    } else {
        // DASH Logic or HLS Master Playlist
        activeUpdate = stream.manifestUpdates.find(
            (u) => u.id === stream.activeManifestUpdateId
        );
        rawManifestStringForToggle =
            activeUpdate?.rawManifest || stream.rawManifest;
        activeManifest = activeUpdate
            ? {
                  ...stream.manifest,
                  serializedManifest: activeUpdate.serializedManifest,
              }
            : stream.manifest;
    }

    if (!activeManifest) {
        render(
            html`<div class="text-yellow-400 p-4">Awaiting content...</div>`,
            container
        );
        return;
    }

    const handleCopyClick = () => {
        let manifestToCopy = rawManifestStringForToggle;
        copyTextToClipboard(manifestToCopy, 'Manifest copied to clipboard!');
    };

    const handleDebugCopy = () => {
        const report = generateMissingTooltipsReport(stream);
        const issueCount =
            report === 'No missing tooltips found.'
                ? 0
                : report.split('\n').length;
        const debugString = `--- MANIFEST ---\n${stream.rawManifest}\n\n--- MISSING TOOLTIPS (${issueCount}) ---\n${report}`;
        copyTextToClipboard(debugString, 'Debug report copied to clipboard!');
    };

    const headerTemplate = html`
        <div
            class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2"
        >
            <h3 class="text-xl text-white font-bold">Interactive Manifest</h3>
            <div class="flex items-center gap-2">
                <button
                    @click=${handleCopyClick}
                    class="bg-gray-600 hover:bg-gray-700 text-white font-bold text-xs py-2 px-3 rounded-md transition-colors flex items-center gap-2"
                >
                    ${icons.clipboardCopy} Copy Raw Manifest
                </button>
                ${isDebugMode
                    ? html`<button
                          @click=${handleDebugCopy}
                          class="bg-yellow-600 hover:bg-yellow-700 text-black font-bold text-xs py-2 px-3 rounded-md transition-colors flex items-center gap-2"
                      >
                          ${icons.debug} Copy Debug Report
                      </button>`
                    : ''}
            </div>
        </div>
    `;

    let contentTemplate;
    let missingTooltips = new Set();
    if (isDebugMode) {
        const report = generateMissingTooltipsReport(stream);
        if (report !== 'No missing tooltips found.') {
            missingTooltips = new Set(
                report.split('\n').map((line) => line.replace(/\[.*?\]\s*/, ''))
            );
        }
    }

    if (stream.protocol === 'hls') {
        contentTemplate = hlsManifestTemplate(
            stream,
            interactiveManifestShowSubstituted,
            interactiveManifestHoveredItem,
            interactiveManifestSelectedItem,
            missingTooltips
        );
    } else {
        contentTemplate = dashManifestTemplate(
            stream,
            interactiveManifestHoveredItem,
            interactiveManifestSelectedItem,
            missingTooltips
        );
    }

    render(html`${headerTemplate} ${contentTemplate}`, container);
}

export const interactiveManifestView = {
    hasContextualSidebar: true,

    mount(containerElement, { stream }) {
        container = containerElement;
        currentStreamId = stream.id;

        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();

        // --- ARCHITECTURAL FIX: Use correct vanilla Zustand subscribe pattern ---
        const selector = (state) => {
            const activeStream = state.streams.find(
                (s) => s.id === state.activeStreamId
            );
            if (!activeStream) return null;

            return {
                streamId: activeStream.id,
                activeManifestUpdateId: activeStream.activeManifestUpdateId,
                activeMediaPlaylistId: activeStream.activeMediaPlaylistId,
                activeMediaPlaylistUrl: activeStream.activeMediaPlaylistUrl,
                mediaPlaylistData: activeStream.mediaPlaylists.get(
                    activeStream.activeMediaPlaylistId || 'master'
                ),
            };
        };

        analysisUnsubscribe = useAnalysisStore.subscribe((newState, oldState) => {
            const newSelection = selector(newState);
            const oldSelection = selector(oldState);

            if (!shallow(newSelection, oldSelection)) {
                renderInteractiveManifest();
            }
        });
        // --- END FIX ---

        uiUnsubscribe = useUiStore.subscribe(renderInteractiveManifest);

        delegatedEventHandler = (e) => handleInteraction(e);

        container.addEventListener('mouseover', delegatedEventHandler);
        container.addEventListener('mouseout', delegatedEventHandler);
        container.addEventListener('click', delegatedEventHandler);

        const contextualSidebar = document.getElementById('contextual-sidebar');
        if (contextualSidebar) {
            render(
                html`<interactive-manifest-sidebar></interactive-manifest-sidebar>`,
                contextualSidebar
            );
        }

        renderInteractiveManifest();
    },
    unmount() {
        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();
        uiUnsubscribe = null;
        analysisUnsubscribe = null;

        if (hoverDebounceTimeout) clearTimeout(hoverDebounceTimeout);
        hoverDebounceTimeout = null;

        if (container && delegatedEventHandler) {
            container.removeEventListener('mouseover', delegatedEventHandler);
            container.removeEventListener('mouseout', delegatedEventHandler);
            container.removeEventListener('click', delegatedEventHandler);
        }
        delegatedEventHandler = null;

        if (container) render(html``, container);
        container = null;
        currentStreamId = null;

        const contextualSidebar = document.getElementById('contextual-sidebar');
        if (contextualSidebar) render(html``, contextualSidebar);
    },
};