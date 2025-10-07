import { html, render } from 'lit-html';
import { useStore, useSegmentCacheStore } from '../../../../../app/store.js';
import { hexViewTemplate } from '../../../../components/hex-view.js';
import { buildByteMapTs } from './view-model.js';
import { getInspectorState } from '../interaction-logic.js';

let packetCurrentPage = 1;
const PACKETS_PER_PAGE = 50;

export function findPacketByOffset(parsedData, offset) {
    if (!parsedData?.data?.packets) return null;
    let packet = parsedData.data.packets.find((p) => p.offset === offset);
    if (packet) return packet;
    // Fallback for clicking inside a packet
    return (
        parsedData.data.packets.find(
            (p) => offset > p.offset && offset < p.offset + 188
        ) || null
    );
}

const groupPackets = (packets) => {
    return packets.reduce((acc, packet) => {
        const type = packet.payloadType || 'Unknown';
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(packet);
        return acc;
    }, {});
};

const inspectorDetailRow = (packet, key, value) => {
    return html`
        <tr
            class="hover:bg-purple-900/50"
            data-field-name="${key}"
            data-packet-offset="${packet.offset}"
        >
            <td class="p-1 pr-2 text-xs text-gray-400 align-top">${key}</td>
            <td class="p-1 text-xs font-mono text-white break-all">
                ${String(value)}
            </td>
        </tr>
    `;
};

const placeholderTemplate = () => {
    return html`
        <div class="p-3 text-sm text-gray-500">
            Hover over an item in the packet list or hex view to see details.
        </div>
    `;
};

export const inspectorPanelTemplate = () => {
    const { itemForDisplay } = getInspectorState();
    const packet = itemForDisplay;

    if (!packet) return placeholderTemplate();

    return html`
        <div class="p-3 border-b border-gray-700">
            <div class="font-bold text-base mb-1">
                Packet @${packet.offset} (PID: ${packet.pid})
            </div>
            <p class="text-xs text-gray-300">${packet.payloadType}</p>
        </div>
        <div class="overflow-y-auto">
            <table class="w-full table-fixed">
                <colgroup>
                    <col class="w-2/5" />
                    <col class="w-3/5" />
                </colgroup>
                <tbody>
                    ${Object.entries(packet.header).map(([key, value]) =>
                        inspectorDetailRow(
                            packet,
                            `Header: ${key}`,
                            value.value
                        )
                    )}
                    ${packet.adaptationField
                        ? Object.entries(packet.adaptationField)
                              .map(([key, value]) => {
                                  if (
                                      typeof value.value === 'object' &&
                                      value.value !== null
                                  ) {
                                      return Object.entries(value.value).map(
                                          ([subKey, subValue]) =>
                                              inspectorDetailRow(
                                                  packet,
                                                  `AF.${key}.${subKey}`,
                                                  subValue.value
                                              )
                                      );
                                  }
                                  return inspectorDetailRow(
                                      packet,
                                      `AF: ${key}`,
                                      value.value
                                  );
                              })
                              .flat()
                        : ''}
                    ${packet.pes
                        ? Object.entries(packet.pes).map(([key, value]) =>
                              inspectorDetailRow(
                                  packet,
                                  `PES: ${key}`,
                                  value.value
                              )
                          )
                        : ''}
                </tbody>
            </table>
        </div>
    `;
};

const summaryTemplate = (summary) => {
    const pmtPid = [...summary.pmtPids][0];
    const program = pmtPid ? summary.programMap[pmtPid] : null;
    const pidTypes = {};
    if (program) {
        Object.assign(pidTypes, program.streams);
        if (summary.pcrPid) {
            pidTypes[summary.pcrPid] = `${
                pidTypes[summary.pcrPid] || 'Unknown'
            } (PCR)`;
        }
    }
    pidTypes[0] = 'PAT';
    summary.pmtPids.forEach((pid) => (pidTypes[pid] = 'PMT'));

    return html`
        <div
            class="rounded-md bg-gray-900/90 border border-gray-700"
            data-testid="ts-summary-panel"
        >
            <h3 class="font-bold text-base p-2 border-b border-gray-700">
                Transport Stream Summary
            </h3>
            <div class="p-2 text-xs space-y-2">
                <div>Total Packets: ${summary.totalPackets}</div>
                <div>PCR PID: ${summary.pcrPid || 'N/A'}</div>
                <div>Program #: ${program?.programNumber || 'N/A'}</div>
                ${summary.errors.length > 0
                    ? html`<div class="text-red-400">
                          Errors: ${summary.errors.join(', ')}
                      </div>`
                    : ''}
            </div>
        </div>
    `;
};

const packetListTemplate = (packets, onPageChange) => {
    const totalPages = Math.ceil(packets.length / PACKETS_PER_PAGE);
    const startIndex = (packetCurrentPage - 1) * PACKETS_PER_PAGE;
    const endIndex = startIndex + PACKETS_PER_PAGE;
    const visiblePackets = packets.slice(startIndex, endIndex);

    return html`
        <div
            class="packet-list-area rounded-md bg-gray-900/90 border border-gray-700 flex flex-col"
        >
            <h3 class="font-bold text-base p-2 border-b border-gray-700">
                Packet List
            </h3>
            <div class="overflow-y-auto max-h-96 text-xs flex-grow">
                ${Object.entries(groupPackets(visiblePackets)).map(
                    ([type, pkts]) => html`
                        <details open>
                            <summary
                                class="p-2 font-semibold bg-gray-800/50 sticky top-0 cursor-pointer"
                            >
                                ${type} (${pkts.length})
                            </summary>
                            <ul class="list-none p-0">
                                ${pkts.map(
                                    (p) => html`
                                        <li
                                            class="flex justify-between p-2 border-b border-gray-800 hover:bg-slate-700"
                                            data-packet-offset=${p.offset}
                                        >
                                            <span class="font-mono"
                                                >@${p.offset}</span
                                            >
                                            <span class="font-mono"
                                                >PID: ${p.pid}</span
                                            >
                                        </li>
                                    `
                                )}
                            </ul>
                        </details>
                    `
                )}
            </div>
            ${totalPages > 1
                ? html`<div
                      class="text-center p-1 border-t border-gray-700 flex-shrink-0"
                  >
                      <button
                          @click=${() => onPageChange(-1)}
                          ?disabled=${packetCurrentPage === 1}
                      >
                          &lt;
                      </button>
                      Page ${packetCurrentPage} of ${totalPages}
                      <button
                          @click=${() => onPageChange(1)}
                          ?disabled=${packetCurrentPage === totalPages}
                      >
                          &gt;
                      </button>
                  </div>`
                : ''}
        </div>
    `;
};

export function getInteractiveTsTemplate(
    currentPage,
    bytesPerPage,
    onHexPageChange,
    allTooltips,
    inspectorState
) {
    const { activeSegmentUrl } = useStore.getState();
    const { get: getFromCache } = useSegmentCacheStore.getState();
    const cachedSegment = getFromCache(activeSegmentUrl);
    const tsAnalysisData =
        cachedSegment?.parsedData && cachedSegment.parsedData.format === 'ts'
            ? cachedSegment.parsedData
            : null;

    if (!tsAnalysisData || !tsAnalysisData.data) {
        return html`<div class="text-yellow-400 p-4">
            Could not parse Transport Stream data for this segment.
        </div>`;
    }

    tsAnalysisData.byteMap = buildByteMapTs(tsAnalysisData);

    const onPacketPageChange = (offset) => {
        const totalPages = Math.ceil(
            tsAnalysisData.data.packets.length / PACKETS_PER_PAGE
        );
        const newPage = packetCurrentPage + offset;
        if (newPage >= 1 && newPage <= totalPages) {
            packetCurrentPage = newPage;
            // Re-render the container
            const container = document.getElementById(
                'tab-interactive-segment'
            );
            if (container) {
                render(
                    getInteractiveTsTemplate(
                        currentPage,
                        bytesPerPage,
                        onHexPageChange,
                        allTooltips,
                        inspectorState
                    ),
                    container
                );
            }
        }
    };

    return html`
        <div
            class="grid grid-cols-1 lg:grid-cols-[minmax(400px,35%)_1fr] gap-6"
        >
            <div class="sticky top-4 h-max flex flex-col gap-4">
                <div
                    class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-96 lg:h-[24rem] overflow-hidden flex flex-col"
                >
                    ${inspectorPanelTemplate()}
                </div>
                ${summaryTemplate(tsAnalysisData.data.summary)}
                ${packetListTemplate(
                    tsAnalysisData.data.packets,
                    onPacketPageChange
                )}
            </div>
            <div>
                ${hexViewTemplate(
                    cachedSegment.data,
                    tsAnalysisData.byteMap,
                    currentPage,
                    bytesPerPage,
                    onHexPageChange,
                    allTooltips,
                    inspectorState
                )}
            </div>
        </div>
    `;
}