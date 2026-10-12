import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

import '@/ui/core/BaseDropdown.js';

const representationToggle = (stream, rep, subtext) => {
    const isChecked = stream.segmentPollingReps.has(rep.id);
    const toggle = () =>
        analysisActions.toggleSegmentPollingForRep(stream.id, rep.id);

    return html`
        <button
            @click=${toggle}
            role="checkbox"
            aria-checked=${isChecked}
            aria-label="Poll ${rep.id}"
            class="w-full flex items-center justify-between gap-3 p-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors border border-transparent text-left"
        >
            <span class="flex items-center gap-3 min-w-0">
                <span
                    class="w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isChecked
                        ? 'bg-emerald-400 border-emerald-400'
                        : 'border-slate-600'}"
                >
                    ${isChecked
                        ? html`<span class="text-slate-950"
                              >${icons.check}</span
                          >`
                        : ''}
                </span>
                <span class="min-w-0">
                    <span
                        class="block text-[13px] font-medium text-slate-100 truncate"
                    >
                        ${rep.id}
                    </span>
                    <span class="mono block text-[10px] text-slate-500">
                        ${subtext}
                    </span>
                </span>
            </span>
        </button>
    `;
};

const streamSection = (stream) => {
    const { segmentPollingSelectorState } = useUiStore.getState();
    const isExpanded = segmentPollingSelectorState.expandedStreamIds.has(
        stream.id
    );
    const toggleExpand = () =>
        uiActions.toggleSegmentPollingSelectorGroup(stream.id);

    // Group Reps using Unified IR (Works for both DASH and HLS)
    const videoReps = [];
    const audioReps = [];

    if (stream.manifest && stream.manifest.periods) {
        stream.manifest.periods.forEach((p) => {
            p.adaptationSets.forEach((as) => {
                const type = as.contentType || 'unknown';
                // Simple categorization
                if (type === 'video') {
                    as.representations.forEach((r) =>
                        videoReps.push({ ...r, lang: as.lang })
                    );
                } else if (type === 'audio') {
                    as.representations.forEach((r) =>
                        audioReps.push({ ...r, lang: as.lang })
                    );
                }
            });
        });
    }

    // Only render if we have reps.
    if (videoReps.length === 0 && audioReps.length === 0) return '';

    const activeCount = Array.from(stream.segmentPollingReps).length;

    return html`
        <div
            class="bg-white/[0.02] rounded-md border border-white/5 overflow-hidden"
        >
            <button
                @click=${toggleExpand}
                aria-expanded=${isExpanded}
                class="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left"
            >
                <span class="flex items-center gap-2 min-w-0">
                    <span class="font-medium text-sm text-slate-100 truncate"
                        >${stream.name}</span
                    >
                    ${activeCount > 0
                        ? html`<span
                              class="mono px-1.5 py-px rounded bg-emerald-500/10 text-emerald-200 border border-emerald-400/25 text-[10px]"
                              >${activeCount} on</span
                          >`
                        : ''}
                </span>
                <span
                    class="text-slate-500 transition-transform ${isExpanded
                        ? 'rotate-180'
                        : ''}"
                >
                    ${icons.chevronDown}
                </span>
            </button>

            ${isExpanded
                ? html`
                      <div class="p-2 border-t border-white/5 space-y-3">
                          ${videoReps.length > 0
                        ? html`
                                    <div>
                                        <h5
                                            class="mono px-2 text-[10px] font-medium text-slate-600 mb-1"
                                        >
                                            video
                                        </h5>
                                        <div class="grid grid-cols-2 gap-1">
                                            ${videoReps.map((r) => {
                        // FIX: Handle structured height object or primitive fallback
                        const heightVal =
                            r.height?.value ??
                            r.height ??
                            '?';
                        return representationToggle(
                            stream,
                            r,
                            `${heightVal}p • ${formatBitrate(r.bandwidth)}`
                        );
                    })}
                                        </div>
                                    </div>
                                `
                    : ''}
                          ${audioReps.length > 0
                        ? html`
                                    <div>
                                        <h5
                                            class="mono px-2 text-[10px] font-medium text-slate-600 mb-1"
                                        >
                                            audio
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
        <base-dropdown class="w-80 sm:w-96 max-h-[70vh]">
            <div slot="header" class="px-4 py-3 border-b border-white/5">
                <h3
                    class="font-medium text-slate-100 flex items-center gap-2 text-sm"
                >
                    ${icons.download} Segment polling
                </h3>
                <p class="text-[11px] text-slate-500 mt-1">
                    Pick tracks to keep downloading. Needed to catch
                    in-band events like SCTE-35.
                </p>
            </div>

            <div class="p-2">
                ${liveStreams.length > 0
                    ? liveStreams.map(streamSection)
                    : html`<p
                          class="mono p-6 text-center text-[11px] text-slate-600"
                      >
                          No live streams available.
                      </p>`}
            </div>
        </base-dropdown>
    `;
};
