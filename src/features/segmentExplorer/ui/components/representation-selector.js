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
        'p-3 rounded-lg border-2 cursor-pointer transition-colors duration-150 ease-in-out text-left w-full';
    const activeClasses = 'bg-blue-900/50 border-blue-600';
    const inactiveClasses =
        'bg-slate-800/50 border-slate-700 hover:border-blue-500/50 hover:bg-slate-700/50';

    let details;
    if (rep.contentType === 'video') {
        const resolution =
            rep.width?.value && rep.height?.value
                ? `${rep.width.value}x${rep.height.value}`
                : 'N/A';
        details = html`<span class="text-xs text-slate-400 font-mono"
            >${formatBitrate(rep.bandwidth)} | ${resolution}</span
        >`;
    } else if (rep.contentType === 'audio') {
        details = html`<span class="text-xs text-slate-400 font-mono"
            >Lang: ${rep.lang || 'und'} |
            ${formatBitrate(rep.bandwidth || 0)}</span
        >`;
    } else {
        details = html`<span class="text-xs text-slate-400 font-mono"
            >Lang: ${rep.lang || 'und'}</span
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
            <p class="font-semibold text-sm text-slate-200 truncate">
                ID: ${rep.id || 'N/A'}
            </p>
            ${rep.label
                ? html`<p class="text-xs text-slate-300 truncate">
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
            <div
                class="text-xs font-semibold text-slate-400 px-2 flex items-center gap-2"
            >
                <span>${title}:</span>
                <span class="font-mono text-slate-300">${value}</span>
            </div>
            <div class="pl-2 pt-2 space-y-2">
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
                class="list-none cursor-pointer flex items-center p-3 rounded-md bg-slate-800 hover:bg-slate-700/50"
            >
                <span class="font-bold text-slate-200">Period</span>
                <span class="font-mono text-sm text-slate-300 ml-2"
                    >${period.id || `(index ${index})`}</span
                >
                <span
                    class="ml-auto text-slate-400 transition-transform duration-200 group-open:rotate-90"
                >
                    ${icons.chevronDown}
                </span>
            </summary>
            <div class="pl-3 pt-2 space-y-2 border-l-2 border-slate-700 ml-3">
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
        'p-3 rounded-lg border-2 cursor-pointer transition-colors duration-150 ease-in-out text-left w-full';
    const activeClasses = 'bg-blue-900/50 border-blue-600';
    const inactiveClasses =
        'bg-slate-800/50 border-slate-700 hover:border-blue-500/50 hover:bg-slate-700/50';

    let label = 'Unknown';
    let details = `ID: ${rep.id}`;
    if (rep.contentType === 'video') {
        label = `${rep.height?.value || '?'}p`;
        details = formatBitrate(rep.bandwidth);
    } else if (rep.contentType === 'audio' || rep.contentType === 'text') {
        label =
            rep.serializedManifest.NAME || rep.lang || `Rendition ${rep.id}`;
        details = `Lang: ${rep.lang || 'und'}`;
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
                class="font-semibold text-sm text-slate-200 truncate"
                title=${label}
            >
                ${label}
            </p>
            <p
                class="text-xs text-slate-400 font-mono truncate"
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
                class="list-none cursor-pointer flex items-center p-3 rounded-md bg-slate-800 hover:bg-slate-700/50"
            >
                <span class="font-bold text-slate-200">${groupTitle}</span>
                <span
                    class="ml-auto text-slate-400 transition-transform duration-200 group-open:rotate-90"
                >
                    ${icons.chevronDown}
                </span>
            </summary>
            <div class="pl-3 pt-2 space-y-2 border-l-2 border-slate-700 ml-3">
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
            <div class="p-4 text-sm text-slate-400 text-center">
                Representation selection is not applicable for this stream type.
            </div>
        `;
    }

    return html`
        <div class="flex flex-col h-full">
            <header class="p-3 border-b border-slate-700 shrink-0">
                <h3 class="font-bold text-slate-200">Representations</h3>
            </header>
            <div class="shrink-0 px-2 pt-2">
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
            <div class="grow overflow-y-auto p-2 space-y-2">${content}</div>
        </div>
    `;
};
