import { html } from 'lit-html';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { connectedTabBar } from '@/ui/components/tabs';

/**
 * A visually distinct toggle switch for a track.
 */
const trackToggleCard = (stream, repId, { label, subtext }) => {
    const isChecked = stream.segmentPollingReps.has(repId);
    const handleToggle = () => {
        analysisActions.toggleSegmentPollingForRep(stream.id, repId);
    };

    const baseClasses =
        'bg-slate-900/50 p-2 rounded-lg border border-slate-700 cursor-pointer transition-colors duration-150 ease-in-out text-left w-full';
    const hoverClasses = 'hover:bg-slate-700 hover:border-slate-500';

    return html`
        <button
            @click=${handleToggle}
            class="${baseClasses} ${hoverClasses} flex items-center gap-3"
        >
            <div
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${isChecked
                    ? 'bg-blue-600'
                    : 'bg-slate-600'}"
            >
                <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isChecked
                        ? 'translate-x-6'
                        : 'translate-x-1'}"
                ></span>
            </div>
            <div class="grow min-w-0">
                <span
                    class="font-semibold text-slate-200 text-sm truncate block"
                    >${label}</span
                >
                <span class="text-xs text-slate-400 font-mono truncate block"
                    >${subtext}</span
                >
            </div>
        </button>
    `;
};

const streamPollingCard = (stream) => {
    const { segmentPollingSelectorState } = useUiStore.getState();
    const activeTab =
        segmentPollingSelectorState.tabState.get(stream.id) || 'video';

    const repsByType =
        stream.protocol === 'dash'
            ? stream.manifest.periods.reduce((acc, p) => {
                  p.adaptationSets.forEach((as) => {
                      const type = as.contentType || 'unknown';
                      if (!acc[type]) acc[type] = [];
                      acc[type].push(...as.representations);
                  });
                  return acc;
              }, {})
            : {
                  video: stream.manifest.periods[0].adaptationSets
                      .filter((as) => as.contentType === 'video')
                      .flatMap((as) => as.representations),
                  audio: (
                      stream.manifest.periods[0]?.adaptationSets || []
                  ).filter((as) => as.contentType === 'audio'),
              };

    const tabs = [];
    if (repsByType.video?.length > 0)
        tabs.push({ key: 'video', label: 'Video' });
    if (repsByType.audio?.length > 0)
        tabs.push({ key: 'audio', label: 'Audio' });

    const onTabClick = (tab) => {
        uiActions.setSegmentPollingTab(stream.id, tab);
    };

    let content;
    if (activeTab === 'video') {
        content = (repsByType.video || []).map((rep) => {
            const label = `${rep.height?.value || '?'}p / ${rep.id}`;
            const subtext = formatBitrate(rep.bandwidth);
            return trackToggleCard(stream, rep.id, { label, subtext });
        });
    } else if (activeTab === 'audio') {
        content = (repsByType.audio || []).flatMap((as) =>
            as.representations.map((rep) => {
                const label = `[${as.lang || 'und'}] ${rep.id}`;
                const subtext = formatBitrate(rep.bandwidth);
                return trackToggleCard(stream, rep.id, { label, subtext });
            })
        );
    }

    const allRepIdsInStream = Object.values(repsByType)
        .flat()
        .flatMap((item) =>
            item.representations
                ? item.representations.map((r) => r.id)
                : [item.id]
        )
        .filter(Boolean);

    const isAllChecked = allRepIdsInStream.every((id) =>
        stream.segmentPollingReps.has(id)
    );

    const handleToggleAllForStream = () => {
        allRepIdsInStream.forEach((repId) => {
            const shouldBeChecked = !isAllChecked;
            const isCurrentlyChecked = stream.segmentPollingReps.has(repId);
            if (shouldBeChecked !== isCurrentlyChecked) {
                analysisActions.toggleSegmentPollingForRep(stream.id, repId);
            }
        });
    };

    return html`
        <div class="bg-slate-900 rounded-lg border border-slate-700">
            <header class="p-3 border-b border-slate-700">
                <div class="flex justify-between items-center">
                    <h4
                        class="font-semibold text-slate-200 truncate"
                        title=${stream.name}
                    >
                        ${stream.name}
                    </h4>
                    <div class="flex items-center gap-2">
                        <label
                            for="toggle-all-${stream.id}"
                            class="text-xs font-semibold text-slate-300"
                            >Poll All</label
                        >
                        <button
                            @click=${handleToggleAllForStream}
                            id="toggle-all-${stream.id}"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${isAllChecked
                                ? 'bg-blue-600'
                                : 'bg-slate-600'}"
                        >
                            <span
                                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAllChecked
                                    ? 'translate-x-6'
                                    : 'translate-x-1'}"
                            ></span>
                        </button>
                    </div>
                </div>
            </header>
            <div class="px-3 pt-3">
                ${connectedTabBar(tabs, activeTab, onTabClick)}
            </div>
            <div class="p-3 space-y-2 bg-slate-900/50 rounded-b-lg">
                ${content}
            </div>
        </div>
    `;
};

export const segmentPollingSelectorTemplate = () => {
    const { streams } = useAnalysisStore.getState();
    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');

    return html`
        <div
            class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-[28rem] p-3 space-y-4 max-h-[70vh] overflow-y-auto"
        >
            <h4 class="font-bold text-slate-200">Active Segment Polling</h4>
            <p class="text-xs text-slate-400 -mt-3">
                Automatically download and parse new segments for selected
                representations to discover in-band events like SCTE-35.
            </p>
            ${liveStreams.map(streamPollingCard)}
        </div>
    `;
};