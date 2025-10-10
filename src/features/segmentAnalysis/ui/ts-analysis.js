import { html } from 'lit-html';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { getTooltipData as getTsTooltipData } from '@/infrastructure/parsing/ts/index';

const tsTooltipData = getTsTooltipData();

const dataItem = (label, value) => {
    if (value === null || value === undefined) return '';
    return html`
        <div class="text-xs">
            <span class="block text-gray-400 mb-0.5">${label}</span>
            <span class="block font-semibold font-mono text-gray-200"
                >${value}</span
            >
        </div>
    `;
};

const semanticResultsTemplate = (results) => {
    if (!results || results.length === 0) {
        return html`<div
            class="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center"
        >
            <p class="text-sm text-green-400 font-semibold">
                ✓ No semantic issues found.
            </p>
        </div>`;
    }

    const statusClasses = {
        fail: 'text-red-400',
        warn: 'text-yellow-400',
    };
    const icon = {
        fail: '✗',
        warn: '⚠️',
    };

    return html`
        <div class="bg-gray-800 rounded-lg border border-gray-700">
            <table class="w-full text-left text-xs table-auto">
                <thead class="bg-gray-900/50">
                    <tr>
                        <th
                            class="p-2 font-semibold text-gray-400 w-16 text-center"
                        >
                            Status
                        </th>
                        <th class="p-2 font-semibold text-gray-400">Check</th>
                        <th class="p-2 font-semibold text-gray-400">Details</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700">
                    ${results.map(
                        (result) => html`
                            <tr class="hover:bg-gray-700/50">
                                <td
                                    class="p-2 text-center font-bold ${statusClasses[
                                        result.status
                                    ]}"
                                >
                                    ${icon[result.status]}
                                    ${result.status.toUpperCase()}
                                </td>
                                <td class="p-2 text-gray-300">
                                    ${result.text}
                                </td>
                                <td class="p-2 text-gray-400">
                                    ${result.details}
                                </td>
                            </tr>
                        `
                    )}
                </tbody>
            </table>
        </div>
    `;
};

const descriptorTableTemplate = (descriptors) => {
    if (!descriptors || descriptors.length === 0) {
        return html`<p class="text-xs text-gray-500 italic px-2">
            No descriptors present.
        </p>`;
    }
    return html`
        <div
            class="bg-gray-900/50 rounded border border-gray-700/50 overflow-hidden"
        >
            <table class="w-full text-left text-xs table-auto border-collapse">
                <thead class="bg-gray-800/50">
                    <tr>
                        <th class="p-2 font-semibold text-gray-400 w-1/3">
                            Descriptor Name (Tag)
                        </th>
                        <th class="p-2 font-semibold text-gray-400">Details</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700/50">
                    ${descriptors.map((desc) => {
                        const tooltipKey = desc.name.replace(/ /g, '_');
                        const tooltipInfo = tsTooltipData[tooltipKey] || {};
                        return html`
                            <tr class="hover:bg-gray-700/50">
                                <td
                                    class="p-2 font-medium text-gray-300 align-top ${tooltipTriggerClasses}"
                                    data-tooltip="${tooltipInfo.text ||
                                    'No description available'}"
                                    data-iso="${tooltipInfo.ref || ''}"
                                >
                                    ${desc.name}
                                    <span class="text-gray-500"
                                        >(0x${desc.tag
                                            .toString(16)
                                            .padStart(2, '0')})</span
                                    >
                                </td>
                                <td class="p-2 font-mono">
                                    <dl
                                        class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1"
                                    >
                                        ${Object.entries(desc.details).map(
                                            ([key, field]) => {
                                                const fieldTooltipKey = `${tooltipKey}@${key}`;
                                                const fieldTooltipInfo =
                                                    tsTooltipData[
                                                        fieldTooltipKey
                                                    ] || {};
                                                return html`
                                                    <dt
                                                        class="text-gray-400 ${fieldTooltipInfo.text
                                                            ? tooltipTriggerClasses
                                                            : ''}"
                                                        data-tooltip="${fieldTooltipInfo.text ||
                                                        ''}"
                                                        data-iso="${fieldTooltipInfo.ref ||
                                                        ''}"
                                                    >
                                                        ${key}:
                                                    </dt>
                                                    <dd
                                                        class="text-white break-all"
                                                    >
                                                        ${field.value}
                                                    </dd>
                                                `;
                                            }
                                        )}
                                    </dl>
                                </td>
                            </tr>
                        `;
                    })}
                </tbody>
            </table>
        </div>
    `;
};

export const tsAnalysisTemplate = (analysis) => {
    const { summary, packets } = analysis.data;
    const pmtPid = [...summary.pmtPids][0];
    const program = pmtPid ? summary.programMap[pmtPid] : null;

    if (summary.errors.length > 0 && summary.errors[0].includes('encrypted')) {
        return html`
            <div
                class="bg-gray-800 p-4 rounded-lg border border-yellow-700 text-center"
            >
                <h4 class="font-bold text-yellow-300 text-lg mb-2">
                    Encrypted Segment
                </h4>
                <p class="text-sm text-yellow-200">
                    This segment appears to be encrypted (e.g., via AES-128).
                    Its internal structure cannot be analyzed without
                    decryption. You can still inspect the raw encrypted bytes in
                    the "View Raw" interactive segment explorer.
                </p>
            </div>
        `;
    }

    const pmtPacket = packets.find((p) => p.pid === pmtPid && p.psi);

    return html`
        <div class="space-y-8">
            <div>
                <h3 class="text-xl font-bold mb-4">Stream Summary</h3>
                <div
                    class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 bg-gray-900 border border-gray-700 rounded p-3"
                >
                    ${dataItem('Total Packets', summary.totalPackets)}
                    ${dataItem('PCR PID', summary.pcrPid || 'N/A')}
                    ${program
                        ? dataItem('Program #', program.programNumber)
                        : ''}
                    ${summary.errors.length > 0
                        ? dataItem('Errors', summary.errors.join(', '))
                        : ''}
                </div>
            </div>

            <div>
                <h3 class="text-xl font-bold mb-4">Semantic Analysis</h3>
                ${semanticResultsTemplate(summary.semanticResults)}
            </div>

            <div>
                <h3 class="text-xl font-bold mb-4">
                    Program Map Table (PMT) Details
                </h3>
                ${pmtPacket
                    ? html`
                          <div
                              class="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-6"
                          >
                              <div
                                  class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3"
                              >
                                  ${dataItem('PMT PID', pmtPid)}
                                  ${dataItem(
                                      'PCR PID',
                                      pmtPacket.psi.pcr_pid.value
                                  )}
                              </div>

                              <div>
                                  <h4
                                      class="text-md font-semibold mb-2 text-gray-300"
                                  >
                                      Program Descriptors
                                  </h4>
                                  ${descriptorTableTemplate(
                                      pmtPacket.psi.program_descriptors
                                  )}
                              </div>

                              <div>
                                  <h4
                                      class="text-md font-semibold mb-2 text-gray-300"
                                  >
                                      Elementary Streams
                                  </h4>
                                  <div class="space-y-4">
                                      ${pmtPacket.psi.streams.map(
                                          (stream) => html`
                                              <div
                                                  class="border border-gray-700 rounded-lg p-3"
                                              >
                                                  <div
                                                      class="flex items-baseline gap-4 font-mono text-sm mb-3"
                                                  >
                                                      <span
                                                          >PID:
                                                          <strong
                                                              class="text-white"
                                                              >${stream
                                                                  .elementary_PID
                                                                  .value}</strong
                                                          ></span
                                                      >
                                                      <span
                                                          >Stream Type:
                                                          <strong
                                                              class="text-white"
                                                              >${stream
                                                                  .stream_type
                                                                  .value}</strong
                                                          ></span
                                                      >
                                                  </div>
                                                  ${descriptorTableTemplate(
                                                      stream.es_descriptors
                                                  )}
                                              </div>
                                          `
                                      )}
                                  </div>
                              </div>
                          </div>
                      `
                    : html`<p class="text-sm text-gray-400">
                          No PMT packet found in this segment.
                      </p>`}
            </div>
        </div>
    `;
};
