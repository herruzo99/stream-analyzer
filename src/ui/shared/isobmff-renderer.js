import { html } from 'lit-html';
import { getTooltipData as getAllIsoTooltipData } from '@/infrastructure/parsing/isobmff/index';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

const allIsoTooltipData = getAllIsoTooltipData();

const findBoxRecursive = (boxes, predicateOrType) => {
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
        return renderObjectValue(value);
    }
    return value;
};

const entriesTableTemplate = (box) => {
    const entries = box.samples || box.entries;
    if (!entries || entries.length === 0) {
        return '';
    }

    const headers = Object.keys(entries[0] || {});
    if (headers.length === 0) return '';

    return html`
        <div class="p-3 border-t border-gray-700">
            <h4 class="font-bold text-sm mb-2 text-gray-300">
                Entries / Samples (${entries.length})
            </h4>
            <div class="max-h-60 overflow-y-auto">
                <table class="w-full text-left text-xs">
                    <thead class="sticky top-0 bg-gray-800">
                        <tr>
                            ${headers.map(
                                (h) =>
                                    html`<th class="p-1 font-semibold">
                                        ${h}
                                    </th>`
                            )}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-700">
                        ${entries.slice(0, 100).map(
                            (entry) => html`
                                <tr>
                                    ${headers.map(
                                        (h) =>
                                            html`<td
                                                class="p-1 font-mono truncate"
                                            >
                                                ${renderCellContent(entry[h])}
                                            </td>`
                                    )}
                                </tr>
                            `
                        )}
                    </tbody>
                </table>
                ${entries.length > 100
                    ? html`<div class="text-center text-xs text-gray-500 pt-2">
                          ... and ${entries.length - 100} more entries.
                      </div>`
                    : ''}
            </div>
        </div>
    `;
};

/**
 * Renders the detailed view of a single ISOBMFF box for the inspector panel.
 * @param {import('@/infrastructure/parsing/isobmff/parser.js').Box} box The box to render.
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
                    class="p-1 pr-2 text-xs text-gray-400 align-top"
                    title="${fieldInfo?.text || ''}"
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
        ${entriesTableTemplate(box)}
    `;
};

/**
 * Renders a full, recursive tree of ISOBMFF boxes.
 * @param {import('@/infrastructure/parsing/isobmff/parser.js').Box} box The box to render.
 * @returns {import('lit-html').TemplateResult}
 */
export const isoBoxTreeTemplate = (box) => {
    const boxInfo = allIsoTooltipData[box.type] || {};

    const headerTemplate = html`<div
        class="font-semibold font-mono p-2 bg-gray-900/50 rounded-t-md border-b border-gray-600 flex items-center gap-2"
    >
        ${box.issues && box.issues.length > 0
            ? html`<svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-yellow-400 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  title="${box.issues
                      .map((i) => `[${i.type}] ${i.message}`)
                      .join('\n')}"
              >
                  <path
                      fill-rule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                  />
              </svg>`
            : ''}
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

    const detailsTemplate =
        Object.keys(box.details).length > 0
            ? html`<div class="p-2">
                  <table class="text-xs border-collapse w-full table-auto">
                      <tbody>
                          ${Object.entries(box.details).map(([key, field]) => {
                              if (key.endsWith('_raw')) return ''; // Hide raw values if decoded ones exist
                              const fieldTooltip =
                                  allIsoTooltipData[`${box.type}@${key}`];
                              return html`<tr>
                                  <td
                                      class="border border-gray-700 p-2 text-gray-400 w-1/3 ${fieldTooltip
                                          ? tooltipTriggerClasses
                                          : ''}"
                                      data-tooltip="${fieldTooltip?.text || ''}"
                                      data-iso="${fieldTooltip?.ref || ''}"
                                  >
                                      ${key}
                                  </td>
                                  <td
                                      class="border border-gray-700 p-2 text-gray-200 font-mono break-all"
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
        ${entriesTableTemplate(box)} ${childrenTemplate}
    </div>`;
};
