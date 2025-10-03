import { html, render } from 'lit-html';
import { useStore } from '../../../core/store.js';
import { manifestViewTemplate } from './components/renderer.js';
import { sidebarTemplate } from './components/sidebar.js';
import { navigationTemplate } from './components/navigation.js';

// --- MODULE STATE ---
let activeFilter = 'all';
let interactionHandlerAttached = false;

// --- INTERACTION LOGIC ---
function initializeInteractions(container) {
    if (interactionHandlerAttached) return;
    interactionHandlerAttached = true;

    const filterBar = container.querySelector('.compliance-filter-bar');
    if (!filterBar) return;

    filterBar.addEventListener('click', (e) => {
        const target = /** @type {Element} */ (e.target);
        const button = target.closest('[data-filter]');
        if (!button) return;

        const newFilter = /** @type {HTMLElement} */ (button).dataset.filter;
        if (newFilter === activeFilter) return;
        activeFilter = newFilter;

        // Re-render the entire component with the new state
        const { streams, activeStreamId } = useStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId);
        if (stream) {
            render(getComplianceReportTemplate(stream), container);
        }
    });
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

    // setTimeout ensures this runs after the DOM is updated by lit-html,
    // allowing the event listener to be attached to the newly rendered elements.
    setTimeout(() => {
        const container = document.getElementById('tab-compliance');
        if (container) {
            initializeInteractions(container);
        }
    }, 0);

    return html`
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-6 h-full">
            <div class="flex flex-col min-h-0">
                <div
                    class="flex flex-col sm:flex-row justify-between items-center mb-4 flex-shrink-0"
                >
                    <h3 class="text-xl font-bold">
                        Interactive Compliance Report
                    </h3>
                    ${navigationTemplate(stream)}
                </div>
                <div
                    class="compliance-manifest-view bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-auto flex-grow"
                >
                    ${manifestViewTemplate(
                        rawManifest,
                        stream.protocol,
                        complianceResults,
                        serializedManifest,
                        activeFilter
                    )}
                </div>
            </div>
            <!-- FIX: This is now a flex container that constrains the sidebar's height -->
            <div class="flex flex-col h-full min-h-0">
                ${sidebarTemplate(complianceResults, activeFilter)}
            </div>
        </div>
    `;
}

export function attachComplianceFilterListeners() {
    // This function now simply triggers the initial render, which sets up its own listeners.
    const { streams, activeStreamId } = useStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);
    const container = document.getElementById('tab-compliance');
    if (stream && container) {
        // Reset state for re-initialization when tab is clicked
        interactionHandlerAttached = false;
        activeFilter = 'all';
        render(getComplianceReportTemplate(stream), container);
    }
}
