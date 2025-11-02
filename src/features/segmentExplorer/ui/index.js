import { html, render } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import { representationSelectorTemplate } from './components/representation-selector.js';
import { segmentTableTemplate } from './components/segment-table.js';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { toggleDropdown, closeDropdown } from '@/ui/services/dropdownService';
import * as icons from '@/ui/icons';
import { timeFilterTemplate } from './components/time-filter.js';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';

let container = null;
let analysisUnsubscribe = null;
let uiUnsubscribe = null;
let segmentCacheUnsubscribe = null;

function calculateTimeBounds(stream) {
    if (!stream || stream.protocol === 'local') {
        return { minTime: null, maxTime: null };
    }
    const allTimedSegments = [];
    const process = (segments) => {
        if (!segments) return;
        segments.forEach((seg) => {
            if (seg.startTimeUTC && seg.endTimeUTC) {
                allTimedSegments.push({
                    startTimeUTC: seg.startTimeUTC,
                    endTimeUTC: seg.endTimeUTC,
                });
            }
        });
    };
    if (stream.protocol === 'dash')
        stream.dashRepresentationState.forEach((s) => process(s.segments));
    else if (stream.protocol === 'hls')
        stream.hlsVariantState.forEach((s) => process(s.segments));
    if (allTimedSegments.length === 0) return { minTime: null, maxTime: null };
    const minTimestamp = Math.min(
        ...allTimedSegments.map((s) => s.startTimeUTC)
    );
    const maxTimestamp = Math.max(
        ...allTimedSegments.map((s) => s.endTimeUTC)
    );
    return {
        minTime: new Date(minTimestamp),
        maxTime: new Date(maxTimestamp),
    };
}

function renderExplorer() {
    if (!container) return;

    const { streams, activeStreamId, segmentsForCompare } =
        useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);
    const contextualSidebar = document.getElementById('contextual-sidebar');

    if (!stream) {
        segmentExplorerView.unmount();
        return;
    }

    const {
        segmentExplorerSortOrder,
        segmentExplorerTargetTime,
        segmentExplorerActiveRepId,
        segmentExplorerActiveTab,
    } = useUiStore.getState();

    if (!segmentExplorerActiveRepId && stream.protocol !== 'local') {
        let defaultRepId = null;
        if (stream.protocol === 'dash') {
            const firstPeriod = stream.manifest.periods[0];
            const firstRep =
                firstPeriod?.adaptationSets.find(
                    (as) => as.contentType === segmentExplorerActiveTab
                )?.representations[0] ||
                firstPeriod?.adaptationSets[0]?.representations[0];
            if (firstPeriod && firstRep) {
                defaultRepId = `${firstPeriod.id || 0}-${firstRep.id}`;
            }
        } else if (stream.protocol === 'hls' && stream.manifest?.isMaster) {
            const asContentType =
                segmentExplorerActiveTab === 'text'
                    ? 'subtitles'
                    : segmentExplorerActiveTab;
            const firstRendition = stream.manifest.periods[0].adaptationSets
                .filter((as) => as.contentType === asContentType)
                .flatMap((as) => as.representations)[0];
            defaultRepId =
                firstRendition?.__variantUri ||
                firstRendition?.serializedManifest.resolvedUri;
        }

        if (defaultRepId) {
            uiActions.setSegmentExplorerActiveRepId(defaultRepId);
            return;
        }
    }

    if (contextualSidebar) {
        render(representationSelectorTemplate(stream), contextualSidebar);
    }

    let tableContent;
    if (stream.protocol === 'local') {
        const repState = stream.dashRepresentationState.get('0-local-rep');
        tableContent = repState
            ? segmentTableTemplate({
                  id: 'local-rep',
                  segments: repState.segments
                      .slice()
                      .sort((a, b) =>
                          segmentExplorerSortOrder === 'asc'
                              ? a.number - b.number
                              : b.number - a.number
                      ),
                  stream,
                  currentSegmentUrls: repState.currentSegmentUrls,
                  newlyAddedSegmentUrls: repState.newlyAddedSegmentUrls,
                  segmentFormat: stream.manifest.segmentFormat,
              })
            : html`<p class="text-slate-400 p-4">No segments found.</p>`;
    } else {
        const repState =
            stream.dashRepresentationState.get(segmentExplorerActiveRepId) ||
            stream.hlsVariantState.get(segmentExplorerActiveRepId);
        if (!repState) {
            tableContent = html`<div
                class="text-center p-8 text-slate-500 h-full flex flex-col items-center justify-center"
            >
                ${icons.searchCode}
                <p class="mt-2 font-semibold">
                    Select a representation from the sidebar to view its
                    segments.
                </p>
            </div>`;
        } else {
            tableContent = segmentTableTemplate({
                id: segmentExplorerActiveRepId.replace(/[^a-zA-Z0-9]/g, '-'),
                rawId: segmentExplorerActiveRepId,
                segments: (repState.segments || [])
                    .slice()
                    .sort((a, b) =>
                        segmentExplorerSortOrder === 'asc'
                            ? a.number - b.number
                            : b.number - a.number
                    ),
                stream,
                currentSegmentUrls: repState.currentSegmentUrls,
                newlyAddedSegmentUrls: repState.newlyAddedSegmentUrls,
                segmentFormat: stream.manifest.segmentFormat,
                isLoading: repState.isLoading,
                error: repState.error,
            });
        }
    }

    const { minTime, maxTime } = calculateTimeBounds(stream);
    const isLive = stream.manifest?.type === 'dynamic';
    const hasTimeData = !!(minTime && maxTime) || !isLive;
    const sortIcon =
        segmentExplorerSortOrder === 'asc'
            ? icons.sortAscending
            : icons.sortDescending;
    const sortLabel =
        segmentExplorerSortOrder === 'asc' ? 'Oldest First' : 'Newest First';
    const timeFilterActive = !!segmentExplorerTargetTime;

    const template = html`
        <div class="flex flex-col h-full">
            <header
                class="flex flex-wrap justify-between items-center mb-4 gap-4 shrink-0"
            >
                <h3 class="text-xl font-bold">Segment Explorer</h3>
                <div
                    id="segment-explorer-controls"
                    class="flex items-center flex-wrap gap-4"
                >
                    <button
                        @click=${() =>
                            eventBus.dispatch(
                                'ui:segment-explorer:sort-toggled'
                            )}
                        class="bg-slate-700/50 hover:bg-slate-600/50 text-white font-bold py-2 px-3 rounded-md transition duration-300 flex items-center text-sm gap-2"
                    >
                        ${sortIcon}<span>${sortLabel}</span>
                    </button>
                    <button
                        @click=${(e) =>
                            hasTimeData &&
                            toggleDropdown(
                                e.currentTarget,
                                timeFilterTemplate({
                                    minTime,
                                    maxTime,
                                    currentTargetTime:
                                        segmentExplorerTargetTime,
                                    isLive,
                                    duration: stream.manifest.duration,
                                })
                            )}
                        ?disabled=${!hasTimeData}
                        class="bg-slate-700/50 hover:bg-slate-600/50 text-white font-bold py-2 px-3 rounded-md transition duration-300 flex items-center text-sm gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${timeFilterActive
                            ? 'ring-2 ring-blue-500'
                            : ''}"
                    >
                        ${icons.filter}<span>Locate by Time</span>
                    </button>
                    ${isLive
                        ? html`<button
                              @click=${() =>
                                  eventBus.dispatch(
                                      'ui:segment-explorer:time-target-set',
                                      { target: new Date() }
                                  )}
                              class="bg-red-700/50 hover:bg-red-600/50 text-white font-bold py-2 px-3 rounded-md transition duration-300 flex items-center text-sm gap-2"
                          >
                              ${icons.play}<span>Live</span>
                          </button>`
                        : ''}
                    <button
                        id="segment-compare-btn"
                        @click=${() =>
                            uiActions.setActiveTab('segment-comparison')}
                        class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md transition-colors flex items-center gap-2"
                    >
                        <span>Compare (${segmentsForCompare.length}/10)</span>
                    </button>
                </div>
            </header>
            <div
                class="grow overflow-hidden bg-slate-800 rounded-lg border border-slate-700 min-h-0"
            >
                ${tableContent}
            </div>
        </div>
    `;
    render(template, container);
}

export const segmentExplorerView = {
    hasContextualSidebar: true,
    mount(containerElement, { stream }) {
        container = containerElement;
        analysisUnsubscribe = useAnalysisStore.subscribe(renderExplorer);
        uiUnsubscribe = useUiStore.subscribe(renderExplorer);
        segmentCacheUnsubscribe =
            useSegmentCacheStore.subscribe(renderExplorer);

        const { segmentExplorerActiveRepId, segmentExplorerActiveTab } =
            useUiStore.getState();
        if (!segmentExplorerActiveRepId && stream.protocol !== 'local') {
            let defaultRepId = null;
            if (stream.protocol === 'dash') {
                const firstPeriod = stream.manifest.periods[0];
                const firstRep =
                    firstPeriod?.adaptationSets.find(
                        (as) => as.contentType === segmentExplorerActiveTab
                    )?.representations[0] ||
                    firstPeriod?.adaptationSets[0]?.representations[0];
                if (firstPeriod && firstRep) {
                    defaultRepId = `${firstPeriod.id || 0}-${firstRep.id}`;
                }
            } else if (stream.protocol === 'hls' && stream.manifest?.isMaster) {
                const asContentType =
                    segmentExplorerActiveTab === 'text'
                        ? 'subtitles'
                        : segmentExplorerActiveTab;
                const firstRendition = stream.manifest.periods[0].adaptationSets
                    .filter((as) => as.contentType === asContentType)
                    .flatMap((as) => as.representations)[0];
                defaultRepId =
                    firstRendition?.__variantUri ||
                    firstRendition?.serializedManifest.resolvedUri;
            }

            if (defaultRepId) {
                uiActions.setSegmentExplorerActiveRepId(defaultRepId);
            }
        } else if (stream.protocol === 'local' && !segmentExplorerActiveRepId) {
            uiActions.setSegmentExplorerActiveRepId('local-rep');
        } else {
            renderExplorer();
        }
    },
    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();
        if (segmentCacheUnsubscribe) segmentCacheUnsubscribe();
        analysisUnsubscribe = uiUnsubscribe = segmentCacheUnsubscribe = null;
        if (container) render(html``, container);
        container = null;
    },
};