import { html } from 'lit-html';
import { manifestViewTemplate } from './components/renderer.js';
import { sidebarTemplate } from './components/sidebar.js';
import { navigationTemplate } from './components/navigation.js';
import { standardSelectorTemplate } from './components/standard-selector.js';
import { useUiStore } from '@/state/uiStore';
import { runChecks } from '@/features/compliance/domain/engine';
import { eventBus } from '@/application/event-bus';

export function getComplianceReportTemplate(stream) {
    if (!stream || !stream.manifest) return html``;

    const {
        complianceActiveFilter: activeFilter,
        complianceStandardVersion: activeStandardVersion,
    } = useUiStore.getState();
    const { manifestUpdates, activeManifestUpdateIndex, protocol } = stream;
    const currentUpdate = manifestUpdates[activeManifestUpdateIndex];

    if (!currentUpdate) {
        return html`<p class="text-gray-400 p-4">
            Awaiting first manifest update...
        </p>`;
    }

    let manifestObjectForChecks;
    let complianceCheckContext = {};

    if (protocol === 'hls') {
        manifestObjectForChecks = stream.manifest;
        complianceCheckContext.standardVersion = activeStandardVersion;
    } else if (protocol === 'dash') {
        manifestObjectForChecks = currentUpdate.serializedManifest;
    } else {
        return html`<p class="text-yellow-400 p-4">
            Compliance report not available for unknown protocol.
        </p>`;
    }

    const complianceResults = runChecks(
        manifestObjectForChecks,
        protocol,
        complianceCheckContext
    );

    const { rawManifest, serializedManifest } = currentUpdate;

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

    return html`
        <div
            class="flex flex-col sm:flex-row justify-between items-center mb-4 flex-shrink-0 gap-4"
        >
            <h3 class="text-xl font-bold text-center sm:text-left">
                Interactive Compliance Report
            </h3>
            <div
                class="flex items-center flex-wrap justify-center sm:justify-end gap-4"
            >
                ${selector} ${navigationTemplate(stream)}
            </div>
        </div>

        <div class="lg:grid lg:grid-cols-[1fr_450px] lg:gap-6 relative h-full">
            <div
                class="compliance-manifest-view bg-slate-800 rounded-lg p-2 sm:p-4 font-mono text-sm leading-relaxed overflow-auto mb-6 lg:mb-0 h-full"
            >
                ${manifestViewTemplate(
                    rawManifest,
                    stream.protocol,
                    complianceResults,
                    serializedManifest,
                    activeFilter
                )}
            </div>
            <div class="lg:sticky lg:top-4 h-fit">
                <div class="flex flex-col h-96 lg:max-h-[calc(100vh-12rem)]">
                    ${sidebarTemplate(
                        complianceResults,
                        activeFilter,
                        (filter) =>
                            eventBus.dispatch('ui:compliance:filter-changed', {
                                filter,
                            })
                    )}
                </div>
            </div>
        </div>
    `;
}
