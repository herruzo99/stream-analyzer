import { html, render } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { eventBus } from '@/application/event-bus';
import { getDashExplorerForType } from './components/dash/index.js';
import {
    getHlsExplorerForType,
    stopLiveSegmentHighlighter,
} from './components/hls/index.js';
import { getLocalExplorerForType } from './components/local/index.js';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { toggleDropdown, closeDropdown } from '@/ui/services/dropdownService';
import * as icons from '@/ui/icons';
import { timeFilterTemplate } from './components/time-filter.js';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { debugLog } from '@/shared/utils/debug';

let container = null;
let currentStreamId = null;
let analysisUnsubscribe = null;
let uiUnsubscribe = null;
let segmentCacheUnsubscribe = null;

const CONTENT_TYPE_ORDER = { video: 1, audio: 2, text: 3, application: 4 };

const renderTabs = (contentTypes, activeTab) => {
    if (contentTypes.length <= 1) {
        return '';
    }

    return html`
        <div
            class="mb-4 border-b border-gray-700 flex items-center space-x-4"
            role="tablist"
            aria-label="Content Type Tabs"
        >
            ${contentTypes.map((type) => {
                const isActive = type === activeTab;
                const tabClasses = {
                    'py-2': true,
                    'px-4': true,
                    'font-semibold': true,
                    'text-sm': true,
                    'border-b-2': true,
                    'transition-colors': true,
                    'duration-150': true,
                    'border-blue-500': isActive,
                    'text-white': isActive,
                    'border-transparent': !isActive,
                    'text-gray-400': !isActive,
                    'hover:border-gray-500': !isActive,
                    'hover:text-gray-200': !isActive,
                };
                return html`
                    <button
                        role="tab"
                        aria-selected=${isActive}
                        class=${classMap(tabClasses)}
                        @click=${() =>
                            eventBus.dispatch(
                                'ui:segment-explorer:tab-changed',
                                {
                                    tab: type,
                                }
                            )}
                    >
                        ${type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                `;
            })}
        </div>
    `;
};

const comparisonListDropdownTemplate = (segmentsForCompare, streams) => {
    const handleRemove = (segmentUniqueId) => {
        analysisActions.removeSegmentFromCompare(segmentUniqueId);
    };

    const handleGoToCompare = () => {
        uiActions.setActiveTab('segment-comparison');
        closeDropdown();
    };

    const findSegmentInfo = (item) => {
        const stream = streams.find((s) => s.id === item.streamId);
        const allSegments =
            (stream.protocol === 'dash'
                ? stream.dashRepresentationState.get(item.repId)?.segments
                : stream.hlsVariantState.get(item.repId)?.segments) ||
            stream.segments ||
            [];
        const segment = allSegments.find(
            (s) => s.uniqueId === item.segmentUniqueId
        );
        return { stream, segment };
    };

    return html`
        <div
            class="dropdown-panel bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-96 max-h-[60vh] flex flex-col"
        >
            <div class="p-3 border-b border-gray-700">
                <h4 class="font-bold text-gray-200">Segments for Comparison</h4>
            </div>
            ${segmentsForCompare.length === 0
                ? html`<div class="text-center text-sm text-gray-400 p-6">
                      No segments selected.
                  </div>`
                : html`<ul
                      class="grow overflow-y-auto divide-y divide-gray-700 p-2"
                  >
                      ${segmentsForCompare.map((item) => {
                          const { stream, segment } = findSegmentInfo(item);
                          if (!stream || !segment) return '';
                          return html`
                              <li
                                  class="p-2 flex items-center justify-between gap-2"
                              >
                                  <div class="min-w-0">
                                      <p
                                          class="text-xs font-semibold text-gray-300 truncate"
                                          title=${stream.name}
                                      >
                                          ${stream.name}
                                      </p>
                                      <p
                                          class="text-xs font-mono text-cyan-400 truncate"
                                          title=${segment.resolvedUrl}
                                      >
                                          Segment #${segment.number}
                                      </p>
                                  </div>
                                  <button
                                      @click=${() =>
                                          handleRemove(item.segmentUniqueId)}
                                      class="text-red-400 hover:text-red-300 shrink-0 p-1"
                                  >
                                      ${icons.xCircle}
                                  </button>
                              </li>
                          `;
                      })}
                  </ul>`}
            <div class="p-3 border-t border-gray-700 shrink-0">
                <button
                    @click=${handleGoToCompare}
                    ?disabled=${segmentsForCompare.length < 2}
                    class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Go to Comparison
                </button>
            </div>
        </div>
    `;
};

function calculateTimeBounds(stream) {
    if (!stream || stream.protocol === 'local') {
        return { minTime: null, maxTime: null };
    }

    const allTimedSegments = [];

    const processSegments = (segments) => {
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

    if (stream.protocol === 'dash') {
        stream.dashRepresentationState.forEach((repState) =>
            processSegments(repState.segments)
        );
    } else if (stream.protocol === 'hls') {
        stream.hlsVariantState.forEach((variantState) =>
            processSegments(variantState.segments)
        );
    }

    if (allTimedSegments.length === 0) {
        return { minTime: null, maxTime: null };
    }

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
    if (!container || currentStreamId === null) return;
    debugLog('SegmentExplorerUI', 'renderExplorer triggered.');

    const { streams, activeStreamId, segmentsForCompare } =
        useAnalysisStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);

    if (!stream) {
        segmentExplorerView.unmount();
        return;
    }

    debugLog('SegmentExplorerUI', 'Rendering for stream:', stream);

    const {
        segmentExplorerActiveTab,
        segmentExplorerSortOrder,
        segmentExplorerTargetTime,
    } = useUiStore.getState();

    const allAdaptationSets =
        stream.manifest?.periods.flatMap((p) => p.adaptationSets) || [];
    const availableContentTypes = [
        ...new Set(allAdaptationSets.map((as) => as.contentType)),
    ].sort(
        (a, b) => (CONTENT_TYPE_ORDER[a] || 99) - (CONTENT_TYPE_ORDER[b] || 99)
    );
    const activeTab = availableContentTypes.includes(segmentExplorerActiveTab)
        ? segmentExplorerActiveTab
        : availableContentTypes[0] || 'video';

    let contentTemplate;
    if (stream.protocol === 'dash') {
        contentTemplate = getDashExplorerForType(stream, activeTab);
    } else if (stream.protocol === 'hls') {
        contentTemplate = getHlsExplorerForType(stream, activeTab);
    } else if (stream.protocol === 'local') {
        contentTemplate = getLocalExplorerForType(stream);
    }

    const { minTime, maxTime } = calculateTimeBounds(stream);
    const isLive = stream.manifest?.type === 'dynamic';
    const hasTimeData = !!(minTime && maxTime);
    const sortIcon =
        segmentExplorerSortOrder === 'asc'
            ? icons.sortAscending
            : icons.sortDescending;
    const sortLabel =
        segmentExplorerSortOrder === 'asc' ? 'Oldest First' : 'Newest First';
    const timeFilterActive = !!segmentExplorerTargetTime;

    const template = html`
        <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
            <h3 class="text-xl font-bold">Segment Explorer</h3>
            <div
                id="segment-explorer-controls"
                class="flex items-center flex-wrap gap-4"
            >
                <button
                    @click=${() =>
                        eventBus.dispatch('ui:segment-explorer:sort-toggled')}
                    class="bg-gray-700/50 hover:bg-gray-600/50 text-white font-bold py-2 px-3 rounded-md transition duration-300 flex items-center text-sm gap-2"
                >
                    ${sortIcon}
                    <span>${sortLabel}</span>
                </button>

                <div class="flex items-center gap-2">
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
                                })
                            )}
                        ?disabled=${!hasTimeData}
                        class="bg-gray-700/50 hover:bg-gray-600/50 text-white font-bold py-2 px-3 rounded-md transition duration-300 flex items-center text-sm gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${timeFilterActive
                            ? 'ring-2 ring-blue-500'
                            : ''}"
                    >
                        ${icons.filter}
                        <span>Locate by Time</span>
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
                              ${icons.play}
                              <span>Live</span>
                          </button>`
                        : ''}
                </div>

                <button
                    id="segment-compare-btn"
                    @click=${(e) =>
                        toggleDropdown(
                            e.currentTarget,
                            comparisonListDropdownTemplate(
                                segmentsForCompare,
                                streams
                            )
                        )}
                    class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md transition-colors flex items-center gap-2"
                >
                    <span
                        >Compare Selected
                        (${segmentsForCompare.length}/10)</span
                    >
                    ${icons.chevronDown}
                </button>
            </div>
        </div>
        ${stream.protocol !== 'local'
            ? renderTabs(availableContentTypes, activeTab)
            : ''}
        <div
            id="segment-explorer-content"
            data-testid="segment-explorer-content"
        >
            ${contentTemplate}
        </div>
    `;

    render(template, container);
}

export const segmentExplorerView = {
    mount(containerElement, { stream }) {
        container = containerElement;
        currentStreamId = stream.id;

        if (analysisUnsubscribe) analysisUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();
        if (segmentCacheUnsubscribe) segmentCacheUnsubscribe();

        analysisUnsubscribe = useAnalysisStore.subscribe(renderExplorer);
        uiUnsubscribe = useUiStore.subscribe(renderExplorer);

        debugLog(
            'SegmentExplorer',
            'Subscribing to segmentCacheStore for UI reactivity.'
        );
        segmentCacheUnsubscribe =
            useSegmentCacheStore.subscribe(renderExplorer);

        renderExplorer();
    },

    unmount() {
        if (analysisUnsubscribe) analysisUnsubscribe();
        if (uiUnsubscribe) uiUnsubscribe();
        if (segmentCacheUnsubscribe) segmentCacheUnsubscribe();
        analysisUnsubscribe = null;
        uiUnsubscribe = null;
        segmentCacheUnsubscribe = null;

        stopLiveSegmentHighlighter();

        if (container) render(html``, container);
        container = null;
        currentStreamId = null;
    },
};
