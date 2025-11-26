import { html, render } from 'lit-html';
import { createSegmentAnalysisViewModel } from './view-model.js';
import { connectedTabBar } from '@/ui/components/tabs';
import * as icons from '@/ui/icons';
import { isoBoxTreeTemplate } from '@/ui/shared/isobmff-renderer';
import { structureContentTemplate } from '@/features/interactiveSegment/ui/components/ts/index.js';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details.js';
import { vttAnalysisTemplate } from './vtt-analysis.js';
import './components/general-summary.js';
import './components/bitstream-visualizer.js';

class SegmentAnalysisComponent extends HTMLElement {
    constructor() {
        super();
        this._activeTab = 'overview';
        this._data = null;
        this._viewModel = null;
    }

    /**
     * @param {{parsedData: any, parsedDataB?: any, isIFrame?: boolean}} val
     */
    set data(val) {
        // Simple equality check to avoid unnecessary re-calculations
        if (this._data === val) return;

        this._data = val;
        this._viewModel = null; // Invalidate cached view model

        // ARCHITECTURAL FIX: Do NOT reset the tab here.
        // This preserves the user's context (e.g. Structure view) during polling updates.

        this.render();
    }

    get viewModel() {
        if (!this._viewModel && this._data?.parsedData) {
            this._viewModel = createSegmentAnalysisViewModel(
                this._data.parsedData,
                this._data.parsedData.data?.size || 0
            );
        }
        return this._viewModel;
    }

    setActiveTab(tab) {
        this._activeTab = tab;
        this.render();
    }

    render() {
        if (!this._data || !this._data.parsedData) {
            render(html``, this);
            return;
        }

        const { parsedData, parsedDataB, isIFrame } = this._data;
        const vm = this.viewModel;

        // Comparison Mode Warning
        if (parsedDataB) {
            render(
                html`
                    <div
                        class="p-8 text-center text-yellow-400 bg-yellow-900/20 rounded-xl border border-yellow-700/50 mt-8 mx-4"
                    >
                        ${icons.alertTriangle}
                        <p class="mt-2">
                            For side-by-side comparison, please use the
                            <strong>Segment Comparison</strong> tab in the main
                            view.
                        </p>
                    </div>
                `,
                this
            );
            return;
        }

        // Tab Configuration
        const tabs = [{ key: 'overview', label: 'Overview' }];
        if (vm.bitstream) tabs.push({ key: 'bitstream', label: 'Bitstream' });
        if (['isobmff', 'ts'].includes(vm.format))
            tabs.push({ key: 'structure', label: 'Structure' });

        // --- Tab Content Renderers ---

        const renderOverview = () => html`
            <div
                class="absolute inset-0 overflow-y-auto p-4 custom-scrollbar animate-fadeIn"
            >
                <segment-general-summary .vm=${vm}></segment-general-summary>

                ${vm.format === 'scte35'
                    ? html`
                          <div class="mt-6">
                              <h3
                                  class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4"
                              >
                                  Payload Analysis
                              </h3>
                              ${scte35DetailsTemplate(parsedData.data)}
                          </div>
                      `
                    : ''}
                ${vm.format === 'vtt'
                    ? html`
                          <div class="mt-6">
                              ${vttAnalysisTemplate(parsedData.data)}
                          </div>
                      `
                    : ''}
                ${vm.issues.length > 0
                    ? html`
                          <div
                              class="mt-8 p-4 bg-red-900/10 border border-red-500/20 rounded-xl"
                          >
                              <h4
                                  class="text-red-400 font-bold text-sm flex items-center gap-2 mb-3"
                              >
                                  ${icons.alertTriangle} Parsing Issues
                              </h4>
                              <ul class="space-y-2">
                                  ${vm.issues.map(
                                      (i) => html`
                                          <li
                                              class="text-xs text-red-300 font-mono flex items-start gap-2"
                                          >
                                              <span
                                                  class="mt-1 w-1 h-1 rounded-full bg-red-500 shrink-0"
                                              ></span>
                                              ${i.message}
                                          </li>
                                      `
                                  )}
                              </ul>
                          </div>
                      `
                    : ''}
            </div>
        `;

        const renderBitstream = () => html`
            <div
                class="absolute inset-0 overflow-y-auto p-4 custom-scrollbar animate-fadeIn"
            >
                <div class="h-full">
                    <segment-bitstream-visualizer
                        .data=${vm.bitstream}
                    ></segment-bitstream-visualizer>
                </div>
            </div>
        `;

        // Layout Fix: Structure view (TS/ISO) often uses virtualized lists which require explicit height.
        // We remove padding from the container and ensure the child fills 100% of the height.
        const renderStructure = () => html`
            <div
                class="absolute inset-0 flex flex-col animate-fadeIn h-full w-full bg-slate-950"
            >
                ${vm.format === 'isobmff'
                    ? html`
                          <div
                              class="grow overflow-y-auto p-4 custom-scrollbar space-y-2"
                          >
                              ${parsedData.data.boxes.map((box) =>
                                  isoBoxTreeTemplate(box, { isIFrame })
                              )}
                          </div>
                      `
                    : html`
                          <div
                              class="h-full w-full border border-slate-800 overflow-hidden"
                          >
                              ${structureContentTemplate({
                                  data: parsedData.data,
                              })}
                          </div>
                      `}
            </div>
        `;

        const content = html`
            <div class="flex flex-col h-full bg-slate-900 text-slate-200">
                <!-- Header Toolbar -->
                <div
                    class="shrink-0 px-4 pt-4 pb-0 border-b border-slate-800 bg-slate-900 sticky top-0 z-20"
                >
                    <div class="w-full max-w-md">
                        ${connectedTabBar(tabs, this._activeTab, (tab) =>
                            this.setActiveTab(tab)
                        )}
                    </div>
                </div>

                <!-- Main Content Area -->
                <!-- ARCHITECTURAL FIX: Use relative positioning and absolute children to ensure full height utilization -->
                <div class="grow relative w-full min-h-0 bg-slate-900">
                    ${this._activeTab === 'overview' ? renderOverview() : ''}
                    ${this._activeTab === 'bitstream' && vm.bitstream
                        ? renderBitstream()
                        : ''}
                    ${this._activeTab === 'structure' ? renderStructure() : ''}
                </div>
            </div>
        `;

        render(content, this);
    }
}

customElements.define('segment-analysis-component', SegmentAnalysisComponent);

export function getSegmentAnalysisTemplate(
    parsedData,
    parsedDataB = null,
    isIFrame = false
) {
    return html`<segment-analysis-component
        .data=${{ parsedData, parsedDataB, isIFrame }}
    ></segment-analysis-component>`;
}
