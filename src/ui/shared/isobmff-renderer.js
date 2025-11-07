import { html } from 'lit-html';
import { getTooltipData as getAllIsoTooltipData } from '@/infrastructure/parsing/isobmff/index';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { isDebugMode } from '@/shared/utils/env';
import '@/ui/components/virtualized-list'; // Import for side-effect of registration

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
    if (mdhd) return mdhd.details?.timescale?.value;
    return null;
};

const renderObjectValue = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    return html`
        <div class="mt-1 ml-2 border-l border-gray-600 pl-2 space-y-1">
            ${Object.entries(obj).map(
                ([key, value]) => html`
                    <div class="flex">
                        <span class="text-gray-400 mr-2">${key}:</span>
                        <span
                            class="${value ? 'text-green-400' : 'text-red-400'}"
                            >${String(value)}</span
                        >
                    </div>
                `
            )}
        </div>
    `;
};

const renderTrunSampleFlags = (flags) => {
    if (!flags) {
        return html`<span class="text-gray-500">(inherited)</span>`;
    }
    const isSync = !flags.sample_is_non_sync_sample;
    const syncClass = isSync ? 'text-green-400' : 'text-yellow-400';
    const dependsOn = flags.sample_depends_on.includes('not') ? 'No' : 'Yes';

    return html`
        <div
            class="grid grid-cols-2 gap-x-2 text-left"
            title="Depends On: ${flags.sample_depends_on} | Is Depended On: ${flags.sample_is_depended_on} | Is Leading: ${flags.is_leading}"
        >
            <span class="${syncClass}">${isSync ? 'Sync' : 'Non-Sync'}</span>
            <span>Dep: ${dependsOn}</span>
        </div>
    `;
};

const renderCellContent = (value) => {
    if (value instanceof Uint8Array) {
        return Array.from(value)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }
    if (Array.isArray(value)) {
        if (
            value.length > 0 &&
            typeof value[0] === 'object' &&
            value[0] !== null
        ) {
            return value
                .map(
                    (sub) =>
                        `[C:${sub.BytesOfClearData},P:${sub.BytesOfProtectedData}]`
                )
                .join(' ');
        }
        return value.join(', ');
    }
    if (typeof value === 'object' && value !== null) {
        if (
            'sample_depends_on' in value &&
            'sample_is_non_sync_sample' in value
        ) {
            return renderTrunSampleFlags(value);
        }
        return renderObjectValue(value);
    }
    return value;
};

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
    if (!entries || entries.length === 0) {
        return '';
    }

    const firstEntry = entries[0];
    const validHeaders = SAMPLE_FIELD_WHITELIST[box.type] || [];
    const headers = validHeaders.filter((h) => h in firstEntry);

    if (headers.length === 0) return '';

    const rowHeight = 32;

    const rowRenderer = (entry, index) => {
        const rowTooltip = entry.isSample
            ? `Sample #${entry.index} located at file offset ${entry.offset}.`
            : `Entry #${index + 1}`;
        let rowBgClass = 'bg-gray-800/30';
        if (box.color?.bgClass) {
            const parts = box.color.bgClass.split('-');
            if (parts.length === 3) {
                rowBgClass = `bg-${parts[1]}-900/30`;
            }
        }

        return html`
            <div
                class="flex items-center border-b border-gray-700/50 text-xs ${rowBgClass} hover:bg-blue-500/40 cursor-pointer"
                style="height: ${rowHeight}px;"
                data-sample-offset="${entry.offset}"
                data-tooltip="${rowTooltip}"
            >
                <div
                    class="p-1 font-mono text-gray-500 w-12 text-right pr-2 border-r border-gray-700/50 self-stretch flex items-center justify-end"
                >
                    ${entry.isSample ? entry.index + 1 : index + 1}
                </div>
                ${headers.map(
                    (header) => html`
                        <div
                            class="p-1 font-mono truncate flex-1 border-r border-gray-700/50 last:border-r-0 self-stretch flex items-center"
                        >
                            ${renderCellContent(entry[header])}
                        </div>
                    `
                )}
            </div>
        `;
    };

    return html`
        <div class="p-3 border-t border-gray-700">
            <h4 class="font-bold text-sm mb-2 text-gray-300">
                Entries / Samples (${entries.length})
            </h4>
            <div
                class="bg-gray-900/50 text-white  rounded border border-gray-700/50 overflow-hidden"
            >
                <div
                    class="flex bg-gray-800 z-10 font-semibold text-xs text-slate-400"
                >
                    <div
                        class="p-1 w-12 text-right pr-2 border-r border-gray-700/50"
                    >
                        #
                    </div>
                    ${headers.map((header) => {
                        const tooltipKey = `${box.type}@${header}`;
                        const tooltipInfo = allIsoTooltipData[tooltipKey];
                        return html`<div
                            class="p-1 flex-1 border-r border-gray-700/50 last:border-r-0 ${tooltipInfo
                                ? tooltipTriggerClasses
                                : ''}"
                            data-tooltip=${tooltipInfo?.text || ''}
                            data-iso=${tooltipInfo?.ref || ''}
                        >
                            ${header}
                        </div>`;
                    })}
                </div>
                <virtualized-list
                    .items=${entries}
                    .rowTemplate=${(item, index) => rowRenderer(item, index)}
                    .rowHeight=${rowHeight}
                    .itemId=${(item) => item.index ?? item.offset}
                    style="height: ${Math.min(
                        entries.length * rowHeight,
                        400
                    )}px;"
                ></virtualized-list>
            </div>
        </div>
    `;
};

/**
 * Renders the detailed view of a single ISOBMFF box for the inspector panel.
 * @param {import('@/types.js').Box} box The box to render.
 * @param {object} rootData The root of the parsed segment data for context.
 * @param {string | null} [fieldForDisplay=null] The name of a field to highlight.
 * @returns {import('lit-html').TemplateResult}
 */
export const inspectorDetailsTemplate = (
    box,
    rootData,
    fieldForDisplay = null
) => {
    const boxInfo = allIsoTooltipData[box.type] || {};

    const fields = Object.entries(box.details).map(([key, field]) => {
        // Hide the raw flags if a decoded version exists
        if (key.endsWith('_raw') && box.details[key.replace('_raw', '')]) {
            return '';
        }
        // Hide internal fields meant only for rendering
        if (field.internal) {
            return '';
        }
        const fieldInfo = allIsoTooltipData[`${box.type}@${key}`];
        const highlightClass =
            fieldForDisplay === key ? 'is-inspector-field-highlighted' : '';
        let interpretedValue = html``;

        if (key === 'baseMediaDecodeTime' && box.type === 'tfdt') {
            const timescale = getTimescaleForBox(box, rootData);
            if (timescale) {
                interpretedValue = html`<span
                    class="text-xs text-cyan-400 block mt-1"
                    >(${(field.value / timescale).toFixed(3)} seconds)</span
                >`;
            }
        }

        return html`
            <tr
                class=${highlightClass}
                data-field-name="${key}"
                data-inspector-offset="${box.offset}"
            >
                <td
                    class="p-1 pr-2 text-xs text-gray-400 align-top ${fieldInfo?.text
                        ? tooltipTriggerClasses
                        : ''}"
                    data-tooltip="${fieldInfo?.text || ''}"
                    data-iso="${fieldInfo?.ref || ''}"
                >
                    ${key}
                </td>
                <td class="p-1 text-xs font-mono text-white break-all">
                    ${renderCellContent(field.value)} ${interpretedValue}
                </td>
            </tr>
        `;
    });

    return html`
        <div class="p-3 border-b border-gray-700">
            <div class="font-bold text-base mb-1">
                ${box.type}
                <span class="text-sm text-gray-400">(${box.size} bytes)</span>
            </div>
            <div class="text-xs text-emerald-400 mb-2 font-mono">
                ${boxInfo.ref || ''}
            </div>
            <p class="text-xs text-gray-300">
                ${boxInfo.text || 'No description available.'}
            </p>
        </div>
        <div class="overflow-y-auto">
            <table class="w-full table-fixed">
                <colgroup>
                    <col class="w-2/5" />
                    <col class="w-3/5" />
                </colgroup>
                <tbody>
                    ${fields}
                </tbody>
            </table>
        </div>
    `;
};

/**
 * Renders a full, recursive tree of ISOBMFF boxes.
 * @param {import('@/types.js').Box} box The box to render.
 * @returns {import('lit-html').TemplateResult}
 */
export const isoBoxTreeTemplate = (box) => {
    const boxInfo = allIsoTooltipData[box.type] || {};

    const warningIcon =
        isDebugMode && box.issues && box.issues.length > 0
            ? html`<svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-yellow-400 shrink-0 ${tooltipTriggerClasses}"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  data-tooltip="${box.issues
                      .map((i) => `[${i.type}] ${i.message}`)
                      .join('\n')}"
              >
                  <path
                      fill-rule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                  />
              </svg>`
            : '';

    const headerTemplate = html`<div
        class="font-semibold font-mono p-2 bg-gray-900/50 rounded-t-md border-b border-gray-600 flex items-center gap-2"
    >
        ${warningIcon}
        <span
            class="text-emerald-300 ${boxInfo.text
                ? tooltipTriggerClasses
                : ''}"
            data-tooltip="${boxInfo.text || ''}"
            data-iso="${boxInfo.ref || ''}"
            >${box.type}</span
        >
        <span class="text-gray-500 text-xs"
            >${boxInfo.name ? `(${boxInfo.name}) ` : ''}(${box.size}
            bytes)</span
        >
    </div>`;

    const fieldsToRender = Object.entries(box.details).filter(
        ([key, field]) => !field.internal
    );

    const detailsTemplate =
        fieldsToRender.length > 0
            ? html`<div class="p-2">
                  <table class="text-xs border-collapse w-full table-auto">
                      <tbody>
                          ${fieldsToRender.map(([key, field]) => {
                              if (key.endsWith('_raw')) return ''; // Hide raw values if decoded ones exist

                              const fieldTooltip =
                                  allIsoTooltipData[`${box.type}@${key}`];
                              return html`<tr>
                                  <td
                                      class="border border-gray-700 p-2 text-slate-400 w-1/3 ${fieldTooltip
                                          ? tooltipTriggerClasses
                                          : ''}"
                                      data-tooltip="${fieldTooltip?.text || ''}"
                                      data-iso="${fieldTooltip?.ref || ''}"
                                  >
                                      ${key}
                                  </td>
                                  <td
                                      class="border border-gray-700 p-2 text-slate-200 font-mono break-all"
                                  >
                                      ${renderCellContent(field.value)}
                                  </td>
                              </tr>`;
                          })}
                      </tbody>
                  </table>
              </div>`
            : '';

    const childrenTemplate =
        box.children.length > 0
            ? html`<div class="pl-4 mt-2 border-l-2 border-gray-600">
                  <ul class="list-none space-y-2">
                      ${box.children.map(
                          (child) => html`<li>${isoBoxTreeTemplate(child)}</li>`
                      )}
                  </ul>
              </div>`
            : '';

    return html`<div class="border border-gray-700 rounded-md bg-gray-800">
        ${headerTemplate}
        <div class="space-y-2">${detailsTemplate}</div>
        ${childrenTemplate}
    </div>`;
};
