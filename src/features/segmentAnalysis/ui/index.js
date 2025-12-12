import { hexViewTemplate } from '@/features/interactiveSegment/ui/components/hex-view.js';
import { structureContentTemplate } from '@/features/interactiveSegment/ui/components/ts/index.js';
import { getParsedSegment } from '@/infrastructure/segments/segmentService';
import { workerService } from '@/infrastructure/worker/workerService';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { connectedTabBar } from '@/ui/components/tabs';
import { isoBoxTreeTemplate } from '@/ui/shared/isobmff-renderer';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details.js';
import { html, render } from 'lit-html';
import { advancedBitstreamAnalysisTemplate } from './components/advanced-bitstream-analysis.js';
import './components/general-summary.js';
import { seiInspectorTemplate } from './components/sei-inspector.js';
import { ttmlAnalysisTemplate } from './ttml-analysis.js';
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
        if (this._data && val) {
            const sameId = this._data.uniqueId === val.uniqueId;
            const sameIFrame = this._data.isIFrame === val.isIFrame;

            // 1. Strict Referential Equality
            let isStable = this._data.parsedData === val.parsedData;

            // 2. Cheap Deep Check for Stability
            if (!isStable && sameId && this._data.parsedData && val.parsedData) {
                const prev = this._data.parsedData;
                const next = val.parsedData;

                const formatMatch = prev.format === next.format;
                const analysisAttemptedMatch = prev.bitstreamAnalysisAttempted === next.bitstreamAnalysisAttempted;
                const sizeMatch = prev.data?.size === next.data?.size;
                const analysisPresenceMatch = !!prev.bitstreamAnalysis === !!next.bitstreamAnalysis;

                if (formatMatch && analysisAttemptedMatch && sizeMatch && analysisPresenceMatch) {
                    isStable = true;
                }
            }

            if (sameId && isStable && sameIFrame) {
                return;
            }
        }

        this._data = val;
        this._viewModel = null;
        this.checkBitstreamAnalysis();
        this.render();
    }

    checkBitstreamAnalysis() {
        // ARCHITECTURAL FIX: Do not return early just because byteMap exists.
        // MPEG-TS parsing generates a byteMap (packet map) immediately, but 
        // Deep Analysis (GOP structure) is a separate, heavier step.
        // We rely solely on 'bitstreamAnalysisAttempted' to prevent loops.

        if (
            this._data?.parsedData &&
            !this._data.parsedData.bitstreamAnalysis &&
            !this._data.parsedData.bitstreamAnalysisAttempted &&
            !this._isAnalyzing &&
            this._data.uniqueId &&
            ['isobmff', 'ts'].includes(this._data.parsedData.format)
        ) {
            console.log('[SegmentAnalysis] Triggering missing bitstream analysis...');
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

    _findSegmentMetadata(segmentUniqueId) {
        const { streams } = useAnalysisStore.getState();

        for (const stream of streams) {
            if (stream.protocol === 'dash') {
                for (const repState of stream.dashRepresentationState.values()) {
                    const segment = repState.segments.find(
                        (s) => s.uniqueId === segmentUniqueId
                    );
                    if (segment) return { segment, stream };
                }
            } else if (stream.protocol === 'hls') {
                for (const variantState of stream.hlsVariantState.values()) {
                    const segment = variantState.segments.find(
                        (s) => s.uniqueId === segmentUniqueId
                    );
                    if (segment) return { segment, stream };
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
                        } catch (_err) {
                            /* ignore */
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
            } catch (_e) {
                console.warn('[SegmentAnalysis] Full analysis failed', _e);
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
            this._isAnalyzing = false;
            this.render();
        }
    }

    get viewModel() {
        if (!this._viewModel && this._data?.parsedData) {
            let manifestCodec = null;
            let segmentMeta = null;

            if (this._data.uniqueId) {
                const found = this._findSegmentMetadata(this._data.uniqueId);

                if (found) {
                    segmentMeta = found.segment;
                    const repId = found.segment.repId;
                    const track = found.stream.manifest.summary?.videoTracks.find(
                        (t) => t.id === repId
                    );
                    if (track && track.codecs && track.codecs.length > 0) {
                        manifestCodec = track.codecs[0].value;
                    }
                }
            }

            this._viewModel = createSegmentAnalysisViewModel(
                this._data.parsedData,
                this._data.parsedData.data?.size || 0,
                manifestCodec,
                segmentMeta
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
                html`<div class="p-8">
                    Comparison Mode active (Not implemented in inspector view)
                </div>`,
                this
            );
            return;
        }

        const tabs = [{ key: 'overview', label: 'Overview' }];

        // Only show Deep Analysis if data is available
        if (vm.bitstream) {
            tabs.push({ key: 'deep-analysis', label: 'Deep Analysis' });
            if (
                vm.bitstream.seiMessages &&
                vm.bitstream.seiMessages.length > 0
            ) {
                tabs.push({ key: 'sei', label: 'SEI & Metadata' });
            }
        }

        if (['isobmff', 'ts'].includes(vm.format)) {
            tabs.push({ key: 'structure', label: 'Structure' });
        }

        tabs.push({ key: 'raw', label: 'Raw / Hex' });

        const renderOverview = () => html`
            <div
                class="absolute inset-0 overflow-y-auto p-4 custom-scrollbar animate-fadeIn"
            >
                <segment-general-summary .vm=${vm}></segment-general-summary>
                ${vm.format === 'scte35'
                ? html`<div class="mt-6">
                          ${scte35DetailsTemplate(parsedData.data)}
                      </div>`
                : ''}
                ${vm.format === 'vtt'
                ? html`<div class="mt-6">
                          ${vttAnalysisTemplate(parsedData.data)}
                      </div>`
                : ''}
                ${vm.format === 'ttml'
                ? html`<div class="mt-6">
                          ${ttmlAnalysisTemplate(parsedData.data)}
                      </div>`
                : ''}
                ${this._isAnalyzing
                ? html`<div class="p-4 text-center text-blue-400 font-bold text-sm animate-pulse">
                          Running Deep Bitstream Analysis...
                      </div>`
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
                ? html`<div
                          class="grow overflow-y-auto p-4 custom-scrollbar space-y-2"
                      >
                          ${parsedData.data.boxes.map((box) =>
                    isoBoxTreeTemplate(box, { isIFrame })
                )}
                      </div>`
                : html`<div
                          class="h-full w-full border border-slate-800 overflow-hidden"
                      >
                          ${structureContentTemplate({ data: parsedData.data })}
                      </div>`}
            </div>
        `;

        const renderRawView = () => {
            const { get } = useSegmentCacheStore.getState();
            const entry = get(this._data.uniqueId);
            const buffer = entry?.data;
            const maps = parsedData.byteMap || null;

            if (!buffer) {
                return html`<div class="p-8 text-center text-slate-500">Data not available for raw view.</div>`;
            }

            return html`
                <div class="absolute inset-0 flex flex-col bg-slate-900">
                    ${hexViewTemplate(buffer, maps)}
                </div>
            `;
        };

        const content = html`
            <div class="flex flex-col h-full bg-slate-900 text-slate-200">
                <div
                    class="shrink-0 px-4 pt-4 pb-0 border-b border-slate-800 bg-slate-900 sticky top-0 z-20"
                >
                    <div class="w-full max-w-xl">
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
                    ${this._activeTab === 'sei' && vm.bitstream
                ? seiInspectorTemplate(vm.bitstream.seiMessages)
                : ''}
                    ${this._activeTab === 'structure' ? renderStructure() : ''}
                    ${this._activeTab === 'raw' ? renderRawView() : ''}
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