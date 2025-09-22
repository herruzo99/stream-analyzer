
import { html } from 'lit-html';
import { analysisState, dom } from '../../core/state.js';
import { dispatchAndRenderSegmentAnalysis } from '../segment-analysis/view.js';
import { eventBus } from '../../core/event-bus.js';

function handleSegmentCheck(e) {
    const checkbox = /** @type {HTMLInputElement} */ (e.target);
    const url = checkbox.value;
    if (checkbox.checked) {
        if (analysisState.segmentsForCompare.length >= 2) {
            checkbox.checked = false;
            return;
        }
        eventBus.dispatch('compare:add-segment', { url });
    } else {
        eventBus.dispatch('compare:remove-segment', { url });
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

const getActions = (cacheEntry, seg, isFresh) => {
    const analyzeHandler = (e) => {
        dom.modalTitle.textContent = 'Segment Analysis';
        const url = /** @type {HTMLElement} */ (e.currentTarget).dataset.url;
        const cached = analysisState.segmentCache.get(url);
        dom.modalSegmentUrl.textContent = url;

        // Correctly show the modal
        const modalPanel = dom.segmentModal.querySelector('div');
        dom.segmentModal.classList.remove('opacity-0', 'invisible');
        dom.segmentModal.classList.add('opacity-100', 'visible');
        modalPanel.classList.remove('scale-95');
        modalPanel.classList.add('scale-100');

        dispatchAndRenderSegmentAnalysis(e, cached?.data);
    };
    const viewRawHandler = (e) => {
        const url = /** @type {HTMLElement} */ (e.currentTarget).dataset.url;
        analysisState.activeSegmentUrl = url;
        document.querySelector('[data-tab="interactive-segment"]')?.click();
    };
    const loadHandler = () => {
        // Use the application's event bus to request the segment from the central service.
        eventBus.dispatch('segment:fetch', { url: seg.resolvedUrl });
    };

    if (!cacheEntry) {
        return html`<button
            @click=${loadHandler}
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
        return isFresh
            ? html`<button
                  @click=${loadHandler}
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
 * @param {boolean} isFresh - Whether the segment is in the latest playlist.
 * @param {'current' | 'live' | 'stale' | 'default'} livenessState
 * @returns {import('lit-html').TemplateResult}
 */
export const segmentRowTemplate = (seg, isFresh, livenessState) => {
    const cacheEntry = analysisState.segmentCache.get(seg.resolvedUrl);
    const isChecked = analysisState.segmentsForCompare.includes(seg.resolvedUrl);

    let stateClasses = 'hover:bg-gray-800/80';
    switch (livenessState) {
        case 'current':
            stateClasses = 'bg-green-700/50 hover:bg-green-700/70';
            break;
        case 'live':
            stateClasses = 'bg-blue-900/40 hover:bg-blue-900/60';
            break;
        case 'stale':
            stateClasses = 'bg-red-900/30 hover:bg-red-900/50';
            break;
    }

    return html`
        <tr class="segment-row ${stateClasses}" data-url="${seg.resolvedUrl}">
            <td class="px-3 py-1.5">
                <input
                    type="checkbox"
                    class="bg-gray-700 border-gray-500 rounded focus:ring-blue-500"
                    .value=${seg.resolvedUrl}
                    ?checked=${isChecked}
                    @change=${handleSegmentCheck}
                />
            </td>
            <td class="px-3 py-1.5">
                <div class="flex items-center space-x-2">
                    ${getLoadStatusIcon(cacheEntry)}
                    ${getFreshnessIcon(isFresh)}
                    <div>
                        <span>${seg.type === 'Init' ? 'Init' : 'Media'}</span>
                        <span class="block text-xs text-gray-500"
                            >#${seg.number}</span
                        >
                    </div>
                </div>
            </td>
            <td class="px-3 py-1.5">
                <span class="text-xs font-mono"
                    >${seg.type === 'Media'
                        ? html`${(seg.time / seg.timescale).toFixed(
                              2
                          )}s (+${(seg.duration / seg.timescale).toFixed(
                              2
                          )}s)`
                        : 'N/A'}</span
                >
            </td>
            <td class="px-3 py-1.5">
                <div class="flex justify-between items-center">
                    <span
                        class="font-mono text-cyan-400 truncate"
                        title="${seg.resolvedUrl}"
                        >${seg.template}</span
                    >
                    <div
                        class="flex items-center space-x-2 flex-shrink-0 ml-4"
                    >
                        ${getActions(cacheEntry, seg, isFresh)}
                    </div>
                </div>
            </td>
        </tr>
    `;
};