import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useDecryptionStore } from '@/state/decryptionStore';
import { uiActions } from '@/state/uiStore';
import { eventBus } from '@/application/event-bus';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { keyManagerService } from '@/infrastructure/decryption/keyManagerService';
import * as icons from '@/ui/icons';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';

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
            if (event.scte35) {
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
            icon = html`<span class="text-gray-400">${icons.lockClosed}</span>`;
            tooltip = `Encrypted (AES-128). Key not fetched.`;
        } else if (keyStatus.status === 'pending') {
            icon = html`<span class="text-blue-400">${icons.spinner}</span>`;
            tooltip = 'Fetching key...';
        } else if (keyStatus.status === 'error') {
            icon = html`<span>${icons.xCircleRed}</span>`;
            tooltip = `Key Error: ${keyStatus.error}`;
        } else {
            icon = html`<span class="text-green-400">${icons.lockOpen}</span>`;
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
        const tooltip = `Encrypted (CENC). Systems: ${encryptionInfo.systems.join(
            ', '
        )}.`;
        const icon = html`<span class="text-gray-400"
            >${icons.lockClosed}</span
        >`;
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
    const { streamId, repId, segmentUniqueId } = checkbox.dataset;

    if (checkbox.checked) {
        if (useAnalysisStore.getState().segmentsForCompare.length >= 10) { // Increased limit
            checkbox.checked = false;
            return;
        }
        analysisActions.addSegmentToCompare({
            streamId: parseInt(streamId, 10),
            repId,
            segmentUniqueId
        });
    } else {
        analysisActions.removeSegmentFromCompare(segmentUniqueId);
    }
}

const getStatusIndicator = (cacheEntry, isFresh, seg) => {
    let colorClass = 'border-gray-500'; // Default: Not loaded
    let tooltip = 'Status: Not Loaded';
    let pulse = false;

    if (seg.gap) {
        return html`<span
            class="w-2.5 h-2.5 rounded-full bg-gray-700 border border-gray-600"
            data-tooltip="Status: GAP Segment"
        ></span>`;
    }

    if (cacheEntry?.status === -1) {
        colorClass = 'bg-blue-500';
        tooltip = 'Status: Loading';
        pulse = true;
    } else if (cacheEntry?.status !== 200 && cacheEntry) {
        const statusText =
            cacheEntry.status === 0
                ? 'Network Error'
                : `HTTP ${cacheEntry.status}`;
        colorClass = 'bg-red-500';
        tooltip = `Status: Error (${statusText})`;
    } else if (cacheEntry?.status === 200) {
        if (isFresh) {
            colorClass = 'bg-green-500';
            tooltip = 'Status: Loaded';
        } else {
            colorClass = 'bg-gray-500';
            tooltip = 'Status: Loaded (Stale)';
        }
    } else {
        // Not loaded
        if (isFresh === false) {
            colorClass = 'bg-gray-700 border-gray-600';
            tooltip = 'Status: Stale';
        }
    }

    return html`<span
        class="w-2.5 h-2.5 rounded-full ${colorClass} ${pulse
            ? 'animate-pulse'
            : ''}"
        data-tooltip=${tooltip}
    ></span>`;
};

const getActions = (cacheEntry, seg, isFresh, segmentFormat) => {
    if (seg.gap) {
        return html`<span class="text-xs text-gray-500 italic font-semibold"
            >GAP Segment</span
        >`;
    }

    const { contentType: inferredContentType } = inferMediaInfoFromExtension(
        seg.resolvedUrl
    );
    // Correctly determine the format hint. Prioritize text, otherwise use stream's format, or null if unknown.
    const formatHint =
        inferredContentType === 'text'
            ? 'vtt'
            : segmentFormat === 'unknown'
              ? null
              : segmentFormat;

    const analyzeHandler = (e) => {
        const button = /** @type {HTMLElement} */ (e.currentTarget);
        const uniqueId = button.dataset.uniqueId;
        eventBus.dispatch('ui:request-segment-analysis', {
            uniqueId,
            format: formatHint,
        });
    };
    const viewRawHandler = (e) => {
        const uniqueId = /** @type {HTMLElement} */ (e.currentTarget).dataset
            .uniqueId;
        analysisActions.setActiveSegmentUrl(uniqueId);
        uiActions.setActiveTab('interactive-segment');
    };
    const loadHandler = (e) => {
        const uniqueId = /** @type {HTMLElement} */ (e.currentTarget).dataset
            .uniqueId;
        if (seg.encryptionInfo) {
            keyManagerService.getKey(seg.encryptionInfo.uri).catch(() => {});
        }
        eventBus.dispatch('segment:fetch', {
            uniqueId,
            streamId: useAnalysisStore.getState().activeStreamId,
            format: formatHint,
        });
    };

    // Case: Not yet loaded
    if (!cacheEntry) {
        if (isFresh === false) {
            // Stale and not loaded
            return html`<span class="text-xs text-gray-500 italic"
                >Unavailable</span
            >`;
        }
        // Fresh (or static) and not loaded
        return html`<button
            @click=${loadHandler}
            data-unique-id="${seg.uniqueId}"
            class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
        >
            Load
        </button>`;
    }

    // Case: Currently loading
    if (cacheEntry.status === -1) {
        return html`<button
            disabled
            class="text-xs bg-gray-600 px-2 py-1 rounded opacity-50 cursor-wait"
        >
            Loading...
        </button>`;
    }

    // Case: Load resulted in an error
    if (cacheEntry.status !== 200) {
        if (isFresh === false) {
            // Stale, and previously had an error
            return html`<span class="text-xs text-red-500/80 italic"
                >Stale (Error)</span
            >`;
        }
        // Fresh, but had an error. Allow reload.
        return html`<button
            @click=${loadHandler}
            data-unique-id="${seg.uniqueId}"
            class="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded"
        >
            Reload
        </button>`;
    }

    // Case: Loaded successfully
    return html`
        <button
            class="text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded"
            data-unique-id="${seg.uniqueId}"
            @click=${viewRawHandler}
        >
            View Raw
        </button>
        <button
            class="text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded"
            data-unique-id="${seg.uniqueId}"
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

export const segmentRowTemplate = (seg, freshSegmentUrls, segmentFormat, repId) => {
    const { segmentsForCompare, activeStreamId } = useAnalysisStore.getState();
    const { get: getFromCache } = useSegmentCacheStore.getState();

    const cacheEntry = getFromCache(seg.uniqueId);
    const isChecked = segmentsForCompare.some(s => s.segmentUniqueId === seg.uniqueId);

    // An Init segment is never stale. Media segments are fresh if in the latest manifest.
    const isFresh =
        seg.type === 'Init' || freshSegmentUrls.has(seg.resolvedUrl);

    const statusIndicator = getStatusIndicator(cacheEntry, isFresh, seg);

    const rowClasses = {
        'segment-row': true,
        'h-16': true,
        'grid grid-cols-2 md:grid-cols-[32px_180px_128px_96px_112px_minmax(400px,auto)] items-center gap-y-2 p-2 md:p-0 border-b border-gray-700': true,
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
                    data-stream-id=${activeStreamId}
                    data-rep-id=${repId}
                    data-segment-unique-id=${seg.uniqueId}
                    ?checked=${isChecked}
                    ?disabled=${seg.gap}
                    @change=${handleSegmentCheck}
                />
            </div>

            ${cellLabel('Status / Type')}
            <div
                class="flex items-center space-x-3 md:px-3 md:py-1.5 md:border-r md:border-gray-700"
            >
                ${statusIndicator}
                <div>
                    <span class="font-medium"
                        >${seg.type === 'Init' ? 'Init' : 'Media'}</span
                    >
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
                              ${icons.clipboardCopy}
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