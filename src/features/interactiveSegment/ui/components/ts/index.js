import { html, render } from 'lit-html';
import { getInspectorState } from '../interaction-logic.js';
import { getTooltipData as getTsTooltipData } from '@/infrastructure/parsing/ts/index';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

let packetCurrentPage = 1;
const PACKETS_PER_PAGE = 50;
const allTsTooltipData = getTsTooltipData();

export function findPacketByOffset(parsedData, offset) {
    if (!parsedData?.data?.packets) return null;
    let packet = parsedData.data.packets.find((p) => p.offset === offset);
    if (packet) return packet;
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
    const { itemForDisplay, fieldForDisplay } = getInspectorState();
    const highlightClass =
        fieldForDisplay === key && itemForDisplay?.offset === packet.offset
            ? 'is-inspector-field-highlighted'
            : '';
    
    const tooltipKey = key.replace('.', '@');
    const tooltipInfo = allTsTooltipData[tooltipKey] || {};

    const renderValue = (val) => {
        if (typeof val === 'object' && val !== null) {
            return html`
                <dl>
                    ${Object.entries(val).map(
                        ([subKey, subValue]) => html`
                            <dt class="text-gray-500 pl-2">${subKey}</dt>
                            <dd class="text-white pl-4">${subValue.value}</dd>
                        `
                    )}
                </dl>
            `;
        }
        return String(val);
    };

    return html`
        <tr
            class=${highlightClass}
            data-field-name="${key}"
            data-inspector-offset="${packet.offset}"
        >
            <td 
                class="p-1 pr-2 text-xs text-gray-400 align-top ${tooltipInfo.text ? tooltipTriggerClasses : ''}"
                data-tooltip="${tooltipInfo.text || ''}"
                data-iso="${tooltipInfo.ref || ''}"
            >
                ${key}
            </td>
            <td class="p-1 text-xs font-mono text-white break-all">
                ${renderValue(value)}
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

const encryptedContentTemplate = (error) => html`
    <div
        class="p-3 text-sm text-yellow-200 bg-yellow-900/30 h-full flex flex-col justify-center items-center text-center"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8 text-yellow-400 mb-2"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                fill-rule="evenodd"
                d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                clip-rule="evenodd"
            />
        </svg>
        <h4 class="font-bold text-yellow-300">Encrypted Segment</h4>
        <p class="mt-1">${error}</p>
        <p class="mt-2 text-xs text-gray-400">
            Structural analysis is not possible, but you can still inspect the
            raw encrypted bytes in the hex view.
        </p>
    </div>
`;

export const inspectorPanelTemplate = (tsAnalysisData) => {
    const { summary } = tsAnalysisData.data;
    const encryptionError = summary.errors.find((e) => e.includes('encrypted'));
    if (encryptionError) {
        return encryptedContentTemplate(encryptionError);
    }

    const { itemForDisplay } = getInspectorState();
    const packet = itemForDisplay;

    if (!packet) return placeholderTemplate();

    const renderDetailRowsFor = (prefix, dataObject) => {
        if (!dataObject) return html``;
        return html`
            ${Object.entries(dataObject).map(([key, value]) => {
                if (typeof value.value === 'object' && value.value !== null) {
                    return Object.entries(value.value).map(
                        ([subKey, subValue]) =>
                            inspectorDetailRow(
                                packet,
                                `${prefix}.${key}.${subKey}`,
                                subValue.value
                            )
                    );
                }
                return inspectorDetailRow(
                    packet,
                    `${prefix}.${key}`,
                    value.value
                );
            })}
        `;
    };

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
                    ${renderDetailRowsFor('Header', packet.header)}
                    ${renderDetailRowsFor('AF', packet.adaptationField)}
                    ${renderDetailRowsFor('PES', packet.pes)}
                </tbody>
            </table>
        </div>
    `;
};

export const structureContentTemplate = (tsAnalysisData) => {
    const { summary, packets } = tsAnalysisData.data;

    const encryptionError = summary.errors.find((e) => e.includes('encrypted'));
    if (encryptionError) {
        return encryptedContentTemplate(encryptionError);
    }

    const onPacketPageChange = (offset) => {
        const totalPages = Math.ceil(packets.length / PACKETS_PER_PAGE);
        const newPage = packetCurrentPage + offset;
        if (newPage >= 1 && newPage <= totalPages) {
            packetCurrentPage = newPage;
            // Re-render the structure content area
            const container = /** @type {HTMLElement | null} */ (
                document.querySelector('.structure-content-area')
            );
            if (container) {
                render(structureContentTemplate(tsAnalysisData), container);
            }
        }
    };

    const totalPages = Math.ceil(packets.length / PACKETS_PER_PAGE);
    const startIndex = (packetCurrentPage - 1) * PACKETS_PER_PAGE;
    const endIndex = startIndex + PACKETS_PER_PAGE;
    const visiblePackets = packets.slice(startIndex, endIndex);

    if (packets.length === 0) {
        return html`<div class="p-3 text-sm text-gray-500">
            No TS packets were parsed from this segment.
        </div>`;
    }

    return html`
        <div
            class="structure-content-area rounded-md bg-gray-900/90 border border-gray-700 flex flex-col h-full"
        >
            <h3 class="font-bold text-base p-2 border-b border-gray-700">
                Packet List
            </h3>
            <div class="overflow-y-auto text-xs grow">
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
                                            class="flex justify-between p-2 border-b border-gray-800"
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
                      class="text-center p-1 border-t border-gray-700 shrink-0"
                  >
                      <button
                          @click=${() => onPacketPageChange(-1)}
                          ?disabled=${packetCurrentPage === 1}
                      >
                          &lt;
                      </button>
                      Page ${packetCurrentPage} of ${totalPages}
                      <button
                          @click=${() => onPacketPageChange(1)}
                          ?disabled=${packetCurrentPage === totalPages}
                      >
                          &gt;
                      </button>
                  </div>`
                : ''}
        </div>
    `;
};