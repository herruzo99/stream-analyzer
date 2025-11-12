import { html, render } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import { representationSelectorTemplate } from './components/representation-selector.js';
import { segmentTableTemplate } from './components/segment-table.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { toggleDropdown } from '@/ui/services/dropdownService';
import * as icons from '@/ui/icons';
import { timeFilterTemplate } from './components/time-filter.js';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';

let container = null;
let analysisUnsubscribe = null;
let uiUnsubscribe = null;
let segmentCacheUnsubscribe = null;

const findBoxRecursive = (boxes, predicateOrType) => {
    const predicate =
        typeof predicateOrType === 'function'
            ? predicateOrType
            : (box) => box.type === predicateOrType;

    if (!boxes) return null;
    for (const box of boxes) {
        if (predicate(box)) return box;
        if (box.children?.length > 0) {
            const found = findBoxRecursive(box.children, predicate);
            if (found) return found;
        }
    }
    return null;
};

const inferContentTypeFromSegments = (segments) => {
    if (!segments || segments.length === 0 || !segments[0].parsedData) {
        return 'unknown';
    }
    const { data, format } = segments[0].parsedData;
    if (format === 'isobmff') {
        if (findBoxRecursive(data.boxes, (b) => b.type === 'vmhd'))
            return 'video';
        if (findBoxRecursive(data.boxes, (b) => b.type === 'smhd'))
            return 'audio';
        if (findBoxRecursive(data.boxes, (b) => b.type === 'stpp'))
            return 'text';
    } else if (format === 'ts') {
        const pmtPid = [...(data.summary.pmtPids || [])][0];
        const program = data.summary.programMap[pmtPid];
        if (program && program.streams) {
            const streamTypeHex = Object.values(program.streams)[0];
            if (streamTypeHex) {
                const typeNum = parseInt(streamTypeHex, 16);
                const videoTypes = [0x01, 0x02, 0x1b, 0x24, 0x80];
                if (videoTypes.includes(typeNum)) return 'video';
                const audioTypes = [0x03, 0x04, 0x0f, 0x11, 0x81];
                if (audioTypes.includes(typeNum)) return 'audio';
            }
        }
    }
    return 'unknown';
};

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
    const maxTimestamp = Math.max(...allTimedSegments.map((s) => s.endTimeUTC));
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

    if (contextualSidebar) {
        render(representationSelectorTemplate(stream), contextualSidebar);
    }

    let tableContent;
    if (stream.protocol === 'local') {
        const repState = stream.dashRepresentationState.get('0-local-rep');
        const contentType = inferContentTypeFromSegments(repState?.segments);
        tableContent = segmentTableTemplate({
            id: 'local-rep',
            rawId: 'local-rep',
            title: 'Uploaded Segments',
            contentType: contentType,
            segments: repState?.segments
                .slice()
                .sort((a, b) =>
                    segmentExplorerSortOrder === 'asc'
                        ? a.number - b.number
                        : b.number - a.number
                ),
            stream,
            currentSegmentUrls: repState?.currentSegmentUrls,
            newlyAddedSegmentUrls: repState?.newlyAddedSegmentUrls,
            segmentFormat: stream.manifest.segmentFormat,
        });
    } else {
        const repState =
            stream.dashRepresentationState.get(segmentExplorerActiveRepId) ||
            stream.hlsVariantState.get(segmentExplorerActiveRepId);

        const contentType = segmentExplorerActiveTab;

        tableContent = segmentTableTemplate({
            id: segmentExplorerActiveRepId
                ? segmentExplorerActiveRepId.replace(/[^a-zA-Z0-9]/g, '-')
                : 'empty',
            rawId: segmentExplorerActiveRepId,
            title: `Segments for ${segmentExplorerActiveRepId}`,
            contentType: contentType,
            segments: (repState?.segments || [])
                .slice()
                .sort((a, b) =>
                    segmentExplorerSortOrder === 'asc'
                        ? a.number - b.number
                        : b.number - a.number
                ),
            stream,
            currentSegmentUrls: repState?.currentSegmentUrls,
            newlyAddedSegmentUrls: repState?.newlyAddedSegmentUrls,
            segmentFormat: stream.manifest.segmentFormat,
            isLoading: repState?.isLoading,
            error: repState?.error,
        });
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
                                () =>
                                    timeFilterTemplate({
                                        minTime,
                                        maxTime,
                                        currentTargetTime:
                                            segmentExplorerTargetTime,
                                        isLive,
                                        duration: stream.manifest.duration,
                                    }),
                                e
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
            <div class="grow min-h-0">${tableContent}</div>
        </div>
    `;
    render(template, container);
}

export const segmentExplorerView = {
    hasContextualSidebar: true,
    mount(containerElement, { stream }) {
        container = containerElement;
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();
        if (segmentCacheUnsubscribe) segmentCacheUnsubscribe();

        analysisUnsubscribe = useAnalysisStore.subscribe(renderExplorer);
        segmentCacheUnsubscribe =
            useSegmentCacheStore.subscribe(renderExplorer);
        uiUnsubscribe = useUiStore.subscribe(renderExplorer);

        if (
            stream.protocol === 'local' &&
            !useUiStore.getState().segmentExplorerActiveRepId
        ) {
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