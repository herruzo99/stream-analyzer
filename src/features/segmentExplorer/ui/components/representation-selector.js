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
            >Lang: ${rep.lang || 'und'} | ${formatBitrate(
                rep.bandwidth || 0
            )}</span
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

const adaptationSetGroupTemplate = (as, periodId, activeRepId, asIndex) => {
    const hasVisibleRepresentations = as.representations.length > 0;
    if (!hasVisibleRepresentations) return '';

    const { segmentExplorerClosedGroups } = useUiStore.getState();
    const groupId = `as-${periodId}-${as.id || asIndex}`;
    const isOpen = !segmentExplorerClosedGroups.has(groupId);
    const title =
        as.id ||
        as.lang ||
        `Untitled AdaptationSet (${as.contentType}, index ${asIndex})`;

    return html`
        <details class="group" ?open=${isOpen}>
            <summary
                @click=${(e) => {
                    e.preventDefault();
                    uiActions.toggleSegmentExplorerGroup(groupId);
                }}
                class="list-none cursor-pointer flex items-center p-2 rounded-md hover:bg-slate-700/50"
            >
                <span class="font-semibold text-slate-400 text-xs"
                    >${title}</span
                >
                <span
                    class="ml-auto text-slate-400 transition-transform duration-200 ${isOpen
                        ? 'rotate-180'
                        : ''}"
                    >${icons.chevronDown}</span
                >
            </summary>
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
            ${stream.manifest.periods.map(
                (period, index) => html`
                    <div class="border-b border-slate-700/50 pb-2 mb-2">
                        <h4
                            class="text-xs font-bold uppercase tracking-wider text-slate-500 px-2"
                        >
                            Period: ${period.id || index}
                        </h4>
                        ${period.adaptationSets
                            .filter(
                                (as) => as.contentType === segmentExplorerActiveTab
                            )
                            .map((as, asIndex) =>
                                adaptationSetGroupTemplate(
                                    as,
                                    period.id || index,
                                    segmentExplorerActiveRepId,
                                    asIndex
                                )
                            )}
                    </div>
                `
            )}
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
                Representation selection is not applicable for this stream
                type.
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