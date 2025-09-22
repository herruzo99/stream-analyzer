import { html, render } from 'lit-html';
import { analysisState, dom } from '../../core/state.js';
import { hexViewTemplate } from './hex-view.js';

// --- STATE & CONFIG ---
let packetCurrentPage = 1;
let hexCurrentPage = 1;
const PACKETS_PER_PAGE = 50;
const HEX_BYTES_PER_PAGE = 1024; // 1KB per page
let tsAnalysisData = null;
let selectedPacketOffset = null;
let keydownListener = null;

// --- UTILITIES ---
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
        if (packet.payloadType === currentGroup.type && packet.pid === currentGroup.pid) {
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


// --- INTERACTIVITY ---
function applySelectionHighlight() {
    const container = dom.tabContents['interactive-segment'];
    container.querySelectorAll('.is-highlighted').forEach(el => el.classList.remove('is-highlighted'));
    if (selectedPacketOffset !== null) {
        container.querySelectorAll(`[data-packet-offset="${selectedPacketOffset}"]`).forEach(el => {
            el.classList.add('is-highlighted');
        });
         container.querySelectorAll(`[data-group-start-offset="${selectedPacketOffset}"]`).forEach(el => {
            el.classList.add('is-highlighted');
        });
    }
}

function updateInspectorPanel(packet) {
    const container = dom.tabContents['interactive-segment'];
    const inspector = container.querySelector('.segment-inspector-panel');
    if (!inspector) return;
    if (packet) {
        render(inspectorPanelTemplate(packet), inspector);
        inspector.classList.remove('opacity-0');
    } else {
        render(html``, inspector);
        inspector.classList.add('opacity-0');
    }
}

function handlePacketListClick(e) {
    const targetNode = e.target.closest('[data-group-start-offset]');
    if (!targetNode) return;
    
    // Select the first packet of the group
    const targetOffset = parseInt(targetNode.dataset.groupStartOffset);

    if (selectedPacketOffset === targetOffset) {
        selectedPacketOffset = null; // Toggle off
    } else {
        selectedPacketOffset = targetOffset; // Select new
    }
    applySelectionHighlight();
    const packet = tsAnalysisData.packets.find(p => p.offset === selectedPacketOffset);
    updateInspectorPanel(packet);

    if (packet) {
        // Jump hex view to the correct page for the selected packet
        const newHexPage = Math.floor(packet.offset / HEX_BYTES_PER_PAGE) + 1;
        if (newHexPage !== hexCurrentPage) {
            hexCurrentPage = newHexPage;
            // Re-render the whole view to update the hex pager
            render(getInteractiveTsTemplate(), dom.tabContents['interactive-segment']);
        }

        // Scroll the hex view row into view
        setTimeout(() => {
            const container = dom.tabContents['interactive-segment'];
            const hexView = container.querySelector('.hex-viewer-area');
            const rowEl = hexView?.querySelector(`[data-row-offset="${Math.floor(packet.offset / 16) * 16}"]`);
            rowEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 0);
    }
}

function initializeInteractivity() {
    const container = dom.tabContents['interactive-segment'];
    if (keydownListener) document.removeEventListener('keydown', keydownListener);
    keydownListener = (e) => {
        if (e.key === 'Escape' && selectedPacketOffset !== null) {
            selectedPacketOffset = null;
            applySelectionHighlight();
            updateInspectorPanel(null);
        }
    };
    document.addEventListener('keydown', keydownListener);
    container.addEventListener('click', handlePacketListClick);
}

// --- TEMPLATES ---
const inspectorDetailRow = (label, value) => {
    if (value === null || value === undefined) return '';
    return html`<tr><td class="p-1 pr-2 text-xs text-gray-400 align-top">${label}</td><td class="p-1 text-xs font-mono text-white break-all">${String(value)}</td></tr>`;
};

const inspectorPanelTemplate = (packet) => html`
    <div class="p-3 border-b border-gray-700">
        <div class="font-bold text-base mb-1">Packet @${packet.offset} (PID: ${packet.pid})</div>
        <p class="text-xs text-gray-300">${packet.payloadType}</p>
    </div>
    <div class="overflow-y-auto"><table class="w-full table-fixed">
        <colgroup><col class="w-1/2" /><col class="w-1/2" /></colgroup>
        <tbody>
            ${Object.entries(packet.header).map(([key, value]) => inspectorDetailRow(`Header: ${key}`, value.value))}
            ${packet.adaptationField ? Object.entries(packet.adaptationField).map(([key, value]) => {
                // Don't render complex objects directly
                if (typeof value.value === 'object' && value.value !== null) {
                    return Object.entries(value.value).map(([subKey, subValue]) => inspectorDetailRow(`AF.${key}.${subKey}`, subValue.value));
                }
                return inspectorDetailRow(`AF: ${key}`, value.value);
            }).flat() : ''}
            ${packet.pes ? Object.entries(packet.pes).map(([key, value]) => inspectorDetailRow(`PES: ${key}`, value.value)) : ''}
        </tbody>
    </table></div>
`;

const summaryTemplate = (summary) => {
    if (!summary || !summary.programMap) {
        return html`<p class="text-xs text-gray-400 p-2">No program summary available for this segment.</p>`;
    }
    const pmtPid = Object.keys(summary.programMap)[0];
    const program = pmtPid ? summary.programMap[pmtPid] : null;

    return html`<details class="mb-4" open><summary class="font-semibold text-gray-300 cursor-pointer">Stream Summary</summary>
        <div class="bg-gray-900 border border-gray-700 rounded p-3 mt-2 text-xs">
            ${inspectorDetailRow('Total Packets', summary.totalPackets)}
            ${inspectorDetailRow('PCR PID', summary.pcrPid)}
            ${program ? inspectorDetailRow('Program #', program.programNumber) : ''}
            <h5 class="font-semibold text-gray-400 mt-3 mb-1">
                Elementary Streams:
            </h5>
            ${program ? html`<table class="w-full text-left"><tbody>
                ${Object.entries(program.streams).map(([pid, type]) => html`<tr><td class="p-1 font-mono">${pid}</td><td class="p-1">${type}</td></tr>`)}
            </tbody></table>` : 'PMT not found or parsed.'}
        </div>
    </details>`;
};

const packetListTemplate = (packets, onPageChange) => {
    const packetGroups = groupPackets(packets);
    const totalPages = Math.ceil(packetGroups.length / PACKETS_PER_PAGE);
    const start = (packetCurrentPage - 1) * PACKETS_PER_PAGE;
    const end = start + PACKETS_PER_PAGE;
    const paginatedGroups = packetGroups.slice(start, end);

    return html`
        <h4 class="text-base font-bold text-gray-300 mb-2">Packet Groups</h4>
        <div class="bg-gray-900/50 p-2 rounded max-h-[calc(100vh-30rem)] overflow-y-auto">
            ${paginatedGroups.map(g => html`
                <div class="text-xs p-1 rounded hover:bg-gray-700/50 flex items-center gap-2 cursor-pointer border-l-4 border-transparent"
                     data-group-start-offset="${g.startOffset}">
                    <strong class="font-mono w-48 flex-shrink-0">Packets @${g.startOffset} (x${g.count})</strong>
                    <span class="text-gray-400 truncate">PID ${g.pid}: ${g.type}</span>
                </div>`)}
        </div>
        ${totalPages > 1 ? html`<div class="text-center text-sm text-gray-500 mt-2">
            <button @click=${() => onPageChange(-1)} ?disabled=${packetCurrentPage === 1} class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1">&lt;</button>
            Page ${packetCurrentPage} of ${totalPages}
            <button @click=${() => onPageChange(1)} ?disabled=${packetCurrentPage === totalPages} class="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50 mx-1">&gt;</button>
        </div>` : ''}`;
};

export function getInteractiveTsTemplate() {
    const { activeSegmentUrl, segmentCache } = analysisState;
    const cachedSegment = segmentCache.get(activeSegmentUrl);
    tsAnalysisData = cachedSegment?.parsedData?.data;
    const container = dom.tabContents['interactive-segment'];

    setTimeout(() => initializeInteractivity(), 0);

    const onHexPageChange = (offset) => {
        const totalPages = Math.ceil(cachedSegment.data.byteLength / HEX_BYTES_PER_PAGE);
        const newPage = hexCurrentPage + offset;
        if (newPage >= 1 && newPage <= totalPages) {
            hexCurrentPage = newPage;
            render(getInteractiveTsTemplate(), dom.tabContents['interactive-segment']);
        }
    };

    const onPacketPageChange = (offset) => {
        const totalPages = Math.ceil(groupPackets(tsAnalysisData.packets).length / PACKETS_PER_PAGE);
        const newPage = packetCurrentPage + offset;
        if (newPage >= 1 && newPage <= totalPages) {
            packetCurrentPage = newPage;
            render(getInteractiveTsTemplate(), container);
        }
    };
    
    return html`
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(400px,35%)_1fr] gap-6">
            <div class="sticky top-4 h-max flex flex-col gap-4">
                 <div class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-64 overflow-hidden flex flex-col"></div>
                ${tsAnalysisData ? html`
                    ${summaryTemplate(tsAnalysisData.summary)}
                    ${packetListTemplate(tsAnalysisData.packets, onPacketPageChange)}
                ` : html`<p class="text-yellow-400">Could not parse TS data.</p>`}
            </div>
            <div class="overflow-auto">
                ${hexViewTemplate(cachedSegment.data, cachedSegment.parsedData, hexCurrentPage, HEX_BYTES_PER_PAGE, onHexPageChange)}
            </div>
        </div>
    `;
}