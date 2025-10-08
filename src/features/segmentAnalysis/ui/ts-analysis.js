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

const descriptorTableTemplate = (descriptors) => {
    if (!descriptors || descriptors.length === 0) {
        return html`<p class="text-xs text-gray-500 italic px-2">
            No descriptors present.
        </p>`;
    }
    return html`
        <table class="w-full text-left text-xs bg-gray-900/50 rounded-md my-2">
            <thead>
                <tr>
                    <th class="p-2 font-semibold text-gray-400 w-1/4">
                        Descriptor Name (Tag)
                    </th>
                    <th class="p-2 font-semibold text-gray-400">Details</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50">
                ${descriptors.map(
                    (desc) => html`
                        <tr>
                            <td
                                class="p-2 font-medium text-gray-300 align-top ${tooltipTriggerClasses}"
                                data-tooltip="${tsTooltipData[desc.name]
                                    ?.text || 'No description available'}"
                                data-iso="${tsTooltipData[desc.name]?.ref ||
                                ''}"
                            >
                                ${desc.name}
                                <span class="text-gray-500"
                                    >(0x${desc.tag.toString(16)})</span
                                >
                            </td>
                            <td class="p-2 font-mono">
                                <dl class="grid grid-cols-[auto_1fr] gap-x-2">
                                    ${Object.entries(desc.details).map(
                                        ([key, field]) => html`
                                            <dt class="text-gray-400">
                                                ${key}:
                                            </dt>
                                            <dd class="text-white break-all">
                                                ${field.value}
                                            </dd>
                                        `
                                    )}
                                </dl>
                            </td>
                        </tr>
                    `
                )}
            </tbody>
        </table>
    `;
};

export const tsAnalysisTemplate = (analysis) => {
    const { summary, packets } = analysis.data;
    const pmtPid = [...summary.pmtPids][0];
    const program = pmtPid ? summary.programMap[pmtPid] : null;

    // Calculate PID counts for the new table

    const pmtPacket = packets.find((p) => p.pid === pmtPid && p.psi);

    return html`
        <div
            class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 bg-gray-900 border border-gray-700 rounded p-3 mb-6"
        >
            ${dataItem('Total Packets', summary.totalPackets)}
            ${dataItem('PCR PID', summary.pcrPid || 'N/A')}
            ${program ? dataItem('Program #', program.programNumber) : ''}
            ${summary.errors.length > 0
                ? dataItem('Errors', summary.errors.join(', '))
                : ''}
        </div>

        <h3 class="text-xl font-bold mb-4">Program Map Table (PMT) Details</h3>
        ${pmtPacket
            ? html`
                  <div
                      class="bg-gray-800 p-4 rounded-lg border border-gray-700"
                  >
                      <div
                          class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 mb-4"
                      >
                          ${dataItem('PMT PID', pmtPid)}
                          ${dataItem('PCR PID', pmtPacket.psi.pcr_pid.value)}
                      </div>

                      <h4 class="text-md font-semibold mb-2 text-gray-300">
                          Program Descriptors
                      </h4>
                      ${descriptorTableTemplate(
                          pmtPacket.psi.program_descriptors
                      )}

                      <h4 class="text-md font-semibold mb-2 mt-4 text-gray-300">
                          Elementary Streams
                      </h4>
                      <div class="space-y-4">
                          ${pmtPacket.psi.streams.map(
                              (stream) => html`
                                  <div
                                      class="border border-gray-700 rounded-lg p-3"
                                  >
                                      <div
                                          class="flex items-baseline gap-4 font-mono text-sm"
                                      >
                                          <span
                                              >PID:
                                              <strong class="text-white"
                                                  >${stream.elementary_PID
                                                      .value}</strong
                                              ></span
                                          >
                                          <span
                                              >Stream Type:
                                              <strong class="text-white"
                                                  >${stream.stream_type
                                                      .value}</strong
                                              ></span
                                          >
                                      </div>
                                      <div class="mt-2">
                                          ${descriptorTableTemplate(
                                              stream.es_descriptors
                                          )}
                                      </div>
                                  </div>
                              `
                          )}
                      </div>
                  </div>
              `
            : html`<p class="text-sm text-gray-400">
                  No PMT packet found in this segment.
              </p>`}
    `;
};
