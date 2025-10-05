import { html, render } from 'lit-html';
import { useStore } from '../../../../../core/store.js';
import { hexViewTemplate } from '../../../../components/hex-view.js';
import { buildByteMapTs } from './view-model.js';
import { getInspectorState } from '../interaction-logic.js';

let packetCurrentPage = 1;
const PACKETS_PER_PAGE = 50;

export function findPacketByOffset(parsedData, offset) {
    if (!parsedData?.data?.packets) return null;
    let packet = parsedData.data.packets.find((p) => p.offset === offset);
    if (packet) return packet;
    return parsedData.data.packets.find((p) => p.offset >= offset) || null;
}
const groupPackets = (packets) => { /* Unchanged */ };
const inspectorDetailRow = (packet, key, value) => { /* Unchanged */ };
const placeholderTemplate = () => { /* Unchanged */ };

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
const summaryTemplate = (summary) => { /* Unchanged */ };
const packetListTemplate = (packets, onPageChange) => { /* Unchanged */ };

export function getInteractiveTsTemplate(
    currentPage,
    bytesPerPage,
    onHexPageChange,
    allTooltips
) {
    const { activeSegmentUrl, segmentCache } = useStore.getState();
    const cachedSegment = segmentCache.get(activeSegmentUrl);
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
        // ... (implementation is unchanged)
    };

    return html`
        <div
            class="grid grid-cols-1 lg:grid-cols-[minmax(400px,35%)_1fr] gap-6"
        >
            <div class="sticky top-4 h-max flex flex-col gap-4">
                <div
                    class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-[24rem] overflow-hidden flex flex-col"
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
                    allTooltips
                )}
            </div>
        </div>
    `;
}