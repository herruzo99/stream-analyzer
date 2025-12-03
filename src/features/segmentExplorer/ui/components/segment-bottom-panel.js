import { eventBus } from '@/application/event-bus';
import { getSegmentAnalysisTemplate } from '@/features/segmentAnalysis/ui/index';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const property = (label, value, copyable = false) => html`
    <div
        class="flex justify-between items-start py-1.5 border-b border-slate-800/50 last:border-0 group"
    >
        <span
            class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5"
            >${label}</span
        >
        <span
            class="text-xs font-mono text-slate-300 text-right truncate max-w-[180px] ${copyable
                ? 'select-all cursor-text'
                : ''}"
            title="${String(value)}"
            >${value}</span
        >
    </div>
`;

export const segmentBottomPanelTemplate = (stream) => {
    const { interactiveSegmentSelectedItem } = useUiStore.getState();
    // Normalize segment: Handle cases where it's wrapped or raw
    const segment =
        interactiveSegmentSelectedItem?.item || interactiveSegmentSelectedItem;

    if (!segment) return html``;

    const { get } = useSegmentCacheStore.getState();
    const cacheEntry = get(segment.uniqueId);
    const isLoaded = cacheEntry?.status === 200;
    const isLoading = cacheEntry?.status === -1;

    const close = () => uiActions.setInteractiveSegmentSelectedItem(null);

    const handleLoad = () => {
        const { contentType } = inferMediaInfoFromExtension(
            segment.resolvedUrl
        );
        const formatHint =
            contentType === 'text'
                ? 'vtt'
                : stream.manifest.segmentFormat === 'unknown'
                  ? null
                  : stream.manifest.segmentFormat;

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

    // Right Pane Content Logic
    let rightPaneContent;
    if (isLoading) {
        rightPaneContent = html`
            <div
                class="flex flex-col items-center justify-center h-full text-blue-400 gap-3"
            >
                <div class="scale-150 animate-spin">${icons.spinner}</div>
                <p class="text-sm font-medium">
                    Downloading & Parsing Segment...
                </p>
            </div>
        `;
    } else if (!isLoaded) {
        rightPaneContent = html`
            <div
                class="flex flex-col items-center justify-center h-full text-slate-500 gap-4"
            >
                <div class="p-4 bg-slate-800/50 rounded-full">
                    ${icons.binary}
                </div>
                <div class="text-center">
                    <p class="text-sm font-medium text-slate-300">
                        Segment Analysis Available
                    </p>
                    <p class="text-xs mt-1 mb-4">
                        Load the segment to view structure, compliance, and
                        bitstream details.
                    </p>
                    <button
                        @click=${handleLoad}
                        class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-md font-bold text-sm transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2 mx-auto"
                    >
                        ${icons.download} Load & Analyze
                    </button>
                </div>
            </div>
        `;
    } else if (cacheEntry?.parsedData) {
        // Embed the analysis view directly
        rightPaneContent = html`
            <div class="h-full overflow-hidden flex flex-col">
                <div class="grow min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                    ${getSegmentAnalysisTemplate(
                        cacheEntry.parsedData,
                        null,
                        false,
                        segment.uniqueId // Pass the uniqueId here
                    )}
                </div>
            </div>
        `;
    } else {
        rightPaneContent = html`
            <div class="flex items-center justify-center h-full text-red-400">
                <p>Error: Data loaded but parsing failed.</p>
            </div>
        `;
    }

    return html`
        <div
            class="h-128 bg-slate-900 border-t border-slate-700 flex flex-col shrink-0 animate-slideInUp shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-40 relative"
        >
            <!-- Window Controls: Safely positioned over the right panel -->
            <div class="absolute top-0 right-0 p-3 z-50">
                <button
                    @click=${close}
                    class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors bg-slate-900/50 backdrop-blur-sm border border-slate-700/50"
                >
                    ${icons.xCircle}
                </button>
            </div>

            <div class="flex h-full">
                <!-- Left Pane: Details (Fixed Width) -->
                <div
                    class="w-80 shrink-0 border-r border-slate-800 flex flex-col bg-slate-950/30"
                >
                    <div class="p-4 border-b border-slate-800/50">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-blue-400"
                                >${segment.type === 'Init'
                                    ? icons.integrators
                                    : icons.film}</span
                            >
                            <h3 class="font-bold text-white text-base truncate">
                                ${segment.type === 'Init'
                                    ? 'Init Segment'
                                    : `Segment #${segment.number}`}
                            </h3>
                        </div>
                        <p
                            class="text-[10px] font-mono text-slate-500 truncate"
                            title="${fileName}"
                        >
                            ${fileName}
                        </p>
                    </div>

                    <div class="p-4 overflow-y-auto space-y-6">
                        <div>
                            <h4
                                class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"
                            >
                                ${icons.timer} Timing
                            </h4>
                            <div
                                class="bg-slate-800/40 rounded px-3 border border-slate-800"
                            >
                                ${property(
                                    'Duration',
                                    `${durationSec.toFixed(3)}s`
                                )}
                                ${property('PTS Start', startSec.toFixed(3))}
                                ${property('Timescale', segment.timescale)}
                                ${segment.startTimeUTC
                                    ? property(
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
                                class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"
                            >
                                ${icons.server} Metadata
                            </h4>
                            <div
                                class="bg-slate-800/40 rounded px-3 border border-slate-800"
                            >
                                ${property('Rep ID', segment.repId, true)}
                                ${property(
                                    'Encrypted',
                                    segment.encryptionInfo ? 'Yes' : 'No'
                                )}
                                ${property('Gap', segment.gap ? 'Yes' : 'No')}
                            </div>
                        </div>

                        ${isLoaded
                            ? html`
                                  <button
                                      @click=${handleDeepInspect}
                                      class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-blue-200 text-xs font-bold rounded border border-slate-700 hover:border-blue-500/30 transition-all flex items-center justify-center gap-2"
                                  >
                                      ${icons.binary} Open Hex Inspector
                                  </button>
                              `
                            : ''}
                    </div>
                </div>

                <!-- Right Pane: Analysis / Actions (Flexible) -->
                <div class="grow min-w-0 p-4 bg-slate-900 relative">
                    ${rightPaneContent}
                </div>
            </div>
        </div>
    `;
};
