import { html } from 'lit-html';
import { manifestViewTemplate } from './components/renderer.js';
import { sidebarTemplate } from './components/sidebar.js';
import { navigationTemplate } from './components/navigation.js';
import { standardSelectorTemplate } from './components/standard-selector.js';
import { useUiStore } from '@/state/uiStore';
import { runChecks } from '@/features/compliance/domain/engine';
import { eventBus } from '@/application/event-bus';

export function getComplianceReportTemplate(stream) {
    if (!stream || !stream.manifest) return { main: html``, contextual: null };

    const {
        complianceActiveFilter: activeFilter,
        complianceStandardVersion: activeStandardVersion,
    } = useUiStore.getState();
    const {
        protocol,
        activeMediaPlaylistUrl,
        mediaPlaylists,
        manifest,
        manifestUpdates,
        activeManifestUpdateIndex,
    } = stream;

    let complianceResults;
    let currentUpdate;

    if (protocol === 'hls') {
        const activeManifest = activeMediaPlaylistUrl
            ? mediaPlaylists.get(activeMediaPlaylistUrl)?.manifest || manifest
            : manifest;

        const rawManifest = activeMediaPlaylistUrl
            ? mediaPlaylists.get(activeMediaPlaylistUrl)?.rawManifest ||
              stream.rawManifest
            : stream.rawManifest;

        currentUpdate = {
            rawManifest: rawManifest,
            serializedManifest: activeManifest.serializedManifest,
        };

        // For HLS, we re-run checks on the client to allow for interactive version switching.
        complianceResults = runChecks(activeManifest, protocol, {
            standardVersion: activeStandardVersion,
        });
    } else {
        // DASH
        // For DASH, we use the pre-computed results from the worker, as there's no interactive element.
        currentUpdate = manifestUpdates[activeManifestUpdateIndex];
        complianceResults = currentUpdate?.complianceResults || [];
    }

    if (!currentUpdate || !currentUpdate.rawManifest) {
        return {
            main: html`<p class="text-gray-400 p-4">Awaiting manifest...</p>`,
            contextual: null,
        };
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
            <h3 class="text-xl font-bold text-center sm:text-left">
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
                currentUpdate.rawManifest,
                stream.protocol,
                complianceResults,
                currentUpdate.serializedManifest,
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

    return { main: mainTemplate, contextual: contextualTemplate };
}
