import { html } from 'lit-html';
import { tooltipTriggerClasses } from '../../../shared/constants.js';
import { getTooltipData as getIsobmffTooltipData } from '../../../protocols/segment/isobmff/index.js';
import { useStore } from '../../../core/store.js';

const cmafResultTemplate = (result) => {
    const statusColors = {
        pass: 'text-green-400',
        fail: 'text-red-400',
        warn: 'text-yellow-400',
        info: 'text-blue-400',
    };
    const icon = {
        pass: '✓',
        fail: '✗',
        warn: '⚠️',
        info: 'ℹ',
    };
    return html`
        <tr class="hover:bg-gray-700/50">
            <td class="p-2 border border-gray-700 w-12 text-center">
                <span class="${statusColors[result.status]} font-bold"
                    >${icon[result.status]}</span
                >
            </td>
            <td class="p-2 border border-gray-700 text-gray-300">
                ${result.text}
            </td>
            <td class="p-2 border border-gray-700 text-gray-400 break-words">
                ${result.details}
            </td>
        </tr>
    `;
};

const cmafValidationTemplate = (stream) => {
    const results = stream.semanticData?.get('cmafValidation');
    if (!results) {
        return html` <div class="text-sm text-gray-500 p-4 text-center">
            Running CMAF conformance checks...
        </div>`;
    }

    return html`
        <div class="mt-4">
            <h4 class="text-md font-bold mb-2">CMAF Conformance</h4>
            <div
                class="bg-gray-900/50 rounded border border-gray-700/50 overflow-hidden"
            >
                <table class="w-full text-left text-xs table-auto">
                    <thead class="bg-gray-800/50">
                        <tr>
                            <th class="p-2 font-semibold text-gray-400">
                                Status
                            </th>
                            <th class="p-2 font-semibold text-gray-400">
                                Check
                            </th>
                            <th class="p-2 font-semibold text-gray-400">
                                Details
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-700/50">
                        ${results.map(cmafResultTemplate)}
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
    // We need the stream object to check for CMAF results
    const { streams, activeStreamId } = useStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);

    return html`
        <div>
            ${stream ? cmafValidationTemplate(stream) : ''}
            <ul class="list-none p-0 space-y-2 mt-4">
                ${isobmffData.boxes.map(
                    (box) => html`<li>${isoBoxTemplate(box)}</li>`
                )}
            </ul>
        </div>
    `;
};