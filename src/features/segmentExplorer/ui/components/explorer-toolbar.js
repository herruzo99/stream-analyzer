import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const filterButton = (isActive, icon, label, onClick) => html`
    <button
        @click=${onClick}
        aria-pressed=${isActive}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-md mono text-[11px] border transition-colors ${isActive ? 'border-emerald-400/25 bg-emerald-500/[0.06] text-emerald-200' : 'border-white/10 text-slate-400 hover:text-slate-100 hover:border-white/25'}"
    >
        ${icon}
        <span>${label}</span>
    </button>
`;

const modeSwitch = (currentMode, onChange) => html`
    <div
        class="flex border border-white/10 rounded-md p-0.5"
        role="group"
        aria-label="Interaction mode"
    >
        <button
            @click=${() => onChange('inspect')}
            aria-pressed=${currentMode === 'inspect'}
            class="px-3 py-1.5 rounded mono text-[11px] transition-colors flex items-center gap-1.5 ${currentMode === 'inspect' ? 'bg-white/[0.06] text-slate-100' : 'text-slate-500 hover:text-slate-200'}"
        >
            ${icons.searchCode} inspect
        </button>
        <button
            @click=${() => onChange('compare')}
            aria-pressed=${currentMode === 'compare'}
            class="px-3 py-1.5 rounded mono text-[11px] transition-colors flex items-center gap-1.5 ${currentMode === 'compare' ? 'bg-white/[0.06] text-slate-100' : 'text-slate-500 hover:text-slate-200'}"
        >
            ${icons.comparison} compare
        </button>
    </div>
`;

export const explorerToolbarTemplate = () => {
    const { segmentExplorerActiveTab, segmentMatrixClickMode } =
        useUiStore.getState();
    const { segmentsForCompare } = useAnalysisStore.getState();

    const setActiveTab = (tab) => uiActions.setSegmentExplorerActiveTab(tab);

    return html`
        <div
            class="w-full flex flex-col md:flex-row md:items-center gap-2 shrink-0"
        >
            <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                ${filterButton(
                    segmentExplorerActiveTab === 'video',
                    icons.clapperboard,
                    'video',
                    () => setActiveTab('video')
                )}
                ${filterButton(
                    segmentExplorerActiveTab === 'audio',
                    icons.audioLines,
                    'audio',
                    () => setActiveTab('audio')
                )}
                ${filterButton(
                    segmentExplorerActiveTab === 'text',
                    icons.fileText,
                    'text',
                    () => setActiveTab('text')
                )}
            </div>

            <div class="flex md:mx-auto">
                ${modeSwitch(
                    segmentMatrixClickMode,
                    uiActions.setSegmentMatrixClickMode
                )}
            </div>

            <div class="flex items-center gap-2 md:justify-end">
                <span
                    class="mono text-[10px] text-slate-600 hidden lg:inline-block select-none"
                >
                    arrows navigate
                </span>
                ${segmentsForCompare.length > 0
                    ? html`
                          <div
                              class="flex items-center gap-2 border border-white/10 rounded-md pl-3 pr-1 py-1"
                          >
                              <span class="mono text-[11px] text-slate-300"
                                  >${segmentsForCompare.length} selected</span
                              >
                              <button
                                  @click=${() =>
                                      analysisActions.clearSegmentsToCompare()}
                                  aria-label="Clear selection"
                                  class="p-1 rounded text-slate-500 hover:text-slate-100 hover:bg-white/10 transition-colors"
                              >
                                  ${icons.x}
                              </button>
                              <button
                                  @click=${() =>
                                      uiActions.setActiveTab(
                                          'segment-comparison'
                                      )}
                                  class="px-3 py-1 rounded-md mono text-[11px] border border-emerald-400/25 bg-emerald-500/[0.06] text-emerald-200 transition-colors flex items-center gap-1.5"
                              >
                                  ${icons.comparison} compare
                              </button>
                          </div>
                      `
                    : ''}
            </div>
        </div>
    `;
};
