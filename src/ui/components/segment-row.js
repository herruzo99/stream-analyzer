import { html } from 'lit-html';
import {
    useAnalysisStore,
    analysisActions,
} from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { uiActions } from '@/state/uiStore';
import { eventBus } from '@/application/event-bus';

function handleSegmentCheck(e) {
    const checkbox = /** @type {HTMLInputElement} */ (e.target);
    const url = checkbox.value;
    if (checkbox.checked) {
        if (useAnalysisStore.getState().segmentsForCompare.length >= 2) {
            checkbox.checked = false;
            return;
        }
        analysisActions.addSegmentToCompare(url);
    } else {
        analysisActions.removeSegmentFromCompare(url);
    }
}

const getLoadStatusIcon = (cacheEntry) => {
    if (!cacheEntry)
        return html`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-sm border border-gray-500 bg-gray-800"
            title="Status: Not Loaded"
        ></div>`;
    if (cacheEntry.status === -1)
        return html`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-gray-500 animate-pulse"
            title="Status: Pending"
        ></div>`;
    if (cacheEntry.status !== 200) {
        const statusText =
            cacheEntry.status === 0
                ? 'Network Error'
                : `HTTP ${cacheEntry.status}`;
        return html`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-red-500"
            title="Status: ${statusText}"
        ></div>`;
    }
    return html`<div
        class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-green-500"
        title="Status: Loaded OK"
    ></div>`;
};

const getFreshnessIcon = (isFresh) => {
    if (isFresh === null) return ''; // Not applicable for DASH
    if (isFresh)
        return html`<div
            class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-cyan-400"
            title="Fresh: Segment is in the latest playlist"
        ></div>`;
    return html`<div
        class="flex-shrink-0 w-2.5 h-2.5 rounded-sm bg-gray-600"
        title="Stale: Segment is no longer in the latest playlist"
    ></div>`;
};

const getActions = (cacheEntry, seg, isFresh, segmentFormat) => {
    if (seg.gap) {
        return html`<span class="text-xs text-gray-500 italic font-semibold"
            >GAP Segment</span
        >`;
    }

    const analyzeHandler = (e) => {
        const url = /** @type {HTMLElement} */ (e.currentTarget).dataset.url;
        eventBus.dispatch('ui:request-segment-analysis', { url });
    };
    const viewRawHandler = (e) => {
        const url = /** @type {HTMLElement} */ (e.currentTarget).dataset.url;
        analysisActions.setActiveSegmentUrl(url);
        uiActions.setActiveTab('interactive-segment');
    };
    const loadHandler = (e) => {
        const url = /** @type {HTMLElement} */ (e.currentTarget).dataset.url;
        const format = /** @type {HTMLElement} */ (e.currentTarget).dataset
            .format;
        eventBus.dispatch('segment:fetch', { url, format });
    };

    if (!cacheEntry) {
        return html`<button
            @click=${loadHandler}
            data-url="${seg.resolvedUrl}"
            data-format="${segmentFormat}"
            class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
        >
            Load
        </button>`;
    }
    if (cacheEntry.status === -1) {
        return html`<button
            disabled
            class="text-xs bg-gray-600 px-2 py-1 rounded opacity-50 cursor-wait"
        >
            Loading...
        </button>`;
    }
    if (cacheEntry.status !== 200) {
        // For HLS, stale segments shouldn't be reloaded. For DASH, isFresh is null.
        return isFresh !== false
            ? html`<button
                  @click=${loadHandler}
                  data-url="${seg.resolvedUrl}"
                  data-format="${segmentFormat}"
                  class="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded"
              >
                  Reload
              </button>`
            : html`<span class="text-xs text-gray-500 italic"
                  >Stale Error</span
              >`;
    }
    return html`
        <button
            class="text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded"
            data-url="${seg.resolvedUrl}"
            @click=${viewRawHandler}
        >
            View Raw
        </button>
        <button
            class="text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded"
            data-url="${seg.resolvedUrl}"
            @click=${analyzeHandler}
        >
            Analyze
        </button>
    `;
};

/**
 * Renders a single row in a segment explorer table.
 * @param {object} seg - The segment data object.
 * @param {boolean | null} isFresh - Whether the segment is in the latest playlist (HLS only).
 * @param {'isobmff' | 'ts' | 'unknown'} segmentFormat
 * @returns {import('lit-html').TemplateResult}
 */
export const segmentRowTemplate = (seg, isFresh, segmentFormat) => {
    const { segmentsForCompare } = useAnalysisStore.getState();
    const { get: getFromCache } = useSegmentCacheStore.getState();

    const cacheEntry = getFromCache(seg.resolvedUrl);
    const isChecked = segmentsForCompare.includes(seg.resolvedUrl);

    let stateClasses = 'hover:bg-gray-800/80 transition-colors duration-200';
    if (seg.gap) {
        stateClasses = 'bg-gray-800/50 text-gray-600 italic';
    }

    const timingContent =
        seg.type === 'Media' && !seg.gap
            ? html`${(seg.time / seg.timescale).toFixed(2)}s
              (+${(seg.duration / seg.timescale).toFixed(2)}s)`
            : 'N/A';

    // Add data attributes for live highlighting if the segment has UTC times
    const startTimeAttr = seg.startTimeUTC
        ? `data-start-time=${seg.startTimeUTC}`
        : '';
    const endTimeAttr = seg.endTimeUTC ? `data-end-time=${seg.endTimeUTC}` : '';

    return html`
        <tr
            class="segment-row ${stateClasses}"
            data-url="${seg.resolvedUrl}"
            ${startTimeAttr}
            ${endTimeAttr}
        >
            <td class="px-3 py-1.5">
                <input
                    type="checkbox"
                    class="bg-gray-700 border-gray-500 rounded focus:ring-blue-500 disabled:opacity-50"
                    .value=${seg.resolvedUrl}
                    ?checked=${isChecked}
                    ?disabled=${seg.gap}
                    @change=${handleSegmentCheck}
                />
            </td>
            <td class="px-3 py-1.5">
                <div class="flex items-center space-x-2">
                    ${seg.gap ? '' : getLoadStatusIcon(cacheEntry)}
                    ${getFreshnessIcon(isFresh)}
                    <div>
                        <span>${seg.type === 'Init' ? 'Init' : 'Media'}</span
                        ><span class="block text-xs text-gray-500"
                            >#${seg.number}</span
                        >
                    </div>
                </div>
            </td>
            <td class="px-3 py-1.5">
                <span class="text-xs font-mono">${timingContent}</span>
            </td>
            <td class="px-3 py-1.5">
                <div class="flex justify-between items-center">
                    <span
                        class="font-mono ${seg.gap
                            ? ''
                            : 'text-cyan-400'} truncate"
                        title="${seg.resolvedUrl}"
                        >${seg.template || 'GAP'}</span
                    >
                    <div class="flex items-center space-x-2 flex-shrink-0 ml-4">
                        ${getActions(cacheEntry, seg, isFresh, segmentFormat)}
                    </div>
                </div>
            </td>
        </tr>
    `;
};