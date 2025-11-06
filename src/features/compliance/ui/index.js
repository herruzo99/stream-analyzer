import { html, render } from 'lit-html';
import { manifestViewTemplate } from './components/renderer.js';
import { sidebarTemplate } from './components/sidebar.js';
import { navigationTemplate } from './components/navigation.js';
import { standardSelectorTemplate } from './components/standard-selector.js';
import { useUiStore } from '@/state/uiStore';
import { useAnalysisStore } from '@/state/analysisStore';
import { runChecks } from '@/features/compliance/domain/engine';
import { eventBus } from '@/application/event-bus';

let container = null;
let currentStreamId = null;
let uiUnsubscribe = null;
let analysisUnsubscribe = null;

function renderComplianceView() {
    if (!container || currentStreamId === null) return;

    const stream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === currentStreamId);

    if (!stream || !stream.manifest) {
        render(html``, container);
        return;
    }

    const {
        complianceActiveFilter: activeFilter,
        complianceStandardVersion: activeStandardVersion,
    } = useUiStore.getState();
    const {
        protocol,
        activeMediaPlaylistUrl,
        mediaPlaylists,
        manifestUpdates,
        activeManifestUpdateId,
    } = stream;

    // --- UNIFIED DATA PATH ---
    let complianceResults = [];
    let currentUpdate = null;
    let rawManifestToDisplay = stream.rawManifest;
    let serializedManifestForView = stream.manifest.serializedManifest;

    if (protocol === 'hls' && activeMediaPlaylistUrl) {
        const mediaPlaylist = mediaPlaylists.get(activeMediaPlaylistUrl);
        if (mediaPlaylist) {
            // For HLS media playlists, we re-run checks on the fly as they are not part of the main update loop.
            // This is an exception to the "all analysis in worker" rule for practicality.
            complianceResults = runChecks(mediaPlaylist.manifest, protocol, {
                standardVersion: activeStandardVersion,
            });
            rawManifestToDisplay = mediaPlaylist.rawManifest;
            serializedManifestForView =
                mediaPlaylist.manifest.serializedManifest;
        }
    } else {
        // For DASH and HLS Master Playlist, we use the pre-computed results.
        currentUpdate = manifestUpdates.find(
            (u) => u.id === activeManifestUpdateId
        );
        complianceResults = currentUpdate?.complianceResults || [];
        if (currentUpdate) {
            rawManifestToDisplay = currentUpdate.rawManifest;
            serializedManifestForView = currentUpdate.serializedManifest;
        }
    }

    if (!rawManifestToDisplay) {
        render(
            html`<p class="text-gray-400 p-4">Awaiting manifest...</p>`,
            container
        );
        return;
    }

    const selector =
        protocol === 'hls'
            ? standardSelectorTemplate({
                  selectedVersion: activeStandardVersion,
                  onVersionChange: (version) =>
                      eventBus.dispatch(
                          'ui:compliance:standard-version-changed',
                          { version }
                      ),
              })
            : '';

    const navTpl =
        protocol === 'dash' || (protocol === 'hls' && !activeMediaPlaylistUrl)
            ? navigationTemplate(stream)
            : '';

    const mainTemplate = html`
        <div
            class="flex flex-col sm:flex-row justify-between items-center mb-4 shrink-0 gap-4"
        >
            <h3 class="text-xl text-white font-bold text-center sm:text-left">
                Interactive Compliance Report
            </h3>
            <div
                class="flex items-center flex-wrap justify-center sm:justify-end gap-4"
            >
                ${selector} ${navTpl}
            </div>
        </div>
        <div
            class="bg-slate-800 rounded-lg p-2 sm:p-4 font-mono text-sm leading-relaxed overflow-auto h-full"
        >
            ${manifestViewTemplate(
                rawManifestToDisplay,
                stream.protocol,
                complianceResults,
                serializedManifestForView,
                activeFilter
            )}
        </div>
    `;

    const contextualTemplate = html`
        <div class="flex flex-col p-4 h-full">
            ${sidebarTemplate(complianceResults, activeFilter, (filter) =>
                eventBus.dispatch('ui:compliance:filter-changed', {
                    filter,
                })
            )}
        </div>
    `;

    // Render main content and contextual sidebar
    render(mainTemplate, container);
    const contextualSidebar = document.getElementById('contextual-sidebar');
    if (contextualSidebar) {
        render(contextualTemplate, contextualSidebar);
    }
}

export const complianceView = {
    hasContextualSidebar: true,

    mount(containerElement, { stream }) {
        container = containerElement;
        currentStreamId = stream.id;

        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();

        uiUnsubscribe = useUiStore.subscribe(renderComplianceView);
        analysisUnsubscribe = useAnalysisStore.subscribe(renderComplianceView);
        renderComplianceView();
    },

    unmount() {
        if (uiUnsubscribe) uiUnsubscribe();
        if (analysisUnsubscribe) analysisUnsubscribe();
        uiUnsubscribe = null;
        analysisUnsubscribe = null;
        container = null;
        currentStreamId = null;

        const contextualSidebar = document.getElementById('contextual-sidebar');
        if (contextualSidebar) {
            render(html``, contextualSidebar);
        }
    },
};