import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useDecryptionStore } from '@/state/decryptionStore';
import { uiActions } from '@/state/uiStore';
import { eventBus } from '@/application/event-bus';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { keyManagerService } from '@/application/services/keyManagerService';

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

const encryptionTemplate = (seg) => {
    const { encryptionInfo } = seg;
    if (!encryptionInfo || encryptionInfo.method === 'NONE') {
        return html`<span class="text-gray-500">-</span>`;
    }

    // Handle HLS AES-128
    if (encryptionInfo.method === 'AES-128') {
        const { keyCache } = useDecryptionStore.getState();
        const keyStatus = keyCache.get(encryptionInfo.uri);
        let icon, tooltip;

        if (!keyStatus) {
            icon = html`<svg
                class="h-5 w-5 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
            >
                <path
                    fill-rule="evenodd"
                    d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                    clip-rule="evenodd"
                />
            </svg>`;
            tooltip = `Encrypted (AES-128). Key not fetched.`;
        } else if (keyStatus.status === 'pending') {
            icon = html`<svg
                class="h-5 w-5 text-blue-400 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                ></circle>
                <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
            </svg>`;
            tooltip = 'Fetching key...';
        } else if (keyStatus.status === 'error') {
            icon = html`<svg
                class="h-5 w-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
            >
                <path
                    fill-rule="evenodd"
                    d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                    clip-rule="evenodd"
                />
                <path
                    fill-rule="evenodd"
                    d="M13.477 14.879a1 1 0 01-1.414 0L10 12.414l-2.063 2.063a1 1 0 01-1.414-1.414L8.586 11 6.523 8.937a1 1 0 111.414-1.414L10 9.586l2.063-2.063a1 1 0 111.414 1.414L11.414 11l2.063 2.063a1 1 0 010 1.414z"
                    clip-rule="evenodd"
                />
            </svg>`;
            tooltip = `Key Error: ${keyStatus.error}`;
        } else {
            icon = html`<svg
                class="h-5 w-5 text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
            >
                <path
                    d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm0 8h6v5H4v-5h6z"
                />
                <path
                    d="M9 4a3 3 0 016 0v3h-1V7a2 2 0 10-4 0v2H8V7a3 3 0 011-2.236z"
                />
            </svg>`;
            tooltip = 'Key ready.';
        }
        return html`<div
            class="flex items-center space-x-1"
            data-tooltip=${tooltip}
        >
            ${icon}
            <span class="text-xs text-gray-400">${encryptionInfo.method}</span>
        </div>`;
    }

    // Handle DASH CENC
    if (encryptionInfo.method === 'CENC' && encryptionInfo.systems) {
        const tooltip = `Encrypted (CENC). Systems: ${encryptionInfo.systems.join(', ')}.`;
        const icon = html`<svg
            class="h-5 w-5 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
        >
            <path
                fill-rule="evenodd"
                d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                clip-rule="evenodd"
            />
        </svg>`;
        return html`<div
            class="flex items-center space-x-1"
            data-tooltip=${tooltip}
        >
            ${icon}
            <span class="text-xs text-gray-400"
                >CENC (${encryptionInfo.systems.length})</span
            >
        </div>`;
    }

    return html`<span class="text-gray-500">-</span>`;
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
            class="shrink-0 w-2.5 h-2.5 rounded-sm border border-gray-500 bg-gray-800"
            title="Status: Not Loaded"
        ></div>`;
    if (cacheEntry.status === -1)
        return html`<div
            class="shrink-0 w-2.5 h-2.5 rounded-full bg-gray-500 animate-pulse"
            title="Status: Pending"
        ></div>`;
    if (cacheEntry.status !== 200) {
        const statusText =
            cacheEntry.status === 0
                ? 'Network Error'
                : `HTTP ${cacheEntry.status}`;
        return html`<div
            class="shrink-0 w-2.5 h-2.5 rounded-full bg-red-500"
            title="Status: ${statusText}"
        ></div>`;
    }
    return html`<div
        class="shrink-0 w-2.5 h-2.5 rounded-full bg-green-500"
        title="Status: Loaded OK"
    ></div>`;
};

const getFreshnessIcon = (isFresh) => {
    if (isFresh === null) return ''; // Not applicable for DASH
    if (isFresh)
        return html`<div
            class="shrink-0 w-2.5 h-2.5 rounded-full bg-cyan-400"
            title="Fresh: Segment is in the latest playlist"
        ></div>`;
    return html`<div
        class="shrink-0 w-2.5 h-2.5 rounded-sm bg-gray-600"
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
        const button = /** @type {HTMLElement} */ (e.currentTarget);
        const url = button.dataset.url;
        const format = button.dataset.format;
        eventBus.dispatch('ui:request-segment-analysis', { url, format });
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
        if (seg.encryptionInfo) {
            keyManagerService.getKey(seg.encryptionInfo.uri).catch(() => {});
        }
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
            data-format="${segmentFormat}"
            @click=${analyzeHandler}
        >
            Analyze
        </button>
    `;
};

const cellLabel = (label) =>
    html`<div class="md:hidden font-semibold text-gray-400 text-xs">
        ${label}
    </div>`;

export const segmentRowTemplate = (seg, isFresh, segmentFormat) => {
    const { segmentsForCompare } = useAnalysisStore.getState();
    const { get: getFromCache } = useSegmentCacheStore.getState();

    const cacheEntry = getFromCache(seg.resolvedUrl);
    const isChecked = segmentsForCompare.includes(seg.resolvedUrl);

    const rowClasses = {
        'segment-row': true,
        'h-16': true,
        'grid grid-cols-2 md:grid-cols-[32px_160px_128px_96px_112px_minmax(400px,auto)] items-center gap-y-2 p-2 md:p-0 border-b border-gray-700': true,
        'hover:bg-gray-700/50 transition-colors duration-200': true,
        'bg-gray-800/50 text-gray-600 italic': seg.gap,
    };

    const timingContent =
        seg.type === 'Media' && !seg.gap
            ? html`${(seg.time / seg.timescale).toFixed(2)}s
              (+${(seg.duration / seg.timescale).toFixed(2)}s)`
            : 'N/A';

    const handleCopyUrl = (e) => {
        const url = /** @type {HTMLElement} */ (e.currentTarget).dataset.url;
        copyTextToClipboard(url, 'Segment URL copied to clipboard!');
    };

    return html`
        <div
            class=${classMap(rowClasses)}
            data-url="${seg.resolvedUrl}"
            data-start-time=${seg.startTimeUTC || ''}
            data-end-time=${seg.endTimeUTC || ''}
        >
            <div
                class="col-span-2 md:col-span-1 md:px-3 md:py-1.5 flex items-center md:border-r md:border-gray-700"
            >
                <input
                    type="checkbox"
                    class="bg-gray-700 border-gray-500 rounded focus:ring-blue-500 disabled:opacity-50"
                    .value=${seg.resolvedUrl}
                    ?checked=${isChecked}
                    ?disabled=${seg.gap}
                    @change=${handleSegmentCheck}
                />
            </div>

            ${cellLabel('Status / Type')}
            <div
                class="flex items-center space-x-2 md:px-3 md:py-1.5 md:border-r md:border-gray-700"
            >
                ${seg.gap ? '' : getLoadStatusIcon(cacheEntry)}
                ${getFreshnessIcon(isFresh)}
                <div>
                    <span>${seg.type === 'Init' ? 'Init' : 'Media'}</span>
                    <span class="block text-xs text-gray-500"
                        >#${seg.number}</span
                    >
                </div>
            </div>

            ${cellLabel('Timing (s)')}
            <div
                class="text-xs font-mono md:px-3 md:py-1.5 md:border-r md:border-gray-700"
            >
                ${timingContent}
            </div>

            ${cellLabel('Flags')}
            <div class="md:px-3 md:py-1.5 md:border-r md:border-gray-700">
                ${flagsTemplate(seg, cacheEntry)}
            </div>

            ${cellLabel('Encryption')}
            <div class="md:px-3 md:py-1.5 md:border-r md:border-gray-700">
                ${encryptionTemplate(seg)}
            </div>

            ${cellLabel('URL & Actions')}
            <div
                class="col-span-2 md:col-span-1 md:px-3 md:py-1.5 flex justify-between items-center w-full"
            >
                <div class="flex items-center min-w-0">
                    <span
                        class="font-mono ${seg.gap
                            ? ''
                            : 'text-cyan-400'} truncate"
                        title="${seg.resolvedUrl}"
                        >${seg.template || 'GAP'}</span
                    >
                    ${!seg.gap
                        ? html`<button
                              @click=${handleCopyUrl}
                              data-url="${seg.resolvedUrl}"
                              title="Copy segment URL"
                              class="ml-2 shrink-0 text-gray-400 hover:text-white"
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
                <div class="flex items-center space-x-2 shrink-0 ml-4">
                    ${getActions(cacheEntry, seg, isFresh, segmentFormat)}
                </div>
            </div>
        </div>
    `;
};
