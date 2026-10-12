import { eventBus } from '@/application/event-bus';
import { calculateComplianceScore } from '@/features/compliance/domain/compliance-scoring.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { showToast } from '@/ui/components/toast';
import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html, render } from 'lit-html';
import './components/compliance-scorecard.js';
import './components/issue-list.js';
import './components/compliance-sidebar.js';
import { navigationTemplate } from './components/navigation.js';
import { manifestViewTemplate } from './components/renderer.js';
import { standardSelectorTemplate } from './components/standard-selector.js';

class ComplianceView {
    // Port note: was `extends BaseView` (never committed). Plain class
    // with inlined mount/unmount/subscribe; slots composed in-container
    // and into #contextual-sidebar (no shell slots in 1.2.0).
    constructor() {
        this.viewMode = 'dashboard'; // 'dashboard' | 'source'
        this.currentStandardVersion = null;
        this.trackedStreamId = null;
        this.hasContextualSidebar = true;
        this._unsubs = [];
        this.container = null;
        this.stream = null;
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
        this.onMount();
    }

    unmount() {
        for (const unsubscribe of this._unsubs.splice(0)) {
            try {
                unsubscribe();
            } catch {
                /* ignore late unsubscribe errors */
            }
        }
        if (this.container) render(html``, this.container);
        const sidebarContainer =
            document.getElementById('contextual-sidebar');
        if (sidebarContainer) render(html``, sidebarContainer);
        this.container = null;
        this.stream = null;
    }

    onMount() {
        // Subscribe to relevant store parts
        this.subscribe(useUiStore, (state, prevState) => {
            if (state.complianceStandardVersion !== (prevState?.complianceStandardVersion ?? state.complianceStandardVersion)) {
                this.currentStandardVersion = state.complianceStandardVersion;
                this.render();
            }
            // Filter changes re-render so the Source view highlights
            // follow the sidebar filter.
            if (state.complianceActiveFilter !== prevState?.complianceActiveFilter) {
                this.render();
            }
        });

        this.subscribe(useAnalysisStore, () => this.render());

        // Initial render
        this.render();
    }

    onUnmount() {
        // BaseView auto-cleans subscriptions and shell slots
    }

    updateViewMode(mode) {
        this.viewMode = mode;
        this.render();
    }

    renderHeader(protocol, stream, complianceStandardVersion) {
        const isHls = protocol === 'hls';
        const modes = [
            { mode: 'dashboard', icon: icons.layout, label: 'findings' },
            { mode: 'source', icon: icons.code, label: 'source' },
        ];

        return html`
            <div class="w-full flex flex-wrap items-center gap-x-4 gap-y-2">
                <h2 class="mono text-xs font-medium text-slate-300 flex items-center gap-2">
                    ${icons.shieldCheck}
                    <span>compliance</span>
                    <span class="mono text-[10px] text-slate-600"
                        >${isHls ? `hls${complianceStandardVersion ? ` · v${complianceStandardVersion}` : ''}` : 'dash'}</span
                    >
                </h2>
                <div
                    class="flex items-center gap-1 p-1 rounded-md bg-black/30 border border-white/5"
                    role="tablist"
                    aria-label="Compliance view"
                >
                    ${modes.map(({ mode, icon, label }) => {
                        const isActive = this.viewMode === mode;
                        return html`
                            <button
                                role="tab"
                                aria-selected=${isActive}
                                @click=${() => this.updateViewMode(mode)}
                                class="px-3 py-1.5 rounded mono text-[11px] transition-colors flex items-center gap-1.5 ${isActive
                                    ? 'bg-white/10 text-slate-100'
                                    : 'text-slate-500 hover:text-slate-200'}"
                            >
                                ${icon} ${label}
                            </button>
                        `;
                    })}
                </div>
                <span class="grow"></span>
                <div class="flex items-center gap-2">
                    ${standardSelectorTemplate({
                        protocol,
                        selectedVersion: complianceStandardVersion,
                        onVersionChange: (version) =>
                            eventBus.dispatch(
                                'ui:compliance:standard-version-changed',
                                { version }
                            ),
                    })}
                    ${navigationTemplate(stream)}
                </div>
            </div>
        `;
    }

    render() {
        if (!this.container) return;

        const { streams, activeStreamId } = useAnalysisStore.getState();
        const list = Array.isArray(streams) ? streams : [];
        const stream = list.find((s) => s.id === activeStreamId) ?? list[0];

        if (!stream || !stream.manifest) {
            // Clear sidebar if no stream
            const sidebarContainer =
                document.getElementById('contextual-sidebar');
            if (sidebarContainer) render(html``, sidebarContainer);

            render(
                html`
                    <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                        <p class="text-[15px] font-medium text-slate-200 mb-1">
                            No stream selected.
                        </p>
                        <p class="mono text-[11px] text-slate-600">
                            Analyze a manifest to check compliance here.
                        </p>
                    </div>
                `,
                this.container
            );
            return;
        }

        const { complianceStandardVersion } = useUiStore.getState();
        const { protocol, activeManifestUpdateId } = stream;

        // 1. Header (in-flow; 1.2.0 has no topBar slot)
        const headerPanel = this.renderHeader(
            protocol,
            stream,
            complianceStandardVersion
        );

        // 2. Sidebar into #contextual-sidebar
        const sidebarContainer =
            document.getElementById('contextual-sidebar');
        if (sidebarContainer) {
            render(
                html`<compliance-sidebar .data=${{ stream }}></compliance-sidebar>`,
                sidebarContainer
            );
        }

        const updates = Array.isArray(stream.manifestUpdates)
            ? stream.manifestUpdates
            : [];
        const currentUpdate = updates.find((u) => u.id === activeManifestUpdateId) || updates[0];
        const complianceResults = currentUpdate?.complianceResults || [];

        // The contextual sidebar owns the filterable issue list; the main
        // pane shows the scorecard + manifest source. One list, one state.
        const { complianceActiveFilter } = useUiStore.getState();
        const manifestText =
            currentUpdate?.rawManifest || stream.rawManifest || '';

        const handleCopyManifest = () => {
            copyTextToClipboard(manifestText, 'Manifest copied');
        };
        const handleDownloadManifest = () => {
            try {
                const blob = new Blob([manifestText], {
                    type: 'text/plain;charset=utf-8',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${stream.name || 'manifest'}.${protocol === 'hls' ? 'm3u8' : 'mpd'}`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch {
                showToast({
                    message: 'Could not download the manifest.',
                    type: 'fail',
                });
            }
        };

        let activeContent;

        if (this.viewMode === 'dashboard') {
            const scoreData = (() => {
                try {
                    return calculateComplianceScore(complianceResults);
                } catch {
                    return {
                        totalScore: null,
                        label: 'unknown',
                        summary: { errors: 0, warnings: 0 },
                        categories: [],
                    };
                }
            })();
            activeContent = html`
                <div class="h-full w-full flex flex-col min-h-0 gap-2 p-4 md:p-5 overflow-y-auto custom-scrollbar bg-[#06090f]">
                    <compliance-scorecard
                        ._data=${scoreData}
                    ></compliance-scorecard>
                    <section
                        class="rounded-md border border-white/5 bg-[#0b111c] p-4"
                        aria-label="Findings summary"
                    >
                        <div class="flex items-center justify-between gap-2 mb-1">
                            <h3 class="text-sm font-medium text-slate-100">
                                Findings
                            </h3>
                            <span class="mono text-[10px] text-slate-600">
                                ${complianceResults.length} check${complianceResults.length === 1 ? '' : 's'} · refine in the sidebar
                            </span>
                        </div>
                        <p class="text-[13px] text-slate-500 leading-relaxed">
                            ${complianceResults.length === 0
                                ? 'No checks ran for this update yet.'
                                : 'Use the sidebar filters to narrow by severity, then expand a row for the manifest excerpt.'}
                        </p>
                    </section>
                </div>
            `;
        } else {
            // Source View
            activeContent = html`
                <div class="h-full w-full flex flex-col min-h-0">
                    <div class="flex-1 overflow-hidden flex flex-col rounded-md border border-white/5 bg-[#0b111c] min-h-0">
                         <div
                            class="px-4 py-2.5 flex items-center justify-between border-b border-white/5 shrink-0"
                         >
                            <span class="mono text-[11px] text-slate-500">manifest source</span>
                            <div class="flex gap-1">
                                 <button
                                    @click=${handleCopyManifest}
                                    class="p-1.5 rounded-md text-slate-500 hover:text-slate-100 hover:bg-white/5 transition-colors"
                                    title="Copy manifest"
                                    aria-label="Copy manifest"
                                 >
                                    ${icons.copy}
                                 </button>
                                 <button
                                    @click=${handleDownloadManifest}
                                    class="p-1.5 rounded-md text-slate-500 hover:text-slate-100 hover:bg-white/5 transition-colors"
                                    title="Download manifest"
                                    aria-label="Download manifest"
                                 >
                                    ${icons.download}
                                 </button>
                            </div>
                         </div>
                         <div
                             class="flex-1 overflow-auto p-4 custom-scrollbar font-mono text-xs leading-relaxed text-slate-200 min-h-0"
                         >
                            ${manifestText
                                ? manifestViewTemplate(
                                      manifestText,
                                      protocol,
                                      complianceResults,
                                      currentUpdate?.serializedManifest ||
                                          stream.manifest.serializedManifest,
                                      complianceActiveFilter
                                  )
                                : html`<p class="mono text-[11px] text-slate-600">No manifest text captured for this update.</p>`}
                         </div>
                    </div>
                </div>
            `;
        }

        render(
            html`
                <div class="flex flex-col h-full w-full relative overflow-hidden">
                    <div class="shrink-0 px-2 pt-2">${headerPanel}</div>
                    <!-- Main Content Area -->
                    <div class="grow min-h-0 overflow-hidden">
                        ${activeContent}
                    </div>
                </div>
            `,
            this.container
        );
    }
}

// Export Singleton
export const complianceView = new ComplianceView();
