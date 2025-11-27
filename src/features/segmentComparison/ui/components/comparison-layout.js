import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { diffOverviewTemplate } from './diff-overview.js';
import { diffTreeTemplate } from './diff-tree.js';
import { segmentSelectorTemplate } from './segment-selector.js';

export const comparisonLayoutTemplate = ({
    availableSegments,
    segmentA,
    segmentB,
    structuralDiff,
    onSelectA,
    onSelectB,
}) => {
    const hasSelection = segmentA && segmentB;

    return html`
        <div class="flex flex-col h-full p-6 bg-slate-950 gap-6">
            <!-- Header & Selectors -->
            <div
                class="shrink-0 bg-slate-900/50 border border-slate-800 p-4 rounded-2xl shadow-sm"
            >
                <div class="flex flex-col lg:flex-row items-center gap-6">
                    <div class="flex-1 w-full">
                        ${segmentSelectorTemplate(
                            segmentA,
                            availableSegments,
                            onSelectA,
                            'Reference'
                        )}
                    </div>

                    <div
                        class="shrink-0 flex flex-col items-center justify-center text-slate-500 px-2"
                    >
                        <div class="w-px h-4 bg-slate-700 mb-1"></div>
                        <span
                            class="text-xs font-bold bg-slate-800 px-2 py-1 rounded-full border border-slate-700"
                            >VS</span
                        >
                        <div class="w-px h-4 bg-slate-700 mt-1"></div>
                    </div>

                    <div class="flex-1 w-full">
                        ${segmentSelectorTemplate(
                            segmentB,
                            availableSegments,
                            onSelectB,
                            'Candidate'
                        )}
                    </div>
                </div>
            </div>

            ${hasSelection
                ? html`
                      <!-- Stats Overview -->
                      <div class="shrink-0">
                          ${diffOverviewTemplate(segmentA, segmentB)}
                      </div>

                      <!-- Main Content -->
                      <div class="grow min-h-0 flex flex-col">
                          <div class="flex items-center gap-2 mb-3">
                              <span class="text-blue-400"
                                  >${icons.gitMerge}</span
                              >
                              <h3
                                  class="text-sm font-bold text-white uppercase tracking-wide"
                              >
                                  Structural Comparison
                              </h3>
                          </div>
                          <div class="grow min-h-0">
                              ${diffTreeTemplate(structuralDiff)}
                          </div>
                      </div>
                  `
                : html`
                      <div
                          class="grow flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30"
                      >
                          <div class="scale-150 mb-4 opacity-50">
                              ${icons.comparison}
                          </div>
                          <p class="font-medium">
                              Select two segments to begin comparison
                          </p>
                      </div>
                  `}
        </div>
    `;
};
