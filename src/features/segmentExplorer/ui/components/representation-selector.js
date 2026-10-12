import { eventBus } from '@/application/event-bus';
import { uiActions, useUiStore } from '@/state/uiStore';
import { connectedTabBar } from '@/ui/components/tabs';
import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

// --- DASH Specific Templates ---
const dashRepresentationCardTemplate = (rep, activeRepId, compositeKey) => {
    const isActive = activeRepId === compositeKey;
    const baseClasses =
        'p-3 rounded-md border cursor-pointer transition-colors text-left w-full';
    const activeClasses =
        'border-emerald-400/40 bg-emerald-500/[0.06]';
    const inactiveClasses =
        'border-white/5 bg-white/[0.02] hover:border-white/25';

    let details;
    if (rep.contentType === 'video') {
        const resolution =
            rep.width?.value && rep.height?.value
                ? `${rep.width.value}x${rep.height.value}`
                : 'n/a';
        details = html`<span
            class="mono text-[11px] text-slate-500"
            >${formatBitrate(rep.bandwidth)} · ${resolution}</span
        >`;
    } else if (rep.contentType === 'audio') {
        details = html`<span
            class="mono text-[11px] text-slate-500"
            >${rep.lang || 'und'} ·
            ${formatBitrate(rep.bandwidth || 0)}</span
        >`;
    } else {
        details = html`<span
            class="mono text-[11px] text-slate-500"
            >${rep.lang || 'und'}</span
        >`;
    }

    return html`
        <button
            @click=${() =>
                eventBus.dispatch(
                    'ui:segment-explorer:representation-selected',
                    { repId: compositeKey }
                )}
            class="${baseClasses} ${isActive ? activeClasses : inactiveClasses}"
        >
            <p
                class="text-[13px] font-medium text-slate-200 truncate"
            >
                ${rep.id || 'n/a'}
            </p>
            ${rep.label
                ? html`<p
                      class="text-xs text-slate-400 truncate"
                  >
                      ${rep.label}
                  </p>`
                : ''}
            ${details}
        </button>
    `;
};

const dashAdaptationSetGroupTemplate = (
    as,
    periodId,
    activeRepId,
    sortedReps
) => {
    if (sortedReps.length === 0) return '';

    let title, value;
    if (as.id) {
        title = 'AdaptationSet ID';
        value = as.id;
    } else if (as.lang) {
        title = 'Language';
        value = as.lang;
    } else {
        title = 'Group';
        value = as.group ?? 'Ungrouped';
    }

    return html`
        <div class="mt-2">
            <p class="mono text-[11px] text-slate-500 px-2">
                ${title} · ${value}
            </p>
            <div class="pl-2 pt-2 space-y-1.5">
                ${sortedReps.map((rep) => {
                    const compositeKey = `${periodId}-${rep.id}`;
                    return dashRepresentationCardTemplate(
                        { ...rep, contentType: as.contentType, lang: as.lang },
                        activeRepId,
                        compositeKey
                    );
                })}
            </div>
        </div>
    `;
};

const dashPeriodGroupTemplate = (period, index, activeRepId, activeTab) => {
    const periodId = period.id || index;
    const { segmentExplorerClosedGroups } = useUiStore.getState();
    const groupId = `period-${periodId}`;
    const isOpen = !segmentExplorerClosedGroups.has(groupId);

    const adaptationSetsForTab = period.adaptationSets.filter((as) => {
        if (activeTab === 'text') {
            return (
                as.contentType === 'text' || as.contentType === 'application'
            );
        }
        return as.contentType === activeTab;
    });
    if (adaptationSetsForTab.length === 0) return '';

    return html`
        <details class="group" ?open=${isOpen}>
            <summary
                @click=${(e) => {
                    e.preventDefault();
                    uiActions.toggleSegmentExplorerGroup(groupId);
                }}
                class="list-none cursor-pointer flex items-center px-3 py-2.5 rounded-md hover:bg-white/[0.02] transition-colors"
            >
                <span class="text-[13px] font-medium text-slate-200"
                    >period</span
                >
                <span
                    class="mono text-[11px] text-slate-500 ml-2"
                    >${period.id || `(index ${index})`}</span
                >
                <span
                    class="ml-auto text-slate-600 transition-transform duration-200 group-open:rotate-90"
                >
                    ${icons.chevronDown}
                </span>
            </summary>
            <div
                class="pl-3 pt-2 space-y-2 border-l border-white/10 ml-3"
            >
                ${adaptationSetsForTab.map((as) => {
                    const sortedReps = [...as.representations].sort((a, b) => {
                        const heightA = a.height?.value || 0;
                        const heightB = b.height?.value || 0;
                        if (heightA !== heightB) return heightB - heightA;

                        const widthA = a.width?.value || 0;
                        const widthB = b.width?.value || 0;
                        if (widthA !== widthB) return widthB - widthA;

                        return (b.bandwidth || 0) - (a.bandwidth || 0);
                    });
                    return dashAdaptationSetGroupTemplate(
                        as,
                        periodId,
                        activeRepId,
                        sortedReps
                    );
                })}
            </div>
        </details>
    `;
};

// --- HLS Specific Templates ---

const hlsRepresentationCardTemplate = (rep, activeRepId) => {
    const isActive = activeRepId === rep.id;
    const baseClasses =
        'p-3 rounded-md border cursor-pointer transition-colors text-left w-full';
    const activeClasses =
        'border-emerald-400/40 bg-emerald-500/[0.06]';
    const inactiveClasses =
        'border-white/5 bg-white/[0.02] hover:border-white/25';

    let label = 'unknown';
    let details = `${rep.id}`;
    if (rep.contentType === 'video') {
        label = `${rep.height?.value || '?'}p`;
        details = formatBitrate(rep.bandwidth);
    } else if (rep.contentType === 'audio' || rep.contentType === 'text') {
        label =
            rep.serializedManifest.NAME || rep.lang || `rendition ${rep.id}`;
        details = `${rep.lang || 'und'}`;
    }

    return html`
        <button
            @click=${() =>
                eventBus.dispatch(
                    'ui:segment-explorer:representation-selected',
                    { repId: rep.id }
                )}
            class="${baseClasses} ${isActive ? activeClasses : inactiveClasses}"
        >
            <p
                class="text-[13px] font-medium text-slate-200 truncate"
                title=${label}
            >
                ${label}
            </p>
            <p
                class="mono text-[11px] text-slate-500 truncate"
                title=${details}
            >
                ${details}
            </p>
        </button>
    `;
};

const hlsGroupTemplate = (groupTitle, reps, activeRepId, groupType) => {
    const { segmentExplorerClosedGroups } = useUiStore.getState();
    const groupId = `${groupType}-${groupTitle}`;
    const isOpen = !segmentExplorerClosedGroups.has(groupId);
    if (!reps || reps.length === 0) return '';

    return html`
        <details class="group" ?open=${isOpen}>
            <summary
                @click=${(e) => {
                    e.preventDefault();
                    uiActions.toggleSegmentExplorerGroup(groupId);
                }}
                class="list-none cursor-pointer flex items-center px-3 py-2.5 rounded-md hover:bg-white/[0.02] transition-colors"
            >
                <span class="text-[13px] font-medium text-slate-200"
                    >${groupTitle}</span
                >
                <span
                    class="ml-auto text-slate-600 transition-transform duration-200 group-open:rotate-90"
                >
                    ${icons.chevronDown}
                </span>
            </summary>
            <div
                class="pl-3 pt-2 space-y-1.5 border-l border-white/10 ml-3"
            >
                ${reps.map((rep) =>
                    hlsRepresentationCardTemplate(rep, activeRepId)
                )}
            </div>
        </details>
    `;
};

// --- Main Template ---

export const representationSelectorTemplate = (stream) => {
    const { segmentExplorerActiveTab, segmentExplorerActiveRepId } =
        useUiStore.getState();
    const summary = stream.manifest?.summary;

    const availableTabs = [];
    if (summary?.videoTracks?.length > 0)
        availableTabs.push({ key: 'video', label: 'Video' });
    if (summary?.audioTracks?.length > 0)
        availableTabs.push({ key: 'audio', label: 'Audio' });
    if (summary?.textTracks?.length > 0)
        availableTabs.push({ key: 'text', label: 'Text' });

    let content;
    if (stream.protocol === 'dash') {
        content = html`
            <div class="space-y-2">
                ${stream.manifest.periods.map((period, index) =>
                    dashPeriodGroupTemplate(
                        period,
                        index,
                        segmentExplorerActiveRepId,
                        segmentExplorerActiveTab
                    )
                )}
            </div>
        `;
    } else if (stream.protocol === 'hls' && stream.manifest?.isMaster) {
        const allReps = stream.manifest.periods[0].adaptationSets.flatMap(
            (as) =>
                as.representations.map((r) => ({
                    ...r,
                    contentType: as.contentType,
                    lang: as.lang,
                    roles: as.roles?.map((role) => role.value) || [],
                }))
        );

        if (segmentExplorerActiveTab === 'video') {
            const videoReps = allReps.filter(
                (r) => r.contentType === 'video' && !r.roles.includes('trick')
            );
            const iFrameReps = allReps.filter(
                (r) => r.contentType === 'video' && r.roles.includes('trick')
            );

            const videoGroups = videoReps.reduce((acc, rep) => {
                const groupKey = rep.videoRange || 'SDR';
                if (!acc[groupKey]) acc[groupKey] = [];
                acc[groupKey].push(rep);
                return acc;
            }, {});

            const iFrameGroups = iFrameReps.reduce((acc, rep) => {
                const groupKey = rep.videoRange || 'SDR';
                if (!acc[groupKey]) acc[groupKey] = [];
                acc[groupKey].push(rep);
                return acc;
            }, {});

            content = html`
                ${Object.entries(videoGroups).map(([group, reps]) =>
                    hlsGroupTemplate(
                        `Video (${group})`,
                        reps,
                        segmentExplorerActiveRepId,
                        `video-${group}`
                    )
                )}
                ${Object.entries(iFrameGroups).map(([group, reps]) =>
                    hlsGroupTemplate(
                        `I-Frame (${group})`,
                        reps,
                        segmentExplorerActiveRepId,
                        `iframe-${group}`
                    )
                )}
            `;
        } else {
            const repsForTab = allReps.filter(
                (r) =>
                    r.contentType === segmentExplorerActiveTab ||
                    (segmentExplorerActiveTab === 'text' &&
                        r.contentType === 'subtitles')
            );
            const groups = repsForTab.reduce((acc, rep) => {
                const groupId = rep.serializedManifest['GROUP-ID'] || 'default';
                if (!acc[groupId]) acc[groupId] = [];
                acc[groupId].push(rep);
                return acc;
            }, {});
            content = html`
                ${Object.entries(groups).map(([groupId, reps]) =>
                    hlsGroupTemplate(
                        `Group: ${groupId}`,
                        reps,
                        segmentExplorerActiveRepId,
                        groupId
                    )
                )}
            `;
        }
    } else {
        content = html`
            <div
                class="p-4 text-sm text-slate-400 text-center"
            >
                Representation selection is not applicable for this stream type.
            </div>
        `;
    }

    return html`
        <div class="flex flex-col h-full min-h-0 bg-[#06090f]">
            <div class="shrink-0 px-4 py-3 border-b border-white/5">
                <p class="mono text-[10px] text-slate-500">
                    representations
                </p>
            </div>
            <div class="shrink-0 px-3 pt-2">
                ${availableTabs.length > 0
                    ? connectedTabBar(
                          availableTabs,
                          segmentExplorerActiveTab,
                          (tab) =>
                              eventBus.dispatch(
                                  'ui:segment-explorer:tab-changed',
                                  {
                                      tab,
                                  }
                              )
                      )
                    : ''}
            </div>
            <div class="grow min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-1.5">${content}</div>
        </div>
    `;
};
