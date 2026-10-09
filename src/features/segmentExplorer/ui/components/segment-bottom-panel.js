import { eventBus } from '@/application/event-bus';
import { getSegmentAnalysisTemplate } from '@/features/segmentAnalysis/ui/index';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const propertyRow = (label, value, isCode = false) => html`
    <div class="flex items-start justify-between gap-4">
        <span class="text-xs text-slate-400 shrink-0"
            >${label}</span
        >
        <span
            class="text-xs text-slate-200 text-right break-all ${isCode
        ? 'font-mono bg-slate-800 px-1 rounded'
        : 'font-medium'}"
        >
            ${value}
        </span>
    </div>
`;

export const segmentBottomPanelTemplate = (stream) => {
    const { segmentExplorerSelectedSegment, segmentExplorerActiveTab } =
        useUiStore.getState();
    const segment = segmentExplorerSelectedSegment;

    if (!segment) return null;

    const { get } = useSegmentCacheStore.getState();
    const cacheEntry = get(segment.uniqueId);
    const isLoaded = cacheEntry?.status === 200;
    const isLoading = cacheEntry?.status === -1;

    const close = () => uiActions.setSegmentExplorerSelectedSegment(null);

    const handleLoad = () => {
        const urlForInference = segment.resolvedUrl.startsWith('local://')
            ? segment.template
            : segment.resolvedUrl;

        const { contentType } = inferMediaInfoFromExtension(urlForInference);

        let formatHint =
            stream.manifest.segmentFormat === 'unknown'
                ? null
                : stream.manifest.segmentFormat;

        if (contentType === 'text') {
            const urlLower = urlForInference.toLowerCase();
            if (
                urlLower.endsWith('.ttml') ||
                urlLower.endsWith('.dfxp') ||
                urlLower.endsWith('.xml')
            ) {
                formatHint = 'ttml';
            } else {
                formatHint = 'vtt';
            }
        }

        useSegmentCacheStore.getState().set(segment.uniqueId, {
            status: -1,
            data: null,
            parsedData: null,
        });
        eventBus.dispatch('segment:fetch', {
            uniqueId: segment.uniqueId,
            streamId: stream.id,
            format: formatHint,
            context: { isIFrame: false },
        });
    };

    const handleDeepInspect = () =>
        uiActions.navigateToInteractiveSegment(segment.uniqueId);

    const fileName = segment.resolvedUrl
        ? segment.resolvedUrl.split('/').pop().split('?')[0]
        : 'Unknown';
    const durationSec = segment.timescale
        ? segment.duration / segment.timescale
        : 0;
    const startSec = segment.timescale ? segment.time / segment.timescale : 0;

    const isCompareMode = segmentExplorerActiveTab === 'segment-comparison';

    let rightPaneContent;
    if (isLoading) {
        rightPaneContent = html`
            <div
                class="flex flex-col items-center justify-center h-full text-blue-400 gap-3"
            >
                <div
                    class="scale-150 animate-spin drop-shadow-[0_0_10px_#3b82f6]"
                >
                    ${icons.spinner}
                </div>
                <p class="text-sm font-medium animate-pulse">
                    Downloading & Parsing Segment...
                </p>
            </div>
        `;
    } else if (!isLoaded) {
        rightPaneContent = html`
            <div
                class="flex flex-col items-center justify-center h-full text-slate-400 gap-6 relative overflow-hidden"
            >
                <!-- Ambient Background -->
                <div
                    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse-slow"
                ></div>

                <div
                    class="p-6 bg-slate-800 rounded-full border border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.2)] backdrop-blur-md relative z-10 group"
                >
                    <div
                        class="text-blue-400 group-hover:text-[#60a5fa] transition-colors duration-300 scale-125"
                    >
                        ${icons.binary}
                    </div>
                </div>
                <div class="text-center relative z-10 max-w-md px-6">
                    <p
                        class="text-lg font-bold text-slate-200 mb-2"
                    >
                        Segment Analysis Available
                    </p>
                    <p
                        class="text-sm text-slate-400 mb-6 leading-relaxed"
                    >
                        Load this segment to inspect its internal structure,
                        verify compliance, and analyze bitstream details in
                        depth.
                    </p>
                    <button
                        @click=${handleLoad}
                        class="bg-gradient-to-r from-[#60a5fa] to-blue-500 hover:from-blue-500 hover:to-[#60a5fa] text-white px-8 py-3 rounded-2xl font-bold text-sm transition-all shadow-[0_0_30px_color-mix(in_srgb,#3b82f6,transparent_60%)] hover:shadow-[0_0_40px_color-mix(in_srgb,#3b82f6,transparent_50%)] flex items-center gap-3 mx-auto hover:scale-105 active:scale-95 border border-white/10"
                    >
                        ${icons.download} Load & Analyze
                    </button>
                </div>
            </div>
        `;
    } else if (cacheEntry?.parsedData) {
        rightPaneContent = html`
            <div class="h-full overflow-hidden flex flex-col">
                <div class="grow min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                    ${getSegmentAnalysisTemplate(
            cacheEntry.parsedData,
            null,
            false,
            segment.uniqueId
        )}
                </div>
            </div>
        `;
    } else {
        rightPaneContent = html`
            <div
                class="flex items-center justify-center h-full text-red-400"
            >
                <p>Error: Data loaded but parsing failed.</p>
            </div>
        `;
    }

    return html`
        <div
            class="h-full shrink-0 border-t border-slate-800 bg-slate-800 backdrop-blur-3xl flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.6)] z-30 transition-all duration-300 ease-in-out w-full relative"
        >
            <!-- Header -->
            <div
                class="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-800 shrink-0"
            >
                <div class="flex items-center gap-4">
                    <div
                        class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 shadow-inner border border-blue-500/10"
                    >
                        ${icons.layers}
                    </div>
                    <div>
                        <h3
                            class="font-bold text-sm text-slate-200"
                        >
                            ${isCompareMode
            ? 'Segment Comparison'
            : 'Segment Details'}
                        </h3>
                        <p class="text-xs text-slate-400">
                            ${isCompareMode
            ? 'Comparing selected segments'
            : `Inspecting segment #${segment.number}`}
                        </p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${!isCompareMode
            ? html`
                              <button
                                  class="p-2 rounded-lg hover:bg-slate-900/50 text-slate-400 hover:text-slate-200 transition-colors"
                                  title="Download Segment"
                              >
                                  ${icons.download}
                              </button>
                          `
            : ''}
                    <button
                        @click=${close}
                        class="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors ml-2"
                    >
                        ${icons.x}
                    </button>
                </div>
            </div>

            <!-- Content -->
            <div
                class="grow overflow-hidden relative bg-slate-900/20"
            >
                ${isCompareMode
            ? getSegmentAnalysisTemplate(null, null, true) // Assuming this handles comparison mode
            : html`
                          <div class="h-full flex">
                              <!-- Left Pane: Details (Fixed Width) -->
                              <div
                                  class="w-80 shrink-0 border-r border-slate-800 flex flex-col bg-slate-800 backdrop-blur-sm"
                              >
                                  <div
                                      class="p-5 border-b border-slate-800/50"
                                  >
                                      <div class="flex items-center gap-2 mb-1">
                                          <span
                                              class="text-blue-400 drop-shadow-[0_0_5px_#3b82f6]"
                                              >${segment.type === 'Init'
                    ? icons.integrators
                    : icons.film}</span
                                          >
                                          <h3
                                              class="font-bold text-slate-200 text-base truncate"
                                          >
                                              ${segment.type === 'Init'
                    ? 'Init Segment'
                    : `Segment #${segment.number}`}
                                          </h3>
                                      </div>
                                      <p
                                          class="text-[10px] font-mono text-slate-400 truncate opacity-70"
                                          title="${fileName}"
                                      >
                                          ${fileName}
                                      </p>
                                  </div>

                                  <div
                                      class="p-5 overflow-y-auto space-y-6 custom-scrollbar"
                                  >
                                      ${isLoaded
                    ? html`
                                                <button
                                                    @click=${handleDeepInspect}
                                                    class="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-800 hover:from-blue-500/10 hover:to-blue-500/5 text-blue-400 hover:text-[#60a5fa] text-xs font-bold rounded-xl border border-blue-500/20 hover:border-blue-500/50 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_20px_#3b82f6/20] group"
                                                >
                                                    <span
                                                        class="group-hover:scale-110 transition-transform duration-300"
                                                        >${icons.binary}</span
                                                    >
                                                    Open Hex Inspector
                                                </button>
                                            `
                    : ''}
                                      <div>
                                          <h4
                                              class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"
                                          >
                                              ${icons.timer} Timing
                                          </h4>
                                          <div
                                              class="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-blue-500/10 shadow-lg backdrop-blur-md space-y-3 relative overflow-hidden group"
                                          >
                                              <div
                                                  class="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors duration-500"
                                              ></div>
                                              ${propertyRow(
                        'Duration',
                        `${durationSec.toFixed(3)}s`
                    )}
                                              ${propertyRow(
                        'PTS Start',
                        startSec.toFixed(3)
                    )}
                                              ${propertyRow(
                        'Timescale',
                        segment.timescale
                    )}
                                              ${segment.startTimeUTC
                    ? propertyRow(
                        'UTC',
                        new Date(
                            segment.startTimeUTC
                        ).toLocaleTimeString()
                    )
                    : ''}
                                          </div>
                                      </div>

                                      <div>
                                          <h4
                                              class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"
                                          >
                                              ${icons.server} Metadata
                                          </h4>
                                          <div
                                              class="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-purple-500/10 shadow-lg backdrop-blur-md space-y-3 relative overflow-hidden group"
                                          >
                                              <div
                                                  class="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-colors duration-500"
                                              ></div>
                                              ${propertyRow(
                        'Rep ID',
                        segment.repId,
                        true
                    )}
                                              ${propertyRow(
                        'Encrypted',
                        segment.encryptionInfo
                            ? 'Yes'
                            : 'No'
                    )}
                                              ${propertyRow(
                        'Gap',
                        segment.gap ? 'Yes' : 'No'
                    )}
                                          </div>
                                      </div>

                                      ${segment.sidx
                    ? html`
                                                <div>
                                                    <div
                                                        class="flex items-center justify-between mb-3"
                                                    >
                                                        <h4
                                                            class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"
                                                        >
                                                            ${icons.list} SIDX
                                                            Index
                                                        </h4>
                                                    </div>
                                                    <div
                                                        class="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-teal-500/10 shadow-lg backdrop-blur-md space-y-3 relative overflow-hidden group"
                                                    >
                                                        <div
                                                            class="absolute top-0 right-0 w-20 h-20 bg-teal-500/5 rounded-full blur-xl group-hover:bg-teal-500/10 transition-colors duration-500"
                                                        ></div>
                                                        ${propertyRow(
                        'Referenced Size',
                        `${segment.sidx.referencedSize} bytes`
                    )}
                                                        ${propertyRow(
                        'Subsegment Dur',
                        segment.sidx
                            .subsegmentDuration
                    )}
                                                        ${propertyRow(
                        'Starts w/ SAP',
                        segment.sidx
                            .startsWithSap
                            ? 'Yes'
                            : 'No'
                    )}
                                                        ${propertyRow(
                        'SAP Type',
                        segment.sidx
                            .sapType ||
                        'N/A'
                    )}
                                                        ${propertyRow(
                        'Type',
                        segment.sidx
                            .referenceType
                    )}
                                                    </div>
                                                </div>
                                            `
                    : ''}
                                  </div>
                              </div>

                              <!-- Right Pane: Analysis / Actions (Flexible) -->
                              <div class="grow min-w-0 bg-transparent relative">
                                  ${rightPaneContent}
                              </div>
                          </div>
                      `}
            </div>
        </div>
    `;
};
