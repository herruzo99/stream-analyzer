import { getOverviewEvidenceLinks } from '@/features/summary/application/overview-contract.js';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { uiActions } from '@/state/uiStore';
import { showToast } from '@/ui/components/toast';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { bitrateLadderTemplate } from './components/bitrate-ladder.js';
import { cmafWidgetTemplate } from './components/cmaf-widget.js';
import { complianceWidgetTemplate } from './components/compliance-widget.js';
import { featureGridTemplate } from './components/feature-grid.js';
import { heroHeaderTemplate } from './components/hero-header.js';
import { quickStatsTemplate } from './components/quick-stats.js';
import { tracksPanelTemplate } from './components/tracks-panel.js';
import { createSummaryViewModel } from './view-model.js';
import { eventBus } from '@/application/event-bus';
import { EVENTS } from '@/types/events';

// Flat workbench panel shared by every overview section.
const panelClass =
    'rounded-md border border-white/5 bg-[#0b111c]';

let container = null;
let analysisUnsubscribe = null;
let warningsOpen = false;
let warningsStreamId = null;
let confirmingRemoveId = null;
let cmafOpen = false;

function renderSummary() {
    if (!container) return;

    const { streams, activeStreamId } = useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId) ?? streams[0];

    // Per-stream UI state must not bleed across streams.
    if (warningsStreamId !== stream?.id) {
        warningsStreamId = stream?.id ?? null;
        warningsOpen = false;
        confirmingRemoveId = null;
        cmafOpen = false;
    }

    // --- CASE: NO STREAM ---
    if (!stream) {
        render(
            html`
                <div
                    class="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center"
                >
                    <p class="text-[15px] font-medium text-slate-200 mb-1">
                        No stream loaded.
                    </p>
                    <p class="mono text-[11px] text-slate-600">
                        Analyze a manifest to see its overview here.
                    </p>
                </div>
            `,
            container
        );
        return;
    }

    const vm = createSummaryViewModel(stream);

    // --- CASE: BROKEN STREAM ---
    if (!vm) {
        const armed = confirmingRemoveId === stream.id;
        const handleRemove = () => {
            if (!armed) {
                confirmingRemoveId = stream.id;
                renderSummary();
                return;
            }
            confirmingRemoveId = null;
            analysisActions.removeStreamInput(stream.id);
            showToast({
                message: `Removed “${stream.name}”.`,
                type: 'pass',
            });
        };

        const handleRetry = () => {
            eventBus.dispatch(EVENTS.UI.RETRY_STREAM, { streamId: stream.id });
        };

        render(
            html`
                <div
                    class="flex flex-col items-center justify-center h-full p-8 text-center"
                >
                    <p class="mono text-[11px] text-red-300 mb-2">
                        analysis failed
                    </p>
                    <h3 class="text-lg font-bold text-slate-100 mb-2">
                        Summary unavailable
                    </h3>
                    <p
                        class="text-[13px] text-slate-500 max-w-md mb-1 leading-relaxed"
                    >
                        The manifest could not be parsed — usually an
                        unsupported format or a fetch failure.
                    </p>
                    ${stream.retryCount > 0
                        ? html`<p
                              class="mono text-[11px] text-slate-600 mb-4"
                          >
                              auto-retries: ${stream.retryCount}
                          </p>`
                        : html`<span class="mb-4"></span>`}

                    <div class="flex gap-2">
                        <button
                            @click=${handleRetry}
                            class="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-200 border border-emerald-400/25 text-[13px] font-medium rounded-md transition-colors flex items-center gap-2"
                        >
                            ${icons.refresh} retry
                        </button>
                        <button
                            @click=${handleRemove}
                            class="px-4 py-2 text-[13px] font-medium rounded-md border transition-colors flex items-center gap-2 ${armed
                                ? 'bg-red-500/10 text-red-200 border-red-400/40'
                                : 'text-slate-400 border-white/10 hover:text-slate-100 hover:border-white/25'}"
                        >
                            ${icons.trash} ${armed ? 'confirm remove' : 'remove'}
                        </button>
                    </div>
                </div>
            `,
            container
        );
        return;
    }

    // --- LAYOUT ---
    const template = html`
        <div
            class="flex flex-col h-full custom-scrollbar overflow-y-auto gap-2 p-4 md:p-5 bg-[#06090f]"
        >
            <div class="shrink-0 ${panelClass} p-4">${heroHeaderTemplate(vm)}</div>
            ${(() => {
                const links = getOverviewEvidenceLinks(stream);
                return html`<section
                    aria-label="Linked evidence"
                    class="shrink-0 ${panelClass} px-4 py-3 flex flex-wrap items-center gap-2"
                >
                    <span class="mono text-[11px] text-slate-600"
                        >evidence —</span
                    >
                    ${links.length
                        ? links.map(
                              (link) =>
                                  html`<button
                                      class="mono text-[11px] px-2.5 py-1.5 rounded-md border border-white/10 text-slate-300 hover:text-slate-100 hover:border-white/25 transition-colors"
                                      @click=${() =>
                                          uiActions.setActiveTab(link.route)}
                                      >${link.label}</button
                                  >`
                          )
                        : html`<span
                              class="mono text-[11px] text-slate-600"
                              role="status"
                          >
                              no linked views for this result
                          </span>`}
                </section>`;
            })()}
            ${stream.warnings?.length > 0
                ? html`
                      <div class="shrink-0 ${panelClass} overflow-hidden">
                          <button
                              @click=${() => {
                                  warningsOpen = !warningsOpen;
                                  renderSummary();
                              }}
                              aria-expanded=${warningsOpen}
                              class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                          >
                              <span class="flex items-center gap-2.5 min-w-0">
                                  <span class="text-amber-300 shrink-0"
                                      >${icons.alertTriangle}</span
                                  >
                                  <span
                                      class="text-[13px] font-medium text-slate-200 truncate"
                                      >${stream.warnings.length} analysis
                                      warning${stream.warnings.length === 1
                                          ? ''
                                          : 's'}</span
                                  >
                              </span>
                              <span
                                  class="text-slate-500 transition-transform ${warningsOpen
                                      ? 'rotate-180'
                                      : ''}"
                              >
                                  ${icons.chevronDown}
                              </span>
                          </button>
                          ${warningsOpen
                              ? html`<ul
                                    class="px-4 pb-3 pt-1 border-t border-white/5 space-y-1.5"
                                >
                                    ${stream.warnings.map(
                                        (w) => html`
                                            <li
                                                class="text-xs text-slate-400 leading-relaxed"
                                            >
                                                ${typeof w === 'string'
                                                    ? w
                                                    : w.message || 'Unnamed warning'}
                                            </li>
                                        `
                                    )}
                                </ul>`
                              : ''}
                      </div>
                  `
                : ''}

            <div>${quickStatsTemplate(vm)}</div>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-2">
                <div class="xl:col-span-2 flex flex-col gap-2 min-w-0">
                    <section class="${panelClass} p-4" aria-label="ABR ladder">
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <h3 class="text-sm font-medium text-slate-100">
                                ABR ladder
                            </h3>
                            <span class="mono text-[10px] text-slate-600">
                                ${(vm.videoTracks || []).length} variant${(vm.videoTracks || []).length === 1 ? '' : 's'}
                            </span>
                        </div>
                        ${(vm.ladderPoints || []).length > 0
                            ? bitrateLadderTemplate(vm)
                            : html`<p class="mono text-[11px] text-slate-600 py-6 text-center">No video variants in this manifest.</p>`}
                    </section>

                    <section class="${panelClass} p-4" aria-label="Capabilities">
                        <h3 class="text-sm font-medium text-slate-100 mb-3">
                            Capabilities
                        </h3>
                        ${featureGridTemplate(vm)}
                    </section>
                </div>

                <div class="flex flex-col gap-2 min-w-0">
                    ${complianceWidgetTemplate(stream)}
                    ${cmafWidgetTemplate(vm.cmafData, cmafOpen, () => {
                        cmafOpen = !cmafOpen;
                        renderSummary();
                    })}
                </div>
            </div>

            <section
                class="${panelClass} overflow-hidden flex flex-col grow min-h-[320px]"
                aria-label="Tracks"
            >
                ${tracksPanelTemplate(vm)}
            </section>
        </div>
    `;

    render(template, container);
}

export const summaryView = {
    hasContextualSidebar: false,
    mount(containerElement) {
        container = containerElement;

        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = useAnalysisStore.subscribe(renderSummary);
        renderSummary();
    },
    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        analysisUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
    },
};
