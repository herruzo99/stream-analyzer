import { html } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import * as icons from '@/ui/icons';

const filterButton = (isActive, icon, label, onClick) => html`
    <button
        @click=${onClick}
        class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${isActive
            ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/20'
            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'}"
    >
        ${icon}
        <span>${label}</span>
    </button>
`;

const modeSwitch = (currentMode, onChange) => html`
    <div class="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
        <button
            @click=${() => onChange('inspect')}
            class="px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${currentMode ===
            'inspect'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'}"
        >
            ${icons.searchCode} Inspect
        </button>
        <button
            @click=${() => onChange('compare')}
            class="px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${currentMode ===
            'compare'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'}"
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
            class="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 z-20 relative shadow-sm"
        >
            <!-- Left: Content Filters -->
            <div class="flex items-center gap-2">
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
                class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
                ${modeSwitch(
                    segmentMatrixClickMode,
                    uiActions.setSegmentMatrixClickMode
                )}
            </div>

            <!-- Right: Actions -->
            <div class="flex items-center gap-3">
                ${segmentsForCompare.length > 0
                    ? html`
                          <div
                              class="flex items-center gap-2 bg-purple-900/20 border border-purple-500/30 pl-3 pr-1 py-1 rounded-full animate-fadeIn"
                          >
                              <span class="text-xs font-bold text-purple-300"
                                  >${segmentsForCompare.length} selected</span
                              >
                              <button
                                  @click=${() =>
                                      analysisActions.clearSegmentsToCompare()}
                                  class="p-1 hover:bg-purple-500/20 rounded-full text-purple-400 hover:text-white transition-colors"
                              >
                                  ${icons.xCircle}
                              </button>
                              <button
                                  @click=${() =>
                                      uiActions.setActiveTab(
                                          'segment-comparison'
                                      )}
                                  class="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full transition-colors flex items-center gap-1 ml-1"
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
