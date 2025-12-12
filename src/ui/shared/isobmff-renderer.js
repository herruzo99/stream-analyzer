import { getTooltipData as getAllIsoTooltipData } from '@/infrastructure/parsing/isobmff/index';
import { isDebugMode } from '@/shared/utils/env';
import { uiActions } from '@/state/uiStore';
import '@/ui/components/virtualized-list';
import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html } from 'lit-html';
import { scte35DetailsTemplate } from './scte35-details.js';

const allIsoTooltipData = getAllIsoTooltipData();

export const findBoxRecursive = (boxes, predicateOrType) => {
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

const getTimescaleForBox = (box, rootData) => {
    if (!rootData || !rootData.boxes) return null;
    const mdhd = findBoxRecursive(rootData.boxes, (b) => b.type === 'mdhd');
    return mdhd?.details?.timescale?.value || null;
};

const formatDuration = (value, timescale) => {
    if (!timescale || isNaN(value)) return null;
    const seconds = value / timescale;
    if (seconds < 0.001) return `${(seconds * 1000).toFixed(0)}μs`;
    if (seconds < 1) return `${(seconds * 1000).toFixed(2)}ms`;
    return `${seconds.toFixed(3)}s`;
};

const renderHexPreview = (data) => {
    const maxBytes = 16;
    const slice = data.slice(0, maxBytes);
    const hex = Array.from(slice)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
    const ascii = Array.from(slice)
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
        .join('');
    const remaining = data.length - maxBytes;
    return html`
        <div
            class="font-mono text-[10px] bg-black/40 rounded border border-slate-700/50 p-2 flex items-center gap-3 select-all group cursor-text"
        >
            <span class="text-blue-300">${hex}</span>
            <div class="w-px h-3 bg-slate-700"></div>
            <span class="text-emerald-200/80 tracking-widest">${ascii}</span>
            ${remaining > 0
                ? html`<span class="text-slate-600 italic ml-2 text-[9px]"
                      >+${remaining} bytes</span
                  >`
                : ''}
        </div>
    `;
};

const renderEmsgPayload = (box) => {
    if (!box.messagePayloadType) return html``;

    const sectionTitle = html`
        <div
            class="px-4 py-2 bg-slate-800/80 border-b border-slate-700/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4"
        >
            Event Payload (${box.messagePayloadType.toUpperCase()})
        </div>
    `;

    let content;

    if (box.messagePayloadType === 'scte35') {
        const hasRawXml = !!box.messagePayload.rawXml;
        content = html` <div class="p-4">
            ${scte35DetailsTemplate(box.messagePayload)}
            ${hasRawXml
                ? html`
                      <details class="mt-4">
                          <summary
                              class="text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer mb-2 hover:text-slate-300"
                          >
                              View Raw XML
                          </summary>
                          <div
                              class="bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto"
                          >
                              <pre
                                  class="text-[10px] font-mono text-slate-400 whitespace-pre-wrap"
                              >
${box.messagePayload.rawXml}</pre
                              >
                          </div>
                      </details>
                  `
                : ''}
        </div>`;
    } else if (box.messagePayloadType === 'xml') {
        content = html`
            <div class="p-4 bg-slate-900 overflow-x-auto custom-scrollbar">
                <pre
                    class="text-xs font-mono text-blue-300 whitespace-pre-wrap break-all"
                >
${box.messagePayload}</pre
                >
            </div>
        `;
    } else {
        content = html`<div class="p-4">
            ${renderHexPreview(box.messagePayload)}
        </div>`;
    }

    return html`
        <div
            class="mt-4 bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden"
        >
            ${sectionTitle}${content}
        </div>
    `;
};

const renderValue = (key, value, timescale = null) => {
    if (value instanceof Uint8Array) return renderHexPreview(value);

    if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !value.value
    ) {
        return html`
            <div class="flex flex-wrap gap-1.5 mt-1">
                ${Object.entries(value).map(([flagName, isSet]) => {
                    return html`
                        <span
                            class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide flex items-center gap-1.5 ${isSet
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-slate-800/50 text-slate-500 border-slate-700/50 opacity-60'}"
                        >
                            ${isSet
                                ? html`<span class="scale-75"
                                      >${icons.checkCircle}</span
                                  >`
                                : html`<span class="scale-75"
                                      >${icons.circle}</span
                                  >`}
                            ${flagName.replace(/_/g, ' ')}
                        </span>
                    `;
                })}
            </div>
        `;
    }

    if (key === 'ttmlPayload' && value && typeof value === 'object') {
        const cueCount = value.cues?.length || 0;
        const errorCount = value.errors?.length || 0;
        return html`
            <div class="text-[10px]">
                <span class="text-emerald-400 font-bold">${cueCount} Cues</span>
                ${errorCount > 0
                    ? html`<span class="text-red-400 ml-2"
                          >${errorCount} Errors</span
                      >`
                    : ''}
                <div
                    class="mt-1 max-h-24 overflow-y-auto bg-slate-950/50 p-1 rounded custom-scrollbar"
                >
                    ${value.cues
                        .slice(0, 3)
                        .map(
                            (c) =>
                                html`<div class="truncate text-slate-400">
                                    ${c.payload}
                                </div>`
                        )}
                    ${cueCount > 3
                        ? html`<div class="text-slate-600 italic">
                              +${cueCount - 3} more
                          </div>`
                        : ''}
                </div>
            </div>
        `;
    }

    if (Array.isArray(value)) {
        if (value.length === 0)
            return html`<span class="text-slate-600 italic">Empty List</span>`;
        if (typeof value[0] !== 'object')
            return html`<span class="text-cyan-300 break-all font-mono text-xs"
                >[ ${value.join(', ')} ]</span
            >`;
        return html`<span class="text-purple-300 font-bold text-xs"
            >${value.length} items</span
        >`;
    }

    if (typeof value === 'object' && value !== null) {
        return html`
            <div class="pl-2 border-l-2 border-slate-700 mt-1 space-y-1">
                ${Object.entries(value).map(
                    ([k, v]) =>
                        html`<div class="flex flex-col">
                            <span
                                class="text-[10px] text-slate-500 font-bold uppercase"
                                >${k}</span
                            ><span class="text-xs text-slate-300"
                                >${renderValue(k, v)}</span
                            >
                        </div>`
                )}
            </div>
        `;
    }

    let content = String(value);
    let suffix = html``;

    if (
        timescale &&
        (key.toLowerCase().includes('duration') ||
            key.toLowerCase().includes('time') ||
            key.toLowerCase().includes('offset'))
    ) {
        const timeStr = formatDuration(Number(value), timescale);
        if (timeStr)
            suffix = html`<span
                class="ml-2 text-[10px] text-emerald-400 bg-emerald-900/20 px-1 rounded border border-emerald-900/50 font-mono"
                >${timeStr}</span
            >`;
    }
    const isFourCC =
        typeof value === 'string' &&
        value.length === 4 &&
        /^[a-zA-Z0-9]{4}$/.test(value);
    return html`<span
            class="${isFourCC
                ? 'font-mono font-bold text-yellow-300 bg-yellow-900/20 px-1 rounded'
                : 'text-slate-200 font-mono'} break-all"
            >${content}</span
        >${suffix}`;
};

const propertyRow = (key, field, box, timescale, fieldForDisplay) => {
    const fieldInfo = allIsoTooltipData[`${box.type}@${key}`];
    const labelClass = fieldInfo?.text ? tooltipTriggerClasses : '';
    const isHighlighted = fieldForDisplay === key;
    const handleMouseEnter = () =>
        uiActions.setInteractiveSegmentHighlightedItem(box, key);
    const handleMouseLeave = () =>
        uiActions.setInteractiveSegmentHighlightedItem(null, null);
    const bgClass = isHighlighted
        ? 'bg-blue-900/30 ring-1 ring-blue-500/50'
        : 'hover:bg-white/[0.02]';

    return html`
        <div
            class="group flex flex-col p-2 rounded transition-colors border-b border-slate-800/50 last:border-0 ${bgClass}"
            @mouseenter=${handleMouseEnter}
            @mouseleave=${handleMouseLeave}
        >
            <dt
                class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 w-full flex justify-between items-center"
            >
                <span
                    class="${labelClass}"
                    data-tooltip="${fieldInfo?.text || ''}"
                    data-iso="${fieldInfo?.ref || ''}"
                    >${key}</span
                >
                ${fieldInfo?.ref
                    ? html`<span
                          class="text-[9px] text-slate-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                          >${fieldInfo.ref}</span
                      >`
                    : ''}
            </dt>
            <dd class="text-sm leading-relaxed">
                ${renderValue(key, field.value, timescale)}
            </dd>
        </div>
    `;
};

const SAMPLE_FIELD_WHITELIST = {
    trun: [
        'duration',
        'size',
        'sampleFlags',
        'compositionTimeOffset',
        'ttmlPayload',
    ],
    senc: ['iv', 'subsamples'],
    ctts: ['sample_count', 'sample_offset'],
    stts: ['sample_count', 'sample_delta'],
    stsc: ['first_chunk', 'samples_per_chunk', 'sample_description_index'],
    stsz: ['entry_size'],
    stss: ['sample_number'],
    stco: ['chunk_offset'],
    sbgp: ['sample_count', 'group_description_index'],
    sdtp: [
        'is_leading',
        'sample_depends_on',
        'sample_is_depended_on',
        'sample_has_redundancy',
    ],
    subs: ['sample_delta', 'subsamples'],
    tfra: [
        'time',
        'moof_offset',
        'traf_number',
        'trun_number',
        'sample_number',
    ],
    sidx: ['type', 'size', 'duration', 'startsWithSap'],
};

export const entriesTableTemplate = (box) => {
    const entries = box.samples || box.entries;
    if (!entries || entries.length === 0) return '';

    const firstEntry = entries[0];
    const validHeaders =
        SAMPLE_FIELD_WHITELIST[box.type] ||
        Object.keys(firstEntry).filter(
            (k) =>
                k !== 'isSample' &&
                k !== 'index' &&
                k !== 'offset' &&
                k !== 'color' &&
                k !== 'trunOffset'
        );
    const headers = validHeaders.filter(
        (h) =>
            h in firstEntry ||
            (h === 'ttmlPayload' && entries.some((e) => e.ttmlPayload))
    );

    if (headers.length === 0) return '';
    const rowHeight = 32;
    const colClass =
        'w-36 shrink-0 px-3 py-2 border-r border-slate-800 last:border-0 truncate';
    const idxClass =
        'w-12 shrink-0 px-2 py-2 text-right text-slate-600 border-r border-slate-800 select-none sticky left-0 bg-inherit z-10';

    const rowRenderer = (entry, index) => {
        const actualIndex = entry.isSample ? entry.index : index;
        const isEven = index % 2 === 0;
        const bgClass = isEven ? 'bg-slate-900/50' : 'bg-slate-900';

        return html`
            <div
                class="flex items-center text-xs font-mono hover:bg-blue-500/20 transition-colors ${bgClass} border-b border-slate-800/50 last:border-0 h-[32px] min-w-max"
            >
                <div class="${idxClass}">${actualIndex + 1}</div>
                ${headers.map(
                    (h) =>
                        html`<div
                            class="${colClass}"
                            title="${String(entry[h])}"
                        >
                            ${renderValue(h, entry[h])}
                        </div>`
                )}
            </div>
        `;
    };

    return html`
        <div
            class="mt-6 border border-slate-700 rounded-xl overflow-hidden bg-slate-900 shadow-lg"
        >
            <div
                class="px-4 py-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center"
            >
                <h4
                    class="font-bold text-xs text-white uppercase tracking-widest flex items-center gap-2"
                >
                    ${icons.list} Entries
                    <span
                        class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-[9px] border border-slate-600"
                        >${entries.length}</span
                    >
                </h4>
            </div>
            <div class="overflow-x-auto custom-scrollbar">
                <div class="min-w-max">
                    <div
                        class="flex bg-slate-900/80 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none sticky top-0 z-20"
                    >
                        <div
                            class="${idxClass} bg-slate-900 border-b border-slate-800"
                        >
                            #
                        </div>
                        ${headers.map(
                            (h) => html`<div class="${colClass}">${h}</div>`
                        )}
                    </div>
                    <div
                        class="relative w-full bg-slate-950"
                        style="height: 300px; contain: strict;"
                    >
                        <virtualized-list
                            .items=${entries}
                            .rowTemplate=${rowRenderer}
                            .rowHeight=${rowHeight}
                            .itemId=${(item, idx) => idx}
                        ></virtualized-list>
                    </div>
                </div>
            </div>
        </div>
    `;
};

// --- NEW Chunk Metadata Renderer ---
const renderChunkInfo = (chunkInfo) => {
    if (!chunkInfo) return '';
    return html`
        <div
            class="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-4"
        >
            <div class="flex items-center gap-2 mb-3">
                <span
                    class="text-blue-400 font-bold text-xs uppercase tracking-wider"
                >
                    ${icons.layers} CMAF Chunk #${chunkInfo.index}
                </span>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span
                        class="block text-[10px] text-slate-500 font-bold uppercase mb-1"
                        >Total Size</span
                    >
                    <span class="font-mono text-slate-200"
                        >${chunkInfo.totalSize.toLocaleString()} bytes</span
                    >
                </div>
                <div>
                    <span
                        class="block text-[10px] text-slate-500 font-bold uppercase mb-1"
                        >Decode Base</span
                    >
                    <span class="font-mono text-slate-200"
                        >${chunkInfo.baseTime}</span
                    >
                </div>
            </div>
        </div>
    `;
};

export const inspectorDetailsTemplate = (
    box,
    rootData,
    fieldForDisplay = null
) => {
    const boxInfo = allIsoTooltipData[box.type] || {};
    const timescale = getTimescaleForBox(box, rootData);
    const fields = Object.entries(box.details).filter(([key, field]) => {
        if (field.internal) return false;
        if (key.endsWith('_raw') && box.details[key.replace('_raw', '')])
            return false;
        return true;
    });
    const handleCopyJson = () => {
        const cleanObj = { ...box.details };
        const json = JSON.stringify(
            cleanObj,
            (k, v) => {
                if (v && v.internal) return undefined;
                if (v && v.value !== undefined) return v.value;
                return v;
            },
            2
        );
        copyTextToClipboard(json, 'Box Data Copied');
    };

    return html`
        <div class="h-full flex flex-col bg-slate-900 min-h-0">
            <div
                class="shrink-0 p-5 border-b border-slate-800 bg-gradient-to-b from-slate-800/50 to-slate-900/50"
            >
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="flex items-baseline gap-3">
                            <h2
                                class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 font-mono tracking-tight"
                            >
                                ${box.type}
                            </h2>
                            <span
                                class="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-600 text-slate-400 text-xs font-mono"
                                >${box.size.toLocaleString()} bytes</span
                            >
                        </div>
                        <h3 class="text-sm font-medium text-white mt-1">
                            ${boxInfo.name || 'Unknown Box'}
                        </h3>
                    </div>
                    <button
                        @click=${handleCopyJson}
                        class="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Copy JSON"
                    >
                        ${icons.clipboardCopy}
                    </button>
                </div>
                ${boxInfo.text
                    ? html`<div
                          class="text-xs text-slate-400 leading-relaxed bg-black/20 p-3 rounded border border-white/5 relative"
                      >
                          <div
                              class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l"
                          ></div>
                          ${boxInfo.text}
                      </div>`
                    : ''}
            </div>
            <div class="grow overflow-y-auto custom-scrollbar p-5 min-h-0">
                <!-- NEW Chunk Info Block -->
                ${renderChunkInfo(box.chunkInfo)}
                ${fields.length > 0
                    ? html`<div
                          class="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden"
                      >
                          <div
                              class="px-4 py-2 bg-slate-800/80 border-b border-slate-700/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                          >
                              Properties
                          </div>
                          <div class="p-2">
                              ${fields.map(([key, field]) =>
                                  propertyRow(
                                      key,
                                      field,
                                      box,
                                      timescale,
                                      fieldForDisplay
                                  )
                              )}
                          </div>
                      </div>`
                    : html`<div
                          class="text-center p-8 text-slate-600 italic border-2 border-dashed border-slate-800 rounded-xl"
                      >
                          No properties parsed for this box.
                      </div>`}

                <!-- Specialized Payload Views -->
                ${box.type === 'emsg' ? renderEmsgPayload(box) : ''}

                <!-- Standard Entries Table -->
                ${entriesTableTemplate(box)}
            </div>
        </div>
    `;
};

export const isoBoxTreeTemplate = (box, context = {}) => {
    const { isIFrame = false } = context;
    const boxInfo = allIsoTooltipData[box.type] || {};
    let issues = box.issues || [];
    if (isIFrame && box.type === 'mdat')
        issues = issues.filter((issue) => !issue.message.includes('truncated'));
    const hasError = isDebugMode && issues.length > 0;

    const boxTypeColors = {
        moov: 'text-indigo-400',
        trak: 'text-violet-400',
        mdia: 'text-blue-400',
        minf: 'text-cyan-400',
        stbl: 'text-emerald-400',
        moof: 'text-blue-400',
        traf: 'text-sky-400',
        tfhd: 'text-teal-300',
        trun: 'text-cyan-300',
        mdat: 'text-slate-400',
        ftyp: 'text-rose-400',
        emsg: 'text-fuchsia-400',
        sidx: 'text-amber-400',
    };

    const typeColor =
        boxTypeColors[box.type] ||
        (hasError ? 'text-yellow-400' : 'text-blue-300');
    const borderColor = hasError ? 'border-yellow-600' : 'border-slate-800';

    const allFields = Object.entries(box.details).filter(([key, field]) => {
        if (field.internal) return false;
        if (key.endsWith('_raw')) return false;
        if (key === 'size' || key === 'type') return false;
        return true;
    });

    const scalarFields = [];
    const complexFields = [];

    allFields.forEach(([key, field]) => {
        const val = field.value;
        const isComplex =
            typeof val === 'object' &&
            val !== null &&
            !Array.isArray(val) &&
            !val.value;

        if (isComplex) {
            complexFields.push([key, field]);
        } else {
            scalarFields.push([key, field]);
        }
    });

    return html`
        <div class="relative pl-6 my-2 group">
            <div
                class="absolute top-0 bottom-0 left-2.5 w-px bg-gradient-to-b from-slate-800 to-slate-900 group-last:h-6"
            ></div>
            <div class="absolute top-6 left-2.5 w-4 h-px bg-slate-800"></div>

            <div
                class="bg-slate-950 rounded-lg border ${borderColor} overflow-hidden shadow-sm transition-all hover:border-slate-700"
            >
                <div
                    class="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800"
                >
                    <div class="flex items-center gap-3">
                        <span
                            class="font-mono font-bold text-xs ${typeColor} px-2 py-0.5 bg-slate-950 rounded border border-slate-800 shadow-inner ${boxInfo.text
                                ? tooltipTriggerClasses
                                : ''}"
                            data-tooltip="${boxInfo.text || ''}"
                            data-iso="${boxInfo.ref || ''}"
                            >${box.type}</span
                        >
                        <span class="text-xs font-semibold text-slate-300"
                            >${boxInfo.name || ''}</span
                        >
                        <!-- NEW: Inline Chunk Badge -->
                        ${box.chunkInfo
                            ? html`<span
                                  class="px-1.5 py-0.5 rounded bg-blue-900/30 border border-blue-500/30 text-[9px] font-bold text-blue-300 uppercase tracking-wider"
                                  >Chunk #${box.chunkInfo.index}</span
                              >`
                            : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        <span
                            class="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800"
                        >
                            ${box.size.toLocaleString()} B
                        </span>
                        ${hasError
                            ? html`<span
                                  class="text-yellow-400 text-[10px] font-bold flex items-center gap-1 bg-yellow-900/20 px-1.5 py-0.5 rounded border border-yellow-900/50"
                              >
                                  ${icons.alertTriangle} Issue
                              </span>`
                            : ''}
                    </div>
                </div>

                <div class="p-3 space-y-3">
                    ${scalarFields.length > 0
                        ? html`
                              <div
                                  class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2"
                              >
                                  ${scalarFields.map(
                                      ([key, field]) => html`
                                          <div
                                              class="flex flex-col text-xs group/field"
                                          >
                                              <span
                                                  class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 truncate"
                                                  title="${key}"
                                                  >${key}</span
                                              >
                                              <div class="font-mono truncate">
                                                  ${renderValue(
                                                      key,
                                                      field.value
                                                  )}
                                              </div>
                                          </div>
                                      `
                                  )}
                              </div>
                          `
                        : ''}
                    ${complexFields.length > 0
                        ? html`
                              <div
                                  class="space-y-2 pt-2 border-t border-slate-800/50"
                              >
                                  ${complexFields.map(
                                      ([key, field]) => html`
                                          <div>
                                              <span
                                                  class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1"
                                                  >${key}</span
                                              >
                                              ${renderValue(key, field.value)}
                                          </div>
                                      `
                                  )}
                              </div>
                          `
                        : ''}
                </div>
            </div>

            ${box.children && box.children.length > 0
                ? html`
                      <div class="ml-1">
                          ${box.children.map((child) =>
                              isoBoxTreeTemplate(child, context)
                          )}
                      </div>
                  `
                : ''}
        </div>
    `;
};
