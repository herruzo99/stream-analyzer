import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const filterButton = (isActive, icon, label, onClick) => html`
    <button
        @click=${onClick}
        class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${isActive
        ? 'bg-gradient-to-r from-blue-500 to-purple-500 border-transparent text-white shadow-[#3b82f6]'
        : 'bg-slate-800 border-slate-800 text-slate-400 hover:border-blue-500/50 hover:text-slate-200 hover:bg-slate-800'}"
    >
        ${icon}
        <span>${label}</span>
    </button>
`;

const modeSwitch = (currentMode, onChange) => html`
    <div
        class="flex bg-slate-800 p-1 rounded-xl border border-slate-800 backdrop-blur-sm"
    >
        <button
            @click=${() => onChange('inspect')}
            class="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${currentMode ===
        'inspect'
        ? 'bg-slate-800 text-slate-200 shadow-sm border border-slate-800'
        : 'text-slate-400 hover:text-slate-200'}"
        >
            ${icons.searchCode} Inspect
        </button>
        <button
            @click=${() => onChange('compare')}
            class="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${currentMode ===
        'compare'
        ? 'bg-gradient-to-r from-purple-500 to-purple-500 text-white shadow-[0_0_15px_#a855f7]'
        : 'text-slate-400 hover:text-slate-200'}"
        >
            ${icons.comparison} Compare
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
            class="h-auto md:h-16 px-6 py-2 md:py-0 w-full flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 z-20 relative"
        >
            <!-- Left: Content Filters -->
            <div
                class="flex items-center gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide"
            >
                ${filterButton(
        segmentExplorerActiveTab === 'video',
        icons.clapperboard,
        'Video',
        () => setActiveTab('video')
    )}
                ${filterButton(
        segmentExplorerActiveTab === 'audio',
        icons.audioLines,
        'Audio',
        () => setActiveTab('audio')
    )}
                ${filterButton(
        segmentExplorerActiveTab === 'text',
        icons.fileText,
        'Text',
        () => setActiveTab('text')
    )}
            </div>

            <!-- Center: Interaction Mode -->
            <div
                class="w-full md:w-auto flex justify-center md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
            >
                ${modeSwitch(
        segmentMatrixClickMode,
        uiActions.setSegmentMatrixClickMode
    )}
            </div>

            <!-- Right: Actions -->
            <div class="flex items-center gap-3 w-full md:w-auto justify-end">
                <span
                    class="text-[10px] text-slate-400 opacity-70 hidden md:inline-block select-none mr-2"
                >
                    Use
                    <kbd
                        class="font-sans bg-slate-800 px-1 rounded border border-slate-800 text-slate-100"
                        >Arrows</kbd
                    >
                    to navigate
                </span>
                ${segmentsForCompare.length > 0
            ? html`
                          <div
                              class="flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 pl-3 pr-1 py-1 rounded-full animate-fadeIn backdrop-blur-md"
                          >
                              <span
                                  class="text-xs font-bold text-purple-300"
                                  >${segmentsForCompare.length} selected</span
                              >
                              <button
                                  @click=${() =>
                    analysisActions.clearSegmentsToCompare()}
                                  class="p-1 hover:bg-purple-500/20 rounded-full text-purple-300 hover:text-white transition-colors"
                              >
                                  ${icons.xCircle}
                              </button>
                              <button
                                  @click=${() =>
                    uiActions.setActiveTab(
                        'segment-comparison'
                    )}
                                  class="bg-gradient-to-r from-purple-500 to-purple-500 hover:brightness-110 text-white text-xs font-bold px-3 py-1 rounded-full transition-all shadow-[0_0_10px_#a855f7] flex items-center gap-1 ml-1"
                              >
                                  ${icons.comparison} Compare
                              </button>
                          </div>
                      `
            : ''}
            </div>
        </div>
    `;
};
