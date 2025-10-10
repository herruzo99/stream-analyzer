import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { uiActions } from '@/state/uiStore';
import { eventBus } from '@/application/event-bus';
import { copyTextToClipboard } from '@/ui/shared/clipboard';

const FLAG_DEFINITIONS = {
    discontinuity: {
        icon: '⚠️',
        tooltip:
            'Discontinuity: A change in encoding parameters or timestamps occurs at this segment.',
        classes: 'text-yellow-400',
    },
    'key-change': {
        icon: '🔑',
        tooltip:
            'Encryption Key Change: A new EXT-X-KEY tag applies to this segment.',
        classes: 'text-blue-400',
    },
    gap: {
        icon: '🚫',
        tooltip:
            'Gap Segment: This segment is marked as unavailable and should not be loaded.',
        classes: 'text-gray-500',
    },
    pdt: {
        icon: '🕒',
        tooltip:
            'Program Date Time: This segment has a wall-clock timestamp anchor (EXT-X-PROGRAM-DATE-TIME).',
        classes: 'text-cyan-400',
    },
    scte35: {
        icon: '💰',
        tooltip:
            'SCTE-35 Signal: This segment contains an in-band ad insertion marker (emsg box).',
        classes: 'text-purple-400',
    },
    'sap-type-1': {
        icon: 'I',
        tooltip: 'Starts with a Type 1 SAP (IDR frame). Clean switching point.',
        classes: 'text-green-400 font-bold',
    },
};

function getInBandFlags(cacheEntry) {
    const flags = new Set();
    if (!cacheEntry?.parsedData) {
        return flags;
    }

    const { format, data } = cacheEntry.parsedData;
    if (format === 'isobmff' && data.events) {
        data.events.forEach((event) => {
            if (
                event.details?.scheme_id_uri?.value.includes('scte35') ||
                event.details?.scheme_id_uri?.value.includes('scte-35')
            ) {
                flags.add('scte35');
            }
        });
    }
    return flags;
}

const flagsTemplate = (seg, cacheEntry) => {
    const manifestFlags = new Set(seg.flags || []);
    const inBandFlags = getInBandFlags(cacheEntry);
    const allFlags = Array.from(new Set([...manifestFlags, ...inBandFlags]));

    if (allFlags.length === 0) {
        return html`<span>-</span>`;
    }

    return html`
        <div class="flex items-center space-x-2">
            ${allFlags.map((flag) => {
                const def = FLAG_DEFINITIONS[flag];
                return def
                    ? html`<span class="${def.classes}" title="${def.tooltip}"
                          >${def.icon}</span
                      >`
                    : '';
            })}
        </div>
    `;
};

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

    const rowClasses = {
        'segment-row': true,
        'hover:bg-gray-700/50': true,
        'transition-colors': true,
        'duration-200': true,
        'bg-gray-800/50 text-gray-600 italic': seg.gap,
        'is-fresh': isFresh,
    };

    const timingContent =
        seg.type === 'Media' && !seg.gap
            ? html`${(seg.time / seg.timescale).toFixed(2)}s
              (+${(seg.duration / seg.timescale).toFixed(2)}s)`
            : 'N/A';

    const startTimeAttr = seg.startTimeUTC
        ? `data-start-time=${seg.startTimeUTC}`
        : '';
    const endTimeAttr = seg.endTimeUTC ? `data-end-time=${seg.endTimeUTC}` : '';

    const handleCopyUrl = (e) => {
        const url = /** @type {HTMLElement} */ (e.currentTarget).dataset.url;
        copyTextToClipboard(url, 'Segment URL copied to clipboard!');
    };

    return html`
        <style>
            @keyframes fadeIn {
                from {
                    background-color: rgba(22, 163, 74, 0.4);
                }
                to {
                    background-color: transparent;
                }
            }
            .is-fresh {
                animation: fadeIn 1.5s ease-out;
            }
        </style>
        <div
            class=${classMap(rowClasses)}
            style="display: grid; grid-template-columns: 32px 160px 128px 96px 1fr; border-bottom: 1px solid #374151; height: 40px; font-size: 0.875rem; line-height: 1.25rem;"
            data-url="${seg.resolvedUrl}"
            ${startTimeAttr}
            ${endTimeAttr}
        >
            <div class="px-3 py-1.5 flex items-center">
                <input
                    type="checkbox"
                    class="bg-gray-700 border-gray-500 rounded focus:ring-blue-500 disabled:opacity-50"
                    .value=${seg.resolvedUrl}
                    ?checked=${isChecked}
                    ?disabled=${seg.gap}
                    @change=${handleSegmentCheck}
                />
            </div>
            <div class="px-3 py-1.5 flex items-center">
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
            </div>
            <div class="px-3 py-1.5 flex items-center">
                <span class="text-xs font-mono">${timingContent}</span>
            </div>
            <div class="px-3 py-1.5 flex items-center">
                ${flagsTemplate(seg, cacheEntry)}
            </div>
            <div class="px-3 py-1.5 flex items-center">
                <div class="flex justify-between items-center w-full">
                    <div class="flex items-center min-w-0">
                        <span
                            class="font-mono ${seg.gap
                                ? ''
                                : 'text-cyan-400'} truncate"
                            title="${seg.resolvedUrl}"
                        >
                            ${seg.template || 'GAP'}
                        </span>
                        ${!seg.gap
                            ? html`<button
                                  @click=${handleCopyUrl}
                                  data-url="${seg.resolvedUrl}"
                                  title="Copy segment URL"
                                  class="ml-2 flex-shrink-0 text-gray-400 hover:text-white"
                              >
                                  <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      class="h-4 w-4"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      stroke-width="2"
                                  >
                                      <path
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                      />
                                  </svg>
                              </button>`
                            : ''}
                    </div>
                    <div class="flex items-center space-x-2 flex-shrink-0 ml-4">
                        ${getActions(cacheEntry, seg, isFresh, segmentFormat)}
                    </div>
                </div>
            </div>
        </div>
    `;
};
