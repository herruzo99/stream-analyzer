import { html, render } from 'lit-html';
import { useStore } from '../../../core/store.js';
import { manifestViewTemplate } from './components/renderer.js';
import { sidebarTemplate } from './components/sidebar.js';
import { navigationTemplate } from './components/navigation.js';

// --- MODULE STATE ---
let activeFilter = 'all';

// --- INTERACTION LOGIC ---
function handleFilterClick(newFilter) {
    if (newFilter === activeFilter) return;
    activeFilter = newFilter;

    // Re-render the entire component with the new state
    const { streams, activeStreamId } = useStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);
    const container = document.getElementById('tab-compliance');
    if (stream && container) {
        render(getComplianceReportTemplate(stream), container);
    }
}

// --- MAIN TEMPLATE ---
export function getComplianceReportTemplate(stream) {
    if (!stream || !stream.manifest) return html``;

    const { manifestUpdates, activeManifestUpdateIndex } = stream;
    const currentUpdate = manifestUpdates[activeManifestUpdateIndex];

    if (!currentUpdate) {
        return html`<p class="text-gray-400 p-4">
            Awaiting first manifest update with compliance data...
        </p>`;
    }
    const { complianceResults, rawManifest, serializedManifest } =
        currentUpdate;

    return html`
        <div
            class="flex flex-col sm:flex-row justify-between items-center mb-4 flex-shrink-0"
        >
            <h3 class="text-xl font-bold">Interactive Compliance Report</h3>
            ${navigationTemplate(stream)}
        </div>

        <div class="lg:grid lg:grid-cols-[1fr_450px] lg:gap-6 relative">
            <div
                class="compliance-manifest-view bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto mb-6 lg:mb-0"
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
                <div class="flex flex-col max-h-[calc(100vh-12rem)]">
                    ${sidebarTemplate(
                        complianceResults,
                        activeFilter,
                        handleFilterClick
                    )}
                </div>
            </div>
        </div>
    `;
}

export function attachComplianceFilterListeners() {
    // This function now simply triggers the initial render.
    // Event handling is managed declaratively by lit-html.
    const { streams, activeStreamId } = useStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);
    const container = document.getElementById('tab-compliance');
    if (stream && container) {
        // Reset state for re-initialization when tab is clicked
        activeFilter = 'all';
        render(getComplianceReportTemplate(stream), container);
    }
}
