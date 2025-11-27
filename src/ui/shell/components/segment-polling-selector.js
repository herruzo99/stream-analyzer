import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

const representationToggle = (stream, rep, subtext) => {
    const isChecked = stream.segmentPollingReps.has(rep.id);
    const toggle = () =>
        analysisActions.toggleSegmentPollingForRep(stream.id, rep.id);

    return html`
        <div
            @click=${toggle}
            class="flex items-center justify-between p-2 rounded hover:bg-slate-800/50 cursor-pointer group transition-colors border border-transparent hover:border-slate-700"
        >
            <div class="flex items-center gap-3 min-w-0">
                <div
                    class="w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-slate-600 group-hover:border-slate-400'}"
                >
                    ${isChecked
                        ? html`<span class="text-white scale-75"
                              >${icons.checkCircle}</span
                          >`
                        : ''}
                </div>
                <div class="min-w-0">
                    <div
                        class="text-xs font-bold text-slate-300 group-hover:text-white truncate"
                    >
                        ${rep.id}
                    </div>
                    <div class="text-[10px] text-slate-500 font-mono">
                        ${subtext}
                    </div>
                </div>
            </div>
        </div>
    `;
};

const streamSection = (stream) => {
    const { segmentPollingSelectorState } = useUiStore.getState();
    const isExpanded = segmentPollingSelectorState.expandedStreamIds.has(
        stream.id
    );
    const toggleExpand = () =>
        uiActions.toggleSegmentPollingSelectorGroup(stream.id);

    // Group Reps
    const videoReps = [];
    const audioReps = [];

    if (stream.protocol === 'dash') {
        stream.manifest.periods.forEach((p) => {
            p.adaptationSets.forEach((as) => {
                const type = as.contentType || 'unknown';
                const list = type === 'video' ? videoReps : audioReps; // Simplified grouping
                as.representations.forEach((r) =>
                    list.push({ ...r, lang: as.lang })
                );
            });
        });
    } else {
        // HLS logic (simplified)
        // ... Assuming IR structure
    }

    // Only render if we have reps. If generic or empty, show fallback
    if (videoReps.length === 0 && audioReps.length === 0) return '';

    const activeCount = Array.from(stream.segmentPollingReps).length;

    return html`
        <div
            class="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden transition-all"
        >
            <button
                @click=${toggleExpand}
                class="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
                <div class="flex items-center gap-2 min-w-0">
                    <span class="font-bold text-sm text-white truncate"
                        >${stream.name}</span
                    >
                    ${activeCount > 0
                        ? html`<span
                              class="px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold"
                              >${activeCount} Active</span
                          >`
                        : ''}
                </div>
                <span
                    class="text-slate-500 transition-transform duration-200 ${isExpanded
                        ? 'rotate-180'
                        : ''}"
                >
                    ${icons.chevronDown}
                </span>
            </button>

            ${isExpanded
                ? html`
                      <div
                          class="p-2 border-t border-slate-700 space-y-4 bg-slate-950/30"
                      >
                          ${videoReps.length > 0
                              ? html`
                                    <div>
                                        <h5
                                            class="px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1"
                                        >
                                            Video
                                        </h5>
                                        <div class="grid grid-cols-2 gap-1">
                                            ${videoReps.map((r) =>
                                                representationToggle(
                                                    stream,
                                                    r,
                                                    `${r.height}p • ${formatBitrate(r.bandwidth)}`
                                                )
                                            )}
                                        </div>
                                    </div>
                                `
                              : ''}
                          ${audioReps.length > 0
                              ? html`
                                    <div>
                                        <h5
                                            class="px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1"
                                        >
                                            Audio
                                        </h5>
                                        <div class="grid grid-cols-2 gap-1">
                                            ${audioReps.map((r) =>
                                                representationToggle(
                                                    stream,
                                                    r,
                                                    `${r.lang || 'und'} • ${formatBitrate(r.bandwidth)}`
                                                )
                                            )}
                                        </div>
                                    </div>
                                `
                              : ''}
                      </div>
                  `
                : ''}
        </div>
    `;
};

export const segmentPollingSelectorTemplate = () => {
    const { streams } = useAnalysisStore.getState();
    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');

    return html`
        <div
            class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-[32rem] ring-1 ring-black/50 flex flex-col max-h-[70vh]"
        >
            <div class="p-4 border-b border-white/5 bg-white/[0.02]">
                <h3 class="font-bold text-white flex items-center gap-2">
                    ${icons.download} Segment Polling
                </h3>
                <p class="text-xs text-slate-400 mt-1">
                    Select tracks to actively download segments for. Essential
                    for detecting in-band events like SCTE-35.
                </p>
            </div>

            <div class="p-3 space-y-3 overflow-y-auto custom-scrollbar grow">
                ${liveStreams.length > 0
                    ? liveStreams.map(streamSection)
                    : html`<div
                          class="p-8 text-center text-slate-500 italic text-sm"
                      >
                          No live streams available.
                      </div>`}
            </div>
        </div>
    `;
};
