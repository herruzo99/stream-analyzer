import { useAnalysisStore } from '@/state/analysisStore';
import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { showToast } from '@/ui/components/toast';
import { html, render } from 'lit-html';
import { compatibilityMatrixTemplate } from './components/compatibility-matrix.js';
import { integrationGuideTemplate } from './components/integration-guide.js';
import { technicalSpecsTemplate } from './components/technical-specs.js';
import { createIntegratorsReportViewModel } from './view-model.js';

const whitelistPanel = (domains) => {
    const list = Array.isArray(domains) ? domains : [];
    return html`
        <div class="flex flex-col h-full min-h-0 bg-[#06090f]">
            <div class="shrink-0 px-4 py-3 border-b border-white/5">
                <p class="mono text-[10px] text-slate-500">
                    network whitelist
                </p>
                <p class="mono text-[10px] text-slate-600 mt-0.5">
                    ${list.length} origin${list.length === 1 ? '' : 's'}
                </p>
            </div>
            <div class="grow min-h-0 overflow-y-auto custom-scrollbar p-3">
                ${list.length === 0
                    ? html`<p class="mono text-[11px] text-slate-600 text-center pt-8">
                          no external domains
                      </p>`
                    : html`
                          <ul class="space-y-1">
                              ${list.map(
                                  (d) => html`
                                      <li
                                          class="flex items-center gap-2.5 px-3 py-2 rounded-md border border-white/5 bg-white/[0.02] hover:border-white/15 transition-colors"
                                      >
                                          <span class="text-slate-600 shrink-0"
                                              >${icons.server}</span
                                          >
                                          <span
                                              class="mono text-[11px] text-slate-300 truncate"
                                              title="${d}"
                                              >${d}</span
                                          >
                                      </li>
                                  `
                              )}
                          </ul>
                      `}
            </div>
        </div>
    `;
};

/** Serializes the view-model into a plain-text integrator brief. */
const buildReportText = (vm) => {
    const lines = [];
    const { overview, specs, compatibility, codeSnippets, domains } = vm;
    lines.push(`integrator report — ${overview.streamName}`);
    lines.push(`protocol: ${overview.protocol} · type: ${overview.type}`);
    lines.push(
        `peak: ${overview.maxResolution} · ${specs.videoCodecs.join(', ') || 'no video codecs'}`
    );
    lines.push(`profile: ${specs.profiles}`);
    lines.push(
        `segment duration: ${Number(specs.avgSegmentDuration).toFixed(2)}s`
    );
    if (specs.smartPollingInterval)
        lines.push(`poll interval: ${specs.smartPollingInterval}s`);
    lines.push(
        `drm: ${specs.isEncrypted ? specs.drmSystems.join(', ') || 'encrypted' : 'clear'}`
    );
    lines.push('');
    lines.push('compatibility:');
    for (const platform of compatibility || []) {
        const failing = (platform.reqs || []).filter((r) => r.ok !== true);
        lines.push(
            `- ${platform.name} (${platform.engine}): ${platform.status}${failing.length ? ` — ${failing.map((r) => `${r.label}: ${r.msg}`).join('; ')}` : ''}`
        );
    }
    lines.push('');
    lines.push(`whitelist (${(domains || []).length}):`);
    for (const domain of domains || []) lines.push(`- ${domain}`);
    lines.push('');
    lines.push('--- shaka ---');
    lines.push(codeSnippets.shaka);
    return lines.join('\n');
};

class IntegratorsReportView {
    // Port note: was `extends BaseView` (never committed). Plain class
    // with inlined mount/unmount/subscribe; whitelist composed into
    // #contextual-sidebar.
    constructor() {
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
        // Subscribe to analysis store to trigger re-renders on data change
        this.subscribe(useAnalysisStore, () => this.render());
        // Initial paint: mount alone emits no store update, so without
        // this the container keeps the cleared markers from unmount().
        this.render();
    }

    render() {
        if (!this.container) return;

        const { streams, activeStreamId } = useAnalysisStore.getState();
        const list = Array.isArray(streams) ? streams : [];
        const stream = list.find((s) => s.id === activeStreamId) ?? list[0];

        // --- EMPTY STATE ---
        if (!stream || !stream.manifest) {
            // Clear sidebar
            const sidebarContainer =
                document.getElementById('contextual-sidebar');
            if (sidebarContainer) render(html``, sidebarContainer);

            render(
                html`
                    <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                        <p class="text-[15px] font-medium text-slate-200 mb-1">
                            No stream loaded.
                        </p>
                        <p class="mono text-[11px] text-slate-600">
                            Analyze a manifest to build the integrator report.
                        </p>
                    </div>
                `,
                this.container
            );
            return;
        }

        let vm = null;
        try {
            vm = createIntegratorsReportViewModel(stream);
        } catch {
            vm = null;
        }
        if (!vm) {
            // Clear sidebar: a stale whitelist from a previous stream
            // must not survive a "Report unavailable" render.
            const staleSidebar =
                document.getElementById('contextual-sidebar');
            if (staleSidebar) render(html``, staleSidebar);

            render(
                html`
                    <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                        <p class="text-[15px] font-medium text-slate-200 mb-1">
                            Report unavailable.
                        </p>
                        <p class="mono text-[11px] text-slate-600">
                            This analysis has no usable summary to report on.
                        </p>
                    </div>
                `,
                this.container
            );
            return;
        }

        const handleCopyReport = () => {
            copyTextToClipboard(buildReportText(vm), 'report copied');
        };
        const handleDownloadReport = () => {
            try {
                const blob = new Blob([buildReportText(vm)], {
                    type: 'text/plain;charset=utf-8',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${(vm.overview.streamName || 'stream').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 80)}.integrator.txt`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch {
                showToast({
                    message: 'Could not download the report.',
                    type: 'fail',
                });
            }
        };

        // --- 1. HEADER (in-flow; 1.2.0 has no topBar slot) ---
        const headerPanel = html`
            <div class="w-full flex items-center gap-3 flex-wrap">
                <div class="min-w-0">
                    <h2 class="text-[15px] font-medium text-slate-100 truncate">
                        ${vm.overview.streamName}
                    </h2>
                    <p class="mono text-[11px] text-slate-500 mt-0.5">
                        ${String(vm.overview.protocol).toLowerCase()} ·
                        ${String(vm.overview.type).toLowerCase()} ·
                        ${vm.overview.maxResolution}
                    </p>
                </div>
                <span class="grow"></span>
                <div class="flex items-center gap-1.5">
                    <button
                        @click=${handleCopyReport}
                        class="px-3 py-1.5 rounded-md border border-white/10 text-[12px] font-medium text-slate-400 hover:text-slate-100 hover:border-white/25 transition-colors flex items-center gap-1.5"
                        title="Copy the full report as plain text"
                    >
                        ${icons.clipboardCopy} Copy
                    </button>
                    <button
                        @click=${handleDownloadReport}
                        class="px-3 py-1.5 rounded-md border border-white/10 text-[12px] font-medium text-slate-400 hover:text-slate-100 hover:border-white/25 transition-colors flex items-center gap-1.5"
                        title="Download the full report as a text file"
                    >
                        ${icons.download} Download
                    </button>
                </div>
            </div>
        `;

        // --- 2. WHITELIST SIDEBAR (into #contextual-sidebar) ---
        const sidebarContainer =
            document.getElementById('contextual-sidebar');
        if (sidebarContainer) {
            render(
                html`
                    <div class="h-full w-full">
                        ${whitelistPanel(vm.domains)}
                    </div>
                `,
                sidebarContainer
            );
        }

        // --- 3. RENDER MAIN CONTENT (header composed in-flow) ---
        const template = html`
            <div
                class="flex flex-col h-full min-h-0 bg-[#06090f]"
            >
                <div class="shrink-0 px-4 pt-3">${headerPanel}</div>
                <div class="grow min-h-0 overflow-y-auto custom-scrollbar">
                    <div class="grid grid-cols-1 xl:grid-cols-2 gap-2 p-4">
                        <div class="min-h-[320px]">
                            ${technicalSpecsTemplate(vm)}
                        </div>
                        <div class="min-h-[320px]">
                            ${integrationGuideTemplate(vm)}
                        </div>
                        <div class="xl:col-span-2">
                            ${compatibilityMatrixTemplate(vm.compatibility)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        render(template, this.container);
    }
}

export const integratorsReportView = new IntegratorsReportView();
