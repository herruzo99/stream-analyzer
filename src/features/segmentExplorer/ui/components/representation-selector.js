import { html } from 'lit-html';
import * as icons from '@/ui/icons';
import { eventBus } from '@/application/event-bus';
import { useUiStore, uiActions } from '@/state/uiStore';
import { formatBitrate } from '@/ui/shared/format';
import { connectedTabBar } from '@/ui/components/tabs';

const representationCardTemplate = (rep, activeRepId, compositeKey) => {
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
            ${details}
        </button>
    `;
};

const adaptationSetGroupTemplate = (as, periodId, activeRepId) => {
    if (as.representations.length === 0) return '';

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
                ${as.representations.map((rep) => {
                    const compositeKey = `${periodId}-${rep.id}`;
                    return representationCardTemplate(
                        { ...rep, contentType: as.contentType },
                        activeRepId,
                        compositeKey
                    );
                })}
            </div>
        </div>
    `;
};

const periodGroupTemplate = (period, index, activeRepId, activeTab) => {
    const periodId = period.id || index;
    const { segmentExplorerClosedGroups } = useUiStore.getState();
    const groupId = `period-${periodId}`;
    const isOpen = !segmentExplorerClosedGroups.has(groupId);

    const adaptationSetsForTab = period.adaptationSets.filter(
        (as) => as.contentType === activeTab
    );
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
                    class="ml-auto text-slate-400 transition-transform duration-200 group-open:rotate-180"
                >
                    ${icons.chevronDown}
                </span>
            </summary>
            <div class="pl-3 pt-2 space-y-2 border-l-2 border-slate-700 ml-3">
                ${adaptationSetsForTab.map((as) =>
                    adaptationSetGroupTemplate(as, periodId, activeRepId)
                )}
            </div>
        </details>
    `;
};

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
                    periodGroupTemplate(
                        period,
                        index,
                        segmentExplorerActiveRepId,
                        segmentExplorerActiveTab
                    )
                )}
            </div>
        `;
    } else if (stream.protocol === 'hls' && stream.manifest?.isMaster) {
        const renditions = stream.manifest.periods[0].adaptationSets
            .filter((as) => {
                if (segmentExplorerActiveTab === 'text') {
                    return (
                        as.contentType === 'text' ||
                        as.contentType === 'subtitles'
                    );
                }
                return as.contentType === segmentExplorerActiveTab;
            })
            .flatMap((as) =>
                as.representations.map((r) => ({
                    ...r,
                    id:
                        r.__variantUri ||
                        r.serializedManifest.resolvedUri ||
                        r.id,
                    contentType: as.contentType,
                    lang: as.lang,
                }))
            );
        content =
            renditions.length > 0
                ? html`<div class="space-y-2">
                      ${renditions.map((r) =>
                          representationCardTemplate(
                              r,
                              segmentExplorerActiveRepId,
                              r.id
                          )
                      )}
                  </div>`
                : '';
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