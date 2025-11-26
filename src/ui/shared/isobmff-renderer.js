import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { getTooltipData as getAllIsoTooltipData } from '@/infrastructure/parsing/isobmff/index';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { isDebugMode } from '@/shared/utils/env';
import { uiActions } from '@/state/uiStore'; // Needed for field highlighting
import '@/ui/components/virtualized-list';
import * as icons from '@/ui/icons';

const allIsoTooltipData = getAllIsoTooltipData();

// --- Utilities ---

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
    if (mdhd) return mdhd.details?.timescale?.value;
    return null;
};

const formatDuration = (value, timescale) => {
    if (!timescale || isNaN(value)) return null;
    const seconds = value / timescale;
    if (seconds < 0.001) return `${(seconds * 1000).toFixed(0)}μs`;
    if (seconds < 1) return `${(seconds * 1000).toFixed(2)}ms`;
    return `${seconds.toFixed(3)}s`;
};

// --- Renderers ---

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

const renderValue = (key, value, timescale = null) => {
    if (value instanceof Uint8Array) {
        return renderHexPreview(value);
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
        if (
            !value.value &&
            Object.keys(value).length > 0 &&
            Object.values(value).every((v) => typeof v === 'boolean')
        ) {
            return html`
                <div class="flex flex-wrap gap-1 mt-1">
                    ${Object.entries(value).map(
                        ([k, v]) => html`
                            <span
                                class="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border ${v
                                    ? 'bg-green-900/30 text-green-400 border-green-800'
                                    : 'bg-slate-800 text-slate-500 border-slate-700 opacity-60'}"
                            >
                                ${k}
                            </span>
                        `
                    )}
                </div>
            `;
        }
        return html`
            <div class="pl-2 border-l-2 border-slate-700 mt-1 space-y-1">
                ${Object.entries(value).map(
                    ([k, v]) => html`
                        <div class="flex flex-col">
                            <span
                                class="text-[10px] text-slate-500 font-bold uppercase"
                                >${k}</span
                            >
                            <span class="text-xs text-slate-300"
                                >${renderValue(k, v)}</span
                            >
                        </div>
                    `
                )}
            </div>
        `;
    }

    let content = String(value);
    /** @type {import('lit-html').TemplateResult | string} */
    let suffix = '';

    if (
        timescale &&
        (key.includes('duration') ||
            key.includes('time') ||
            key.includes('Time') ||
            key.includes('offset'))
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

    return html`
        <span
            class="${isFourCC
                ? 'font-mono font-bold text-yellow-300 bg-yellow-900/20 px-1 rounded'
                : 'text-slate-200 font-mono'} break-all"
        >
            ${content}
        </span>
        ${suffix}
    `;
};

const propertyRow = (key, field, box, timescale, fieldForDisplay) => {
    const fieldInfo = allIsoTooltipData[`${box.type}@${key}`];
    const labelClass = fieldInfo?.text ? tooltipTriggerClasses : '';
    const isHighlighted = fieldForDisplay === key;

    const handleMouseEnter = () => {
        // Dispatch the specific field to highlight corresponding bytes in hex view
        uiActions.setInteractiveSegmentHighlightedItem(box, key);
    };

    const handleMouseLeave = () => {
        uiActions.setInteractiveSegmentHighlightedItem(null, null);
    };

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
                >
                    ${key}
                </span>
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

// --- Table Renderer (Virtual List) ---

const SAMPLE_FIELD_WHITELIST = {
    trun: ['duration', 'size', 'sampleFlags', 'compositionTimeOffset'],
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
    const headers = validHeaders.filter((h) => h in firstEntry);

    if (headers.length === 0) return '';

    const rowHeight = 32;

    // Define fixed column width logic
    const colClass =
        'w-36 shrink-0 px-3 py-2 border-r border-slate-800 last:border-0 truncate';
    const idxClass =
        'w-12 shrink-0 px-2 py-2 text-right text-slate-600 border-r border-slate-800 select-none sticky left-0 bg-inherit z-10';

    const rowRenderer = (entry, index) => {
        const actualIndex = entry.isSample ? entry.index : index;
        const isEven = index % 2 === 0;
        // We use 'bg-slate-900' as base to ensure sticky index column covers content behind it
        const bgClass = isEven ? 'bg-slate-900/50' : 'bg-slate-900';

        return html`
            <div
                class="flex items-center text-xs font-mono hover:bg-blue-500/20 transition-colors ${bgClass} border-b border-slate-800/50 last:border-0 h-[32px] min-w-max"
            >
                <div class="${idxClass}">${actualIndex + 1}</div>
                ${headers.map(
                    (h) => html`
                        <div class="${colClass}" title="${String(entry[h])}">
                            ${renderValue(h, entry[h])}
                        </div>
                    `
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

            <!-- Horizontal Scroll Wrapper -->
            <div class="overflow-x-auto custom-scrollbar">
                <div class="min-w-max">
                    <!-- Sticky Header -->
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

// --- Main Inspector Template ---

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
        <div class="h-full flex flex-col bg-slate-900">
            <!-- Hero Header -->
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
                            >
                                ${box.size.toLocaleString()} bytes
                            </span>
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
                    ? html`
                          <div
                              class="text-xs text-slate-400 leading-relaxed bg-black/20 p-3 rounded border border-white/5 relative"
                          >
                              <div
                                  class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l"
                              ></div>
                              ${boxInfo.text}
                          </div>
                      `
                    : ''}
            </div>

            <!-- Properties Grid -->
            <div class="grow overflow-y-auto custom-scrollbar p-5">
                ${fields.length > 0
                    ? html`
                          <div
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
                          </div>
                      `
                    : html`
                          <div
                              class="text-center p-8 text-slate-600 italic border-2 border-dashed border-slate-800 rounded-xl"
                          >
                              No properties parsed for this box.
                          </div>
                      `}

                <!-- Entries / Samples Table -->
                ${entriesTableTemplate(box)}
            </div>
        </div>
    `;
};

export const isoBoxTreeTemplate = (box, context = {}) => {
    const { isIFrame = false } = context;
    const boxInfo = allIsoTooltipData[box.type] || {};
    let issues = box.issues || [];

    if (isIFrame && box.type === 'mdat') {
        issues = issues.filter((issue) => !issue.message.includes('truncated'));
    }

    const hasError = isDebugMode && issues.length > 0;
    const typeColor = hasError ? 'text-yellow-400' : 'text-blue-400';
    const containerClass =
        'relative pl-4 border-l border-slate-800 hover:border-slate-600 transition-colors group';

    const connector = html`
        <div
            class="absolute top-3 left-0 w-3 h-px bg-slate-800 group-hover:bg-slate-600 transition-colors"
        ></div>
    `;
const fieldsToRender = Object.entries(box.details).filter(([key, field]) => {
        if (field.internal) return false;
        if (key.endsWith('_raw')) return false;
        // Exclude redundant fields already shown in header
        if (key === 'size' || key === 'type') return false;
        return true;
    });

    return html`
        <div class="${containerClass} my-1">
            ${connector}

            <div
                class="flex items-start gap-3 p-1 rounded hover:bg-white/[0.03] transition-colors"
            >
                <div
                    class="bg-slate-900 border border-slate-700 rounded px-2 py-1 min-w-[60px] text-center shadow-sm z-10"
                >
                    <span
                        class="font-mono font-bold text-xs ${typeColor} ${boxInfo.text
                            ? tooltipTriggerClasses
                            : ''}"
                        data-tooltip="${boxInfo.text || ''}"
                        data-iso="${boxInfo.ref || ''}"
                    >
                        ${box.type}
                    </span>
                </div>

                <div class="min-w-0 pt-0.5">
                    <div class="flex items-baseline gap-2">
                        <span class="text-xs font-semibold text-slate-200"
                            >${boxInfo.name || ''}</span
                        >
                        <span class="text-[10px] font-mono text-slate-500"
                            >${box.size.toLocaleString()} B</span
                        >
                        ${hasError
                            ? html`<span
                                  class="text-yellow-400 text-[10px] animate-pulse"
                                  >⚠ Issues Found</span
                              >`
                            : ''}
                    </div>

                    ${fieldsToRender.length > 0
                        ? html`
                              <div
                                  class="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 opacity-80 text-[10px] font-mono text-slate-400"
                              >
                                  ${fieldsToRender.map(
                                      ([key, field]) => html`
                                          <span class="break-all">
                                              <span class="text-slate-500"
                                                  >${key}:</span
                                              >
                                              <span class="text-slate-300"
                                                  >${String(field.value)}</span
                                              >
                                          </span>
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
