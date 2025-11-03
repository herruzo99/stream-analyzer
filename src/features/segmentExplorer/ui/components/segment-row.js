import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useDecryptionStore } from '@/state/decryptionStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { eventBus } from '@/application/event-bus';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { downloadBuffer } from '@/ui/shared/download';
import { keyManagerService } from '@/infrastructure/decryption/keyManagerService';
import * as icons from '@/ui/icons';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { isDebugMode } from '@/shared/utils/env';

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
function isDashSegmentStale(seg, stream) {
    if (
        stream.protocol !== 'dash' ||
        stream.manifest?.type !== 'dynamic' ||
        !seg.endTimeUTC
    )
        return false;
    const { manifest } = stream;
    const timeShiftBufferDepthMs = (manifest.timeShiftBufferDepth || 0) * 1000;
    const availabilityStartTime =
        manifest.availabilityStartTime?.getTime() || 0;
    const nowOnServerTimeline = Date.now() - availabilityStartTime;
    const windowStartTime = nowOnServerTimeline - timeShiftBufferDepthMs;
    const segmentEndTime = seg.endTimeUTC - availabilityStartTime;
    return segmentEndTime < windowStartTime;
}
function getInBandFlags(cacheEntry) {
    const flags = new Set();
    if (!cacheEntry?.parsedData) return flags;
    const { format, data } = cacheEntry.parsedData;
    if (format === 'isobmff' && data.events) {
        data.events.forEach((event) => {
            if (event.scte35) flags.add('scte35');
        });
    }
    return flags;
}
const flagsTemplate = (seg, cacheEntry) => {
    const manifestFlags = new Set(seg.flags || []);
    const inBandFlags = getInBandFlags(cacheEntry);
    const allFlags = Array.from(new Set([...manifestFlags, ...inBandFlags]));
    if (allFlags.length === 0) return html`<span>-</span>`;
    return html`<div class="flex items-center space-x-2">
        ${allFlags.map((flag) => {
            const def = FLAG_DEFINITIONS[flag];
            return def
                ? html`<span class="${def.classes}" title="${def.tooltip}"
                      >${def.icon}</span
                  >`
                : '';
        })}
    </div>`;
};
const encryptionTemplate = (seg) => {
    const { encryptionInfo } = seg;
    if (!encryptionInfo || encryptionInfo.method === 'NONE')
        return html`<span class="text-slate-500">-</span>`;
    if (encryptionInfo.method === 'AES-128') {
        const { keyCache } = useDecryptionStore.getState();
        const keyStatus = keyCache.get(encryptionInfo.uri);
        let icon, tooltip;
        if (!keyStatus) {
            icon = html`<span class="text-slate-400"
                >${icons.lockClosed}</span
            >`;
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
            ${icon}<span class="text-xs text-slate-400"
                >${encryptionInfo.method}</span
            >
        </div>`;
    }
    if (encryptionInfo.method === 'CENC' && encryptionInfo.systems) {
        const tooltip = `Encrypted (CENC). Systems: ${encryptionInfo.systems.join(', ')}.`;
        return html`<div
            class="flex items-center space-x-1"
            data-tooltip=${tooltip}
        >
            <span class="text-slate-400">${icons.lockClosed}</span>
            <span class="text-xs text-slate-400"
                >CENC (${encryptionInfo.systems.length})</span
            >
        </div>`;
    }
    return html`<span class="text-slate-500">-</span>`;
};

export const segmentRowTemplate = (
    seg,
    stream,
    segmentFormat,
    repId,
    currentSegmentUrls,
    cacheEntry,
    targetTime,
    shouldFlash = false
) => {
    const { segmentsForCompare, activeStreamId } = useAnalysisStore.getState();
    const isChecked = segmentsForCompare.some(
        (s) => s.segmentUniqueId === seg.uniqueId
    );
    const isLoaded = cacheEntry && cacheEntry.status === 200;
    const isInCurrentManifest =
        seg.type === 'Init' || currentSegmentUrls.has(seg.uniqueId);
    const isStaleByTime =
        stream.protocol === 'dash' ? isDashSegmentStale(seg, stream) : false;

    const getStatusIndicator = () => {
        if (seg.gap)
            return {
                icon: html`<div
                    class="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600"
                ></div>`,
                label: 'GAP Segment',
            };
        if (cacheEntry?.status === -1)
            return {
                icon: html`<div
                    class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"
                ></div>`,
                label: 'Loading',
            };
        if (cacheEntry?.status !== 200 && cacheEntry) {
            const statusText =
                cacheEntry.status === 0
                    ? 'Network Error'
                    : `HTTP ${cacheEntry.status}`;
            return {
                icon: html`<div
                    class="w-2.5 h-2.5 rounded-full bg-red-500"
                ></div>`,
                label: `Error (${statusText})`,
            };
        }
        if (cacheEntry?.status === 200) {
            if (!isInCurrentManifest)
                return {
                    icon: html`<div
                        class="w-2.5 h-2.5 rounded-full bg-slate-500"
                    ></div>`,
                    label: 'Loaded (Not in Manifest)',
                };
            if (isStaleByTime)
                return {
                    icon: html`<div
                        class="w-2.5 h-2.5 rounded-full bg-yellow-500"
                    ></div>`,
                    label: 'Loaded (Stale)',
                };
            return {
                icon: html`<div
                    class="w-2.5 h-2.5 rounded-full bg-green-500"
                ></div>`,
                label: 'Loaded (Fresh)',
            };
        }
        if (!isInCurrentManifest)
            return {
                icon: html`<div
                    class="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600"
                ></div>`,
                label: 'Not in Manifest',
            };
        if (isStaleByTime)
            return {
                icon: html`<div
                    class="w-2.5 h-2.5 rounded-full bg-yellow-700 border border-yellow-600"
                ></div>`,
                label: 'Stale',
            };
        return {
            icon: html`<div
                class="w-2.5 h-2.5 rounded-full border border-slate-500"
            ></div>`,
            label: 'Not Loaded',
        };
    };

    const getActions = () => {
        if (seg.gap) return html``;
        const { contentType: inferredContentType } =
            inferMediaInfoFromExtension(seg.resolvedUrl);
        const formatHint =
            inferredContentType === 'text'
                ? 'vtt'
                : segmentFormat === 'unknown'
                  ? null
                  : segmentFormat;

        const actionButton = (
            label,
            icon,
            handler,
            uniqueId,
            colorClasses,
            disabled = false
        ) =>
            html`<button
                @click=${handler}
                data-unique-id="${uniqueId}"
                class="text-xs ${colorClasses} px-2 py-1 rounded flex items-center gap-1.5"
                ?disabled=${disabled}
            >
                ${icon} ${label}
            </button>`;

        const analyzeHandler = (e) =>
            eventBus.dispatch('ui:show-segment-analysis-modal', {
                uniqueId: e.currentTarget.dataset.uniqueId,
                format: formatHint,
            });
        const viewRawHandler = (e) =>
            uiActions.navigateToInteractiveSegment(
                e.currentTarget.dataset.uniqueId
            );
        const loadHandler = (e) => {
            const uniqueId = e.currentTarget.dataset.uniqueId;
            useSegmentCacheStore
                .getState()
                .set(uniqueId, { status: -1, data: null, parsedData: null });
            if (seg.encryptionInfo && seg.encryptionInfo.method === 'AES-128') {
                keyManagerService
                    .getKey(seg.encryptionInfo.uri)
                    .catch(() => {});
            }
            eventBus.dispatch('segment:fetch', {
                uniqueId,
                streamId: useAnalysisStore.getState().activeStreamId,
                format: formatHint,
            });
        };
        const downloadHandler = (e) => {
            const uniqueId = e.currentTarget.dataset.uniqueId;
            const entry = useSegmentCacheStore.getState().get(uniqueId);
            if (entry?.data) {
                const filename =
                    seg.template ||
                    seg.resolvedUrl.split('/').pop().split('?')[0];
                downloadBuffer(entry.data, filename);
            }
        };

        if (cacheEntry?.status === -1) {
            return actionButton(
                'Loading...',
                icons.spinner,
                () => {},
                seg.uniqueId,
                'bg-blue-600/50 cursor-not-allowed',
                true
            );
        }

        if (!isLoaded) {
            return actionButton(
                'Load',
                icons.download,
                loadHandler,
                seg.uniqueId,
                'bg-blue-600 hover:bg-blue-700'
            );
        }
        return html` ${actionButton(
            'View Raw',
            icons.searchCode,
            viewRawHandler,
            seg.uniqueId,
            'bg-slate-600 hover:bg-slate-700'
        )}
        ${actionButton(
            'Analyze',
            icons.binary,
            analyzeHandler,
            seg.uniqueId,
            'bg-purple-600 hover:bg-purple-700'
        )}
        ${actionButton(
            '',
            icons.download,
            downloadHandler,
            seg.uniqueId,
            'bg-green-600 hover:bg-green-700'
        )}`;
    };

    const isDisabled = seg.gap || !isLoaded;
    const { icon: statusIcon, label: statusLabel } = getStatusIndicator();
    const hasParsingIssues =
        isDebugMode &&
        (cacheEntry?.parsedData?.data?.issues?.length > 0 ||
            cacheEntry?.parsedData?.error);
    const issuesTooltip = hasParsingIssues
        ? (
              cacheEntry.parsedData.data?.issues || [
                  { type: 'error', message: cacheEntry.parsedData.error },
              ]
          )
              .map((i) => `[${i.type}] ${i.message}`)
              .join('\n')
        : '';
    const parsingWarningIcon = hasParsingIssues
        ? html`<span class="ml-1 text-yellow-400" data-tooltip=${issuesTooltip}
              >${icons.debug}</span
          >`
        : '';
    const toggleCompare = () => {
        if (isChecked) analysisActions.removeSegmentFromCompare(seg.uniqueId);
        else {
            if (segmentsForCompare.length >= 10) return;
            analysisActions.addSegmentToCompare({
                streamId: activeStreamId,
                repId,
                segmentUniqueId: seg.uniqueId,
            });
        }
    };
    const getCompareTitle = () => {
        if (seg.gap) return 'Cannot compare a GAP segment';
        if (!isLoaded) return 'Segment must be loaded to compare';
        return isChecked ? 'Remove from comparison' : 'Add to comparison';
    };
    const compareButton = html`<button
        @click=${toggleCompare}
        title=${getCompareTitle()}
        class="w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isChecked
            ? 'text-red-400 hover:bg-red-900/50'
            : 'text-blue-400 hover:bg-blue-900/50'} ${isDisabled
            ? 'opacity-50 cursor-not-allowed'
            : ''}"
        ?disabled=${isDisabled}
    >
        ${isChecked ? icons.minusCircle : icons.plusCircle}
    </button>`;
    const isTarget =
        targetTime &&
        seg.startTimeUTC &&
        seg.endTimeUTC &&
        seg.startTimeUTC <= targetTime.getTime() &&
        seg.endTimeUTC > targetTime.getTime();
    const rowClasses = {
        'bg-slate-800/50': seg.gap,
        'text-slate-600': seg.gap,
        italic: seg.gap,
        'ring-2': isTarget,
        'ring-cyan-400': isTarget,
        'z-10': isTarget,
        relative: isTarget,
        'flash-new-segment': shouldFlash,
    };
    const timingContent =
        seg.type === 'Media' && !seg.gap && seg.timescale > 0
            ? `${(seg.time / seg.timescale).toFixed(2)}s (+${(seg.duration / seg.timescale).toFixed(2)}s)`
            : 'N/A';
    const handleCopyUrl = (e) =>
        copyTextToClipboard(e.currentTarget.dataset.url, 'Segment URL copied!');
    const urlText = seg.resolvedUrl
        ? seg.resolvedUrl.split('/').pop().split('?')[0]
        : 'GAP';

    return html`
        <div
            class="segment-row grid md:grid-cols-[4rem_minmax(0,1.5fr)_8rem_6rem_7rem_minmax(0,2.5fr)] items-stretch gap-y-2 p-3 md:p-0 border-b border-slate-700 hover:bg-slate-700/50 transition-colors duration-200 ${classMap(
                rowClasses
            )}"
            data-url="${seg.resolvedUrl}"
            data-start-time=${seg.startTimeUTC || ''}
            data-end-time=${seg.endTimeUTC || ''}
            style="min-height: 64px; max-height: 64px;"
        >
            <div
                class="md:flex items-center justify-center md:px-3 md:py-1.5 md:border-r md:border-slate-700 h-full"
            >
                ${compareButton}
            </div>
            <div
                class="flex items-center space-x-3 md:px-3 md:py-1.5 md:border-r md:border-slate-700 h-full"
            >
                <div data-tooltip="Status: ${statusLabel}">${statusIcon}</div>
                <div>
                    <span class="font-medium flex items-center"
                        >${seg.type === 'Init' ? 'Init' : 'Media'}</span
                    >
                    <span class="block text-xs text-slate-500"
                        >#${seg.number}</span
                    >
                </div>
                ${parsingWarningIcon}
            </div>
            <div
                class="text-xs font-mono md:px-3 md:py-1.5 md:border-r md:border-slate-700 h-full flex items-center"
            >
                ${timingContent}
            </div>
            <div
                class="md:px-3 md:py-1.5 md:border-r md:border-slate-700 h-full flex items-center"
            >
                ${flagsTemplate(seg, cacheEntry)}
            </div>
            <div
                class="md:px-3 md:py-1.5 md:border-r md:border-slate-700 h-full flex items-center"
            >
                ${encryptionTemplate(seg)}
            </div>
            <div
                class="md:px-3 md:py-1.5 flex justify-between items-center w-full h-full"
            >
                <div class="flex items-center min-w-0">
                    <span
                        class="font-mono text-sm ${seg.gap
                            ? ''
                            : 'text-cyan-400'} truncate"
                        title="${seg.resolvedUrl}"
                        >${urlText}</span
                    >
                    ${!seg.gap
                        ? html`<button
                              @click=${handleCopyUrl}
                              data-url="${seg.resolvedUrl}"
                              title="Copy segment URL"
                              class="ml-2 shrink-0 text-slate-400 hover:text-white"
                          >
                              ${icons.clipboardCopy}
                          </button>`
                        : ''}
                </div>
                <div class="flex items-center space-x-2 shrink-0 ml-4">
                    ${getActions()}
                </div>
            </div>
        </div>
    `;
};
