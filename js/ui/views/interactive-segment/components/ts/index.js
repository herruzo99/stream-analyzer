import { html, render } from 'lit-html';
import { useStore } from '../../../../../core/store.js';
import { dom } from '../../../../../core/dom.js';
import { hexViewTemplate } from '../../../../components/hex-view.js';
import { buildByteMapTs } from './view-model.js';
import { getTooltipData as getTsTooltipData } from '../../../../../protocols/segment/ts/index.js';

// --- STATE & CONFIG ---
let packetCurrentPage = 1;
const PACKETS_PER_PAGE = 50;

// --- HELPERS ---
export function findPacketByOffset(parsedData, offset) {
    if (!parsedData?.data?.packets) return null;
    // First, try for a direct packet match.
    let packet = parsedData.data.packets.find((p) => p.offset === offset);
    if (packet) return packet;

    // If not found, it might be a group offset. Find the first packet at or after this offset.
    // This assumes offsets are sorted.
    packet = parsedData.data.packets.find((p) => p.offset >= offset);
    return packet || null;
}

function groupPackets(packets) {
    if (!packets || packets.length === 0) return [];
    const groups = [];
    let currentGroup = {
        type: packets[0].payloadType,
        pid: packets[0].pid,
        count: 1,
        startOffset: packets[0].offset,
        packets: [packets[0]],
    };

    for (let i = 1; i < packets.length; i++) {
        const packet = packets[i];
        if (
            packet.payloadType === currentGroup.type &&
            packet.pid === currentGroup.pid
        ) {
            currentGroup.count++;
            currentGroup.packets.push(packet);
        } else {
            groups.push(currentGroup);
            currentGroup = {
                type: packet.payloadType,
                pid: packet.pid,
                count: 1,
                startOffset: packet.offset,
                packets: [packet],
            };
        }
    }
    groups.push(currentGroup);
    return groups;
}

// --- TEMPLATES ---
const inspectorDetailRow = (packet, key, value) => {
    if (value === null || value === undefined) return '';
    return html`<tr data-field-name=${key} data-packet-offset=${packet.offset}>
        <td class="p-1 pr-2 text-xs text-gray-400 align-top">${key}</td>
        <td class="p-1 text-xs font-mono text-white break-all">
            ${String(value)}
        </td>
    </tr>`;
};

const placeholderTemplate = () => html`
    <div
        class="p-4 text-center text-sm text-gray-500 h-full flex flex-col justify-center items-center"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-10 w-10 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
        </svg>
        <p class="font-semibold">Inspector Panel</p>
        <p>
            Select a packet group from the list or hover over the hex view to
            see details here.
        </p>
    </div>
`;

export const inspectorPanelTemplate = (packet, rootData, highlightedField) => {
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
    if (!summary || !summary.programMap) {
        return html`<p class="text-xs text-gray-400 p-2">
            No program summary available for this segment.
        </p>`;
    }
    const pmtPid = Object.keys(summary.programMap)[0];
    const program = pmtPid ? summary.programMap[pmtPid] : null;

    const summaryRow = (label, value) => html`
        <tr>
            <td class="p-1 pr-2 text-xs text-gray-400">${label}</td>
            <td class="p-1 text-xs font-mono text-white">${value}</td>
        </tr>
    `;

    return html`<details class="mb-4" open>
        <summary class="font-semibold text-gray-300 cursor-pointer">
            Stream Summary
        </summary>
        <div
            class="bg-gray-900 border border-gray-700 rounded p-3 mt-2 text-xs"
        >
            <table class="w-full">
                <tbody>
                    ${summaryRow('Total Packets', summary.totalPackets)}
                    ${summaryRow('PCR PID', summary.pcrPid || 'N/A')}
                    ${program
                        ? summaryRow('Program #', program.programNumber)
                        : ''}
                </tbody>
            </table>
            <h5 class="font-semibold text-gray-400 mt-3 mb-1">
                Elementary Streams:
            </h5>
            ${program
                ? html`<table class="w-full text-left">
                      <tbody>
                          ${Object.entries(program.streams).map(
                              ([pid, type]) =>
                                  html`<tr>
                                      <td class="p-1 font-mono">${pid}</td>
                                      <td class="p-1">${type}</td>
                                  </tr>`
                          )}
                      </tbody>
                  </table>`
                : 'PMT not found or parsed.'}
        </div>
    </details>`;
};

const packetListTemplate = (packets, onPageChange) => {
    const packetGroups = groupPackets(packets);
    const totalPages = Math.ceil(packetGroups.length / PACKETS_PER_PAGE);
    const start = (packetCurrentPage - 1) * PACKETS_PER_PAGE;
    const end = start + PACKETS_PER_PAGE;
    const paginatedGroups = packetGroups.slice(start, end);

    return html` <h4 class="text-base font-bold text-gray-300 mb-2">
            Packet Groups
        </h4>
        <div
            class="bg-gray-900/50 p-2 rounded max-h-[calc(100vh-30rem)] overflow-y-auto packet-list-area"
        >
            ${paginatedGroups.map(
                (g) =>
                    html` <div
                        class="text-xs p-1 rounded hover:bg-gray-700/50 flex items-center gap-2 cursor-pointer border-l-4 border-transparent"
                        data-group-start-offset="${g.startOffset}"
                    >
                        <strong class="font-mono w-48 flex-shrink-0"
                            >Packets @${g.startOffset} (x${g.count})</strong
                        >
                        <span class="text-gray-400 truncate"
                            >PID ${g.pid}: ${g.type}</span
                        >
                    </div>`
            )}
        </div>
        ${totalPages > 1
            ? html`<div class="text-center text-sm text-gray-500 mt-2">
                  <button
                      @click=${() => onPageChange(-1)}
                      ?disabled=${packetCurrentPage === 1}
                      class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                  >
                      &lt;
                  </button>
                  Page ${packetCurrentPage} of ${totalPages}
                  <button
                      @click=${() => onPageChange(1)}
                      ?disabled=${packetCurrentPage === totalPages}
                      class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1"
                  >
                      &gt;
                  </button>
              </div>`
            : ''}`;
};

export function getInteractiveTsTemplate(
    currentPage,
    bytesPerPage,
    onHexPageChange,
    allTooltips // New parameter
) {
    const { activeSegmentUrl, segmentCache } = useStore.getState();
    const cachedSegment = segmentCache.get(activeSegmentUrl);
    const tsAnalysisData = cachedSegment?.parsedData;

    if (!tsAnalysisData || !tsAnalysisData.data) {
        return html`<div class="text-yellow-400 p-4">
            Could not parse Transport Stream data for this segment.
        </div>`;
    }

    const byteMap = buildByteMapTs(tsAnalysisData);

    const onPacketPageChange = (offset) => {
        const totalPages = Math.ceil(
            groupPackets(tsAnalysisData.data.packets).length / PACKETS_PER_PAGE
        );
        const newPage = packetCurrentPage + offset;
        if (newPage >= 1 && newPage <= totalPages) {
            packetCurrentPage = newPage;
            render(
                getInteractiveTsTemplate(
                    currentPage,
                    bytesPerPage,
                    onHexPageChange,
                    allTooltips
                ),
                dom.tabContents['interactive-segment']
            );
        }
    };

    return html`
        <div
            class="grid grid-cols-1 lg:grid-cols-[minmax(400px,35%)_1fr] gap-6"
        >
            <div class="sticky top-4 h-max flex flex-col gap-4">
                <div
                    class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-[24rem] overflow-hidden flex flex-col"
                >
                    <!-- Inspector content is rendered here by interaction-logic.js -->
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
                    byteMap,
                    currentPage,
                    bytesPerPage,
                    onHexPageChange,
                    allTooltips // Pass new parameter
                )}
            </div>
        </div>
    `;
}
