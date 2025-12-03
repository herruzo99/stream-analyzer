import { structureContentTemplate } from '@/features/interactiveSegment/ui/components/ts/index.js';
import { getParsedSegment } from '@/infrastructure/segments/segmentService';
import { workerService } from '@/infrastructure/worker/workerService';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { connectedTabBar } from '@/ui/components/tabs';
import * as icons from '@/ui/icons';
import { isoBoxTreeTemplate } from '@/ui/shared/isobmff-renderer';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details.js';
import { html, render } from 'lit-html';
import { advancedBitstreamAnalysisTemplate } from './components/advanced-bitstream-analysis.js';
import './components/general-summary.js';
import { createSegmentAnalysisViewModel } from './view-model.js';
import { vttAnalysisTemplate } from './vtt-analysis.js';

class SegmentAnalysisComponent extends HTMLElement {
    constructor() {
        super();
        this._activeTab = 'overview';
        this._data = null;
        this._viewModel = null;
        this._isAnalyzing = false;
    }

    set data(val) {
        if (this._data === val) return;

        this._data = val;
        this._viewModel = null;
        this.checkBitstreamAnalysis();
        this.render();
    }

    checkBitstreamAnalysis() {
        if (this._data?.parsedData?.byteMap) {
            return;
        }

        if (
            this._data?.parsedData &&
            !this._data.parsedData.bitstreamAnalysis &&
            !this._data.parsedData.bitstreamAnalysisAttempted &&
            !this._isAnalyzing &&
            this._data.uniqueId &&
            ['isobmff', 'ts'].includes(this._data.parsedData.format)
        ) {
            this.triggerFullAnalysis(
                this._data.uniqueId,
                this._data.parsedData
            );
        }
    }

    _resolveInitSegmentId(segmentUniqueId) {
        const { streams, activeStreamId } = useAnalysisStore.getState();
        const activeStream = streams.find((s) => s.id === activeStreamId);
        const streamList = activeStream
            ? [activeStream, ...streams.filter((s) => s.id !== activeStreamId)]
            : streams;

        for (const stream of streamList) {
            if (stream.protocol === 'dash') {
                for (const repState of stream.dashRepresentationState.values()) {
                    if (
                        repState.segments.some(
                            (s) => s.uniqueId === segmentUniqueId
                        )
                    ) {
                        const initSeg = repState.segments.find(
                            (s) => s.type === 'Init'
                        );
                        return initSeg ? initSeg.uniqueId : null;
                    }
                }
            }
        }
        return null;
    }

    async triggerFullAnalysis(uniqueId, parsedData) {
        this._isAnalyzing = true;
        this.render();

        const { get, set } = useSegmentCacheStore.getState();
        const entry = get(uniqueId);

        if (entry && entry.data) {
            try {
                let context = {};
                if (parsedData.format === 'isobmff') {
                    const initUniqueId = this._resolveInitSegmentId(uniqueId);

                    if (initUniqueId) {
                        try {
                            const { activeStreamId } =
                                useAnalysisStore.getState();
                            const initParsed = await getParsedSegment(
                                initUniqueId,
                                activeStreamId,
                                'isobmff'
                            );

                            if (initParsed?.data?.boxes) {
                                context.initSegmentBoxes =
                                    initParsed.data.boxes;
                            }
                        } catch (err) {
                            console.warn(
                                '[SegmentAnalysis] Failed to auto-load Init Segment:',
                                err
                            );
                        }
                    }
                }

                const result = await workerService.postTask(
                    'full-segment-analysis',
                    {
                        parsedData: parsedData,
                        rawData: entry.data,
                        context,
                    }
                ).promise;

                const updatedParsedData = {
                    ...parsedData,
                    ...result,
                    bitstreamAnalysisAttempted: true,
                };
                const newEntry = { ...entry, parsedData: updatedParsedData };
                set(uniqueId, newEntry);

                this._data = { ...this._data, parsedData: updatedParsedData };
                this._viewModel = null;
            } catch (e) {
                console.warn('Full analysis failed:', e);
                const updatedParsedData = {
                    ...parsedData,
                    bitstreamAnalysisAttempted: true,
                };
                const newEntry = { ...entry, parsedData: updatedParsedData };
                set(uniqueId, newEntry);
                this._data = { ...this._data, parsedData: updatedParsedData };
            } finally {
                this._isAnalyzing = false;
                this.render();
            }
        } else {
            const updatedParsedData = {
                ...parsedData,
                bitstreamAnalysisAttempted: true,
            };
            this._data = { ...this._data, parsedData: updatedParsedData };
            this._isAnalyzing = false;
            this.render();
        }
    }

    get viewModel() {
        if (!this._viewModel && this._data?.parsedData) {
            let manifestCodec = null;

            if (this._data.uniqueId) {
                const { streams, activeStreamId } = useAnalysisStore.getState();
                const activeStream = streams.find(
                    (s) => s.id === activeStreamId
                );
                const streamList = activeStream
                    ? [
                          activeStream,
                          ...streams.filter((s) => s.id !== activeStreamId),
                      ]
                    : streams;

                for (const stream of streamList) {
                    if (stream.protocol === 'dash') {
                        for (const repState of stream.dashRepresentationState.values()) {
                            const segMatch = repState.segments.find(
                                (s) => s.uniqueId === this._data.uniqueId
                            );
                            if (segMatch) {
                                const repId = segMatch.repId;
                                for (const p of stream.manifest.periods) {
                                    for (const as of p.adaptationSets) {
                                        const rep = as.representations.find(
                                            (r) => r.id === repId
                                        );
                                        if (
                                            rep &&
                                            rep.codecs &&
                                            rep.codecs.length > 0
                                        ) {
                                            manifestCodec = rep.codecs[0].value;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (manifestCodec) break;
                }
            }

            this._viewModel = createSegmentAnalysisViewModel(
                this._data.parsedData,
                this._data.parsedData.data?.size || 0,
                manifestCodec
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

        const tabs = [{ key: 'overview', label: 'Overview' }];

        if (vm.bitstream) {
            tabs.push({ key: 'deep-analysis', label: 'Deep Analysis' });
        }

        if (['isobmff', 'ts'].includes(vm.format))
            tabs.push({ key: 'structure', label: 'Structure' });

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
                ${this._isAnalyzing
                    ? html`
                          <div
                              class="mt-4 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl flex items-center justify-center gap-3"
                          >
                              <span class="animate-spin text-blue-400"
                                  >${icons.spinner}</span
                              >
                              <span class="text-xs text-blue-300 font-medium"
                                  >Fetching Init & Analyzing Bitstream...</span
                              >
                          </div>
                      `
                    : !vm.bitstream &&
                        ['isobmff', 'ts'].includes(vm.format) &&
                        !parsedData.bitstreamAnalysisAttempted
                      ? html`
                            <div
                                class="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center text-xs text-slate-500 italic"
                            >
                                Bitstream analysis pending...
                            </div>
                        `
                      : ''}
            </div>
        `;

        const renderDeepAnalysis = () => html`
            <div
                class="absolute inset-0 overflow-y-auto p-4 custom-scrollbar animate-fadeIn bg-slate-950"
            >
                <div class="h-full min-h-[400px]">
                    ${advancedBitstreamAnalysisTemplate(vm.bitstream)}
                </div>
            </div>
        `;

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
                <div
                    class="shrink-0 px-4 pt-4 pb-0 border-b border-slate-800 bg-slate-900 sticky top-0 z-20"
                >
                    <div class="w-full max-w-md">
                        ${connectedTabBar(tabs, this._activeTab, (tab) =>
                            this.setActiveTab(tab)
                        )}
                    </div>
                </div>

                <div class="grow relative w-full min-h-0 bg-slate-900">
                    ${this._activeTab === 'overview' ? renderOverview() : ''}
                    ${this._activeTab === 'deep-analysis' && vm.bitstream
                        ? renderDeepAnalysis()
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
    isIFrame = false,
    uniqueId = null
) {
    return html`<segment-analysis-component
        .data=${{ parsedData, parsedDataB, isIFrame, uniqueId }}
    ></segment-analysis-component>`;
}
