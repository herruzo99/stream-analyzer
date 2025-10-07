import { html } from 'lit-html';
import { tooltipTriggerClasses } from '../../../shared/constants.js';
import { getTooltipData as getIsobmffTooltipData } from '../../../protocols/segment/isobmff/index.js';

const findBoxRecursive = (boxes, type) => {
    for (const box of boxes) {
        if (box.type === type) return box;
        if (box.children?.length > 0) {
            const found = findBoxRecursive(box.children, type);
            if (found) return found;
        }
    }
    return null;
};

const semanticCard = (title, box, fields) => {
    if (!box) return '';
    return html`
        <div class="bg-gray-900/50 border border-gray-700 rounded-lg">
            <h4
                class="text-sm font-semibold p-2 border-b border-gray-700 text-gray-300"
            >
                ${title}
            </h4>
            <dl
                class="grid grid-cols-[auto_1fr] gap-x-2 p-2 text-xs font-mono"
            >
                ${fields.map((field) => {
                    const value = box.details[field.key]?.value;
                    return value !== undefined
                        ? html`
                              <dt class="text-gray-400">${field.label}:</dt>
                              <dd class="text-white break-all">${value}</dd>
                          `
                        : '';
                })}
            </dl>
        </div>
    `;
};

const semanticSummaryTemplate = (boxes) => {
    const tkhd = findBoxRecursive(boxes, 'tkhd');
    const mdhd = findBoxRecursive(boxes, 'mdhd');
    const trex = findBoxRecursive(boxes, 'trex');
    const elst = findBoxRecursive(boxes, 'elst');

    return html`
        <div
            class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))] mb-6"
        >
            ${semanticCard('Track Header (tkhd)', tkhd, [
                { key: 'track_ID', label: 'Track ID' },
                { key: 'duration', label: 'Duration' },
                { key: 'width', label: 'Width' },
                { key: 'height', label: 'Height' },
            ])}
            ${semanticCard('Media Header (mdhd)', mdhd, [
                { key: 'timescale', label: 'Timescale' },
                { key: 'duration', label: 'Duration' },
                { key: 'language', label: 'Language' },
            ])}
            ${semanticCard('Track Extends (trex)', trex, [
                { key: 'track_ID', label: 'Track ID' },
                { key: 'default_sample_duration', label: 'Default Duration' },
                { key: 'default_sample_size', label: 'Default Size' },
            ])}
            ${semanticCard('Edit List (elst)', elst, [
                { key: 'entry_count', label: 'Entry Count' },
                {
                    key: 'entry_1_media_time',
                    label: 'Media Time (Entry 1)',
                },
            ])}
        </div>
    `;
};

const samplesTableTemplate = (box) => {
    if (!box.samples || box.samples.length === 0) return '';

    const headers = Object.keys(box.samples[0]);

    return html`
        <div class="mt-2">
            <h5
                class="text-xs font-semibold text-gray-400 uppercase tracking-wider"
            >
                Sample Table
            </h5>
            <div
                class="mt-1 overflow-y-auto max-h-64 border border-gray-700 rounded-md"
            >
                <table class="w-full text-left text-xs">
                    <thead class="bg-gray-800 sticky top-0">
                        <tr>
                            <th class="p-2">#</th>
                            ${headers.map(
                                (h) => html`<th class="p-2">${h}</th>`
                            )}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-700">
                        ${box.samples.map(
                            (sample, index) => html`
                                <tr class="hover:bg-gray-700/50">
                                    <td class="p-2">${index + 1}</td>
                                    ${headers.map(
                                        (h) => html`<td class="p-2 font-mono">
                                            ${sample[h] !== undefined
                                                ? sample[h]
                                                : 'N/A'}
                                        </td>`
                                    )}
                                </tr>
                            `
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

const isoBoxTemplate = (box) => {
    const tooltipData = getIsobmffTooltipData();
    const boxInfo = tooltipData[box.type] || {};

    const headerTemplate = html`<div
        class="font-semibold font-mono p-2 bg-gray-900/50 rounded-t-md border-b border-gray-600 flex items-center gap-2"
    >
        ${box.issues && box.issues.length > 0
            ? html`<svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-yellow-400 flex-shrink-0"
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
                              const fieldTooltip =
                                  tooltipData[`${box.type}@${key}`];
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
                                      ${field.value}
                                  </td>
                              </tr>`;
                          })}
                      </tbody>
                  </table>
                  ${samplesTableTemplate(box)}
              </div>`
            : '';

    const childrenTemplate =
        box.children.length > 0
            ? html`<div class="pl-4 mt-2 border-l-2 border-gray-600">
                  <ul class="list-none space-y-2">
                      ${box.children.map(
                          (child) => html`<li>${isoBoxTemplate(child)}</li>`
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

export const isobmffAnalysisTemplate = (isobmffData) => {
    return html`
        <div>
            <h3 class="text-xl font-bold mb-4">Semantic Summary</h3>
            ${semanticSummaryTemplate(isobmffData.boxes)}

            <h3 class="text-xl font-bold mb-4 mt-8">Full Box Tree</h3>
            <ul class="list-none p-0 space-y-2">
                ${isobmffData.boxes.map(
                    (box) => html`<li>${isoBoxTemplate(box)}</li>`
                )}
            </ul>
        </div>
    `;
};