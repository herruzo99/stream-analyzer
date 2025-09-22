import { html, render } from 'lit-html';
import { analysisState, dom } from '../../core/state.js';
import { parse as parseTsSegment } from './ts/ts-parser.js';
import { getTooltipData } from './isobmff-parser.js';
import { tooltipTriggerClasses } from '../../shared/constants.js';

// --- UTILITY ---

function diffObjects(obj1, obj2) {
    const result = [];
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
        const val1 = obj1[key];
        const val2 = obj2[key];
        const isDifferent = JSON.stringify(val1) !== JSON.stringify(val2);

        result.push({
            key,
            val1: val1 !== undefined ? val1 : '---',
            val2: val2 !== undefined ? val2 : '---',
            isDifferent,
        });
    }
    return result;
}

// --- TEMPLATES (COMPARISON) ---

const segmentCompareTemplate = (diffData) => {
    return html`
        <div class="grid grid-cols-[1fr_2fr_2fr] text-xs">
            <div
                class="font-semibold p-2 border-b border-r border-gray-700 bg-gray-900/50"
            >
                Property
            </div>
            <div
                class="font-semibold p-2 border-b border-r border-gray-700 bg-gray-900/50"
            >
                Segment A
            </div>
            <div
                class="font-semibold p-2 border-b border-r border-gray-700 bg-gray-900/50"
            >
                Segment B
            </div>

            ${diffData.map(
                (item) => html`
                    <div
                        class="p-2 border-b border-r border-gray-700 font-medium text-gray-400"
                    >
                        ${item.key}
                    </div>
                    <div
                        class="p-2 border-b border-r border-gray-700 font-mono ${item.isDifferent
                            ? 'bg-red-900/50 text-red-300'
                            : ''}"
                    >
                        ${item.key === 'samples'
                            ? html`<div class="bg-gray-900 p-2 rounded">
                                  <pre>${item.val1}</pre>
                              </div>`
                            : item.val1}
                    </div>
                    <div
                        class="p-2 border-b border-r border-gray-700 font-mono ${item.isDifferent
                            ? 'bg-red-900/50 text-red-300'
                            : ''}"
                    >
                        ${item.key === 'samples'
                            ? html`<div class="bg-gray-900 p-2 rounded">
                                  <pre>${item.val2}</pre>
                              </div>`
                            : item.val2}
                    </div>
                `
            )}
        </div>
    `;
};

// --- TEMPLATES (TS) ---

const tsAnalysisTemplate = (analysis) => {
    const { summary, packets } = analysis.data;
    const pmtPid = Object.keys(summary.programMap)[0];
    const program = pmtPid ? summary.programMap[pmtPid] : null;

    const dataItem = (label, value) => html`
        <div class="text-xs">
            <span class="block text-gray-400 mb-0.5">${label}</span>
            <span class="block font-semibold font-mono text-gray-200"
                >${value}</span
            >
        </div>
    `;

    return html`
        <div
            class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 bg-gray-900 border border-gray-700 rounded p-3 mb-4"
        >
            ${dataItem('Type', 'MPEG-2 Transport Stream')}
            ${dataItem('Total Packets', summary.totalPackets)}
            ${dataItem('PCR PID', summary.pcrPid || 'N/A')}
            ${program ? dataItem('Program #', program.programNumber) : ''}
        </div>

        ${summary.errors.length > 0
            ? html`<div
                  class="bg-red-900/50 border border-red-700 rounded p-3 mb-4 text-red-300 text-xs"
              >
                  <p class="font-bold mb-1">Parsing Errors:</p>
                  <ul class="list-disc pl-5">
                      ${summary.errors.map((e) => html`<li>${e}</li>`)}
                  </ul>
              </div>`
            : ''}
        ${program
            ? html` <div class="mb-4">
                  <h4 class="font-semibold text-gray-300 mb-2">
                      Elementary Streams (from PMT):
                  </h4>
                  <table class="w-full text-left text-xs border-collapse">
                      <thead class="text-left">
                          <tr>
                              <th
                                  class="p-2 border border-gray-700 bg-gray-900/50"
                              >
                                  PID
                              </th>
                              <th
                                  class="p-2 border border-gray-700 bg-gray-900/50"
                              >
                                  Stream Type
                              </th>
                              <th
                                  class="p-2 border border-gray-700 bg-gray-900/50"
                              >
                                  Packets
                              </th>
                          </tr>
                      </thead>
                      <tbody>
                          ${Object.entries(program.streams).map(
                              ([pid, type]) => html`
                                  <tr>
                                      <td
                                          class="p-2 border border-gray-700 font-mono text-gray-400"
                                      >
                                          ${pid}
                                      </td>
                                      <td
                                          class="p-2 border border-gray-700 text-gray-200"
                                      >
                                          ${type}
                                      </td>
                                      <td
                                          class="p-2 border border-gray-700 text-gray-200"
                                      >
                                          ${summary.pids[pid]?.count || 0}
                                      </td>
                                  </tr>
                              `
                          )}
                      </tbody>
                  </table>
              </div>`
            : ''}
    `;
};

// --- TEMPLATES (ISOBMFF) ---

const isoBoxTemplate = (box) => {
    const tooltipData = getTooltipData();
    const boxInfo = tooltipData[box.type] || {};
    const headerTemplate = html` <div class="font-semibold font-mono">
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
            ? html` <table
                  class="mt-2 text-xs border-collapse w-full table-auto"
              >
                  <tbody>
                      ${Object.entries(box.details).map(([key, field]) => {
                          const fieldTooltip =
                              tooltipData[`${box.type}@${key}`];
                          const valueTemplate =
                              key === 'samples'
                                  ? html`<div class="bg-gray-900 p-2 rounded">
                                        <pre>${field.value}</pre>
                                    </div>`
                                  : field.value;
                          return html`<tr>
                              <td
                                  class="border border-gray-700 p-2 text-gray-400 w-1/4 ${fieldTooltip
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
                                  ${valueTemplate}
                              </td>
                          </tr>`;
                      })}
                  </tbody>
              </table>`
            : '';

    const childrenTemplate =
        box.children.length > 0
            ? html`<ul class="list-none pl-6 mt-2 border-l border-gray-600">
                  ${box.children.map(
                      (child) =>
                          html`<li class="mt-2">${isoBoxTemplate(child)}</li>`
                  )}
              </ul>`
            : '';

    return html`${headerTemplate}${detailsTemplate}${childrenTemplate}`;
};

const essentialDataTemplate = (boxes) => {
    const moof = boxes.find((b) => b.type === 'moof');
    const moov = boxes.find((b) => b.type === 'moov');

    const dataItem = (label, value) => html`
        <div class="text-xs">
            <span class="block text-gray-400 mb-0.5">${label}</span>
            <span class="block text-gray-200 font-semibold font-mono"
                >${value}</span
            >
        </div>
    `;

    if (moof) {
        const mfhd = moof.children.find((b) => b.type === 'mfhd');
        const traf = moof.children.find((b) => b.type === 'traf');
        if (!mfhd || !traf) return html``;
        const tfhd = traf.children.find((b) => b.type === 'tfhd');
        const tfdt = traf.children.find((b) => b.type === 'tfdt');
        const trun = traf.children.find((b) => b.type === 'trun');
        return html` <div
            class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 bg-gray-900 border border-gray-700 rounded p-3 mb-4"
        >
            ${dataItem('Type', 'Media Segment')}
            ${dataItem(
                'Sequence #',
                mfhd.details.sequence_number?.value || 'N/A'
            )}
            ${dataItem('Track ID', tfhd?.details.track_ID?.value || 'N/A')}
            ${dataItem(
                'Base Decode Time',
                tfdt?.details.baseMediaDecodeTime?.value || 'N/A'
            )}
            ${dataItem(
                'Sample Count',
                trun?.details.sample_count?.value || 'N/A'
            )}
        </div>`;
    } else if (moov) {
        const mvhd = moov.children.find((b) => b.type === 'mvhd');
        const traks = moov.children.filter((b) => b.type === 'trak');
        return html` <div
            class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 bg-gray-900 border border-gray-700 rounded p-3 mb-4"
        >
            ${dataItem('Type', 'Initialization Segment')}
            ${dataItem('Timescale', mvhd?.details.timescale?.value || 'N/A')}
            ${dataItem('Duration', mvhd?.details.duration?.value || 'N/A')}
            ${dataItem('Track Count', traks.length)}
        </div>`;
    }
    return html``;
};

const isoAnalysisTemplate = (boxes) => html`
    ${essentialDataTemplate(boxes)}
    <div>
        <ul class="list-none p-0">
            ${boxes.map((box) => html`<li>${isoBoxTemplate(box)}</li>`)}
        </ul>
    </div>
`;

// --- DISPATCHER ---

export function dispatchAndRenderSegmentAnalysis(e, buffer, bufferB = null) {
    if (!buffer) {
        render(
            html`<p class="fail">Segment buffer not available.</p>`,
            dom.modalContentArea
        );
        return;
    }

    const urlA =
        /** @type {HTMLElement} */ (e?.currentTarget)?.dataset.url ||
        analysisState.segmentsForCompare[0];
    const cachedA = analysisState.segmentCache.get(urlA);

    try {
        if (cachedA?.parsedData?.format === 'ts') {
            const analysisA = cachedA.parsedData;
            if (bufferB) {
                const urlB = analysisState.segmentsForCompare[1];
                const cachedB = analysisState.segmentCache.get(urlB);
                const analysisB = cachedB.parsedData;
                const diff = diffObjects(
                    analysisA.data.summary,
                    analysisB.data.summary
                );
                render(segmentCompareTemplate(diff), dom.modalContentArea);
            } else {
                render(tsAnalysisTemplate(analysisA), dom.modalContentArea);
            }
        } else {
            // Default to ISOBMFF.
            if (cachedA?.parsedData && !cachedA.parsedData.error) {
                render(
                    isoAnalysisTemplate(cachedA.parsedData),
                    dom.modalContentArea
                );
            } else {
                throw new Error(
                    'Segment could not be parsed as ISOBMFF, or was not found in cache.'
                );
            }
        }
    } catch (err) {
        console.error('Segment parsing error:', err);
        render(
            html`<p class="fail">
                Could not render segment analysis: ${err.message}.
            </p>`,
            dom.modalContentArea
        );
    }
}