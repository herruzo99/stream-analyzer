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

/**
 * A collapsible card for an individual stream, containing its pollable tracks.
 */
const streamPollingCard = (stream) => {
    const { segmentPollingSelectorState } = useUiStore.getState();
    const isExpanded = segmentPollingSelectorState.expandedStreamIds.has(
        stream.id
    );

    const repsByType =
        stream.protocol === 'dash'
            ? stream.manifest.periods.reduce((acc, p, pIndex) => {
                  p.adaptationSets.forEach((as) => {
                      const type = as.contentType || 'unknown';
                      if (!acc[type]) acc[type] = [];
                      acc[type].push(
                          ...as.representations.map((r) => ({
                              rep: r,
                              as,
                              pIndex,
                              pId: p.id,
                          }))
                      );
                  });
                  return acc;
              }, {})
            : {
                  video: stream.manifest.periods[0].adaptationSets.filter(as => as.contentType === 'video').flatMap(as => as.representations.map(r => ({ rep: r, as }))),
                  audio: (stream.manifest.periods[0]?.adaptationSets || [])
                      .filter((as) => as.contentType === 'audio')
                      .flatMap((as) =>
                          as.representations.map((r) => ({ rep: r, as }))
                      ),
              };

    const tabs = [];
    if (repsByType.video?.length > 0)
        tabs.push({ key: 'video', label: 'Video' });
    if (repsByType.audio?.length > 0)
        tabs.push({ key: 'audio', label: 'Audio' });

    const activeTab =
        segmentPollingSelectorState.tabState.get(stream.id) || 'video';
    const onTabClick = (tab) => {
        uiActions.setSegmentPollingTab(stream.id, tab);
    };

    let content;
    if (activeTab === 'video') {
        content = (repsByType.video || []).map(
            ({ rep, pIndex, pId, as }) => {
                const repId = rep.id;
                const label = `${rep.height?.value || '?'}p / ${rep.id}`;
                const subtext = formatBitrate(rep.bandwidth);
                return trackToggleCard(stream, repId, { label, subtext });
            }
        );
    } else if (activeTab === 'audio') {
        content = (repsByType.audio || []).map(({ rep, as }) => {
            const repId = rep.id;
            const label = `[${as.lang || 'und'}] ${rep.id}`;
            const subtext = formatBitrate(rep.bandwidth);
            return trackToggleCard(stream, repId, { label, subtext });
        });
    }

    const allRepIdsInStream = Object.values(repsByType)
        .flat()
        .map(({ rep }) => rep.id)
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
        <details
            class="group bg-slate-900 rounded-lg border border-slate-700"
            ?open=${isExpanded}
        >
            <summary
                @click=${(e) => {
                    e.preventDefault();
                    uiActions.toggleSegmentPollingSelectorGroup(stream.id);
                }}
                class="list-none cursor-pointer flex items-center p-3"
            >
                <span class="font-semibold text-slate-200 truncate"
                    >${stream.name}</span
                >
                <span
                    class="ml-auto text-slate-400 transition-transform duration-200 group-open:rotate-180"
                    >${icons.chevronDown}</span
                >
            </summary>
            <div class="p-3 border-t border-slate-700">
                <div class="flex justify-between items-center mb-3">
                    <label
                        for="toggle-all-${stream.id}"
                        class="text-sm font-semibold text-slate-300"
                        >Poll All Tracks</label
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
                ${connectedTabBar(tabs, activeTab, onTabClick)}
                <div class="mt-3 space-y-2 bg-slate-900 p-3 rounded-b-lg">
                    ${content}
                </div>
            </div>
        </details>
    `;
};

/**
 * Renders a summary header for the polling dropdown.
 */
const summaryHeaderTemplate = (liveStreams) => {
    const totalReps = liveStreams.reduce(
        (sum, s) => sum + s.segmentPollingReps.size,
        0
    );
    const totalStreams = liveStreams.filter(
        (s) => s.segmentPollingReps.size > 0
    ).length;

    return html`
        <div
            class="bg-slate-900 p-3 rounded-lg border border-slate-700 text-center"
        >
            <p class="text-2xl font-bold text-white">${totalReps}</p>
            <p class="text-sm text-slate-400">
                Representations polling across ${totalStreams} stream(s)
            </p>
        </div>
    `;
};

export const segmentPollingSelectorTemplate = () => {
    // --- ARCHITECTURAL FIX: Fetch state within the template function ---
    const { streams } = useAnalysisStore.getState();
    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');
    // --- END FIX ---

    return html`
        <div
            id="polling-dropdown-panel"
            class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-96 p-3 space-y-3 max-h-[70vh] overflow-y-auto"
        >
            ${summaryHeaderTemplate(liveStreams)}
            ${liveStreams.map(streamPollingCard)}
        </div>
    `;
};