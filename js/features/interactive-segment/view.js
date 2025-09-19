import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { analysisState, dom } from '../../state.js';

// --- STATE & CONFIG ---
let currentPage = 1;
const BYTES_PER_PAGE = 1024; // 1KB per page
const boxColors = [
    'bg-red-500/20', 'bg-yellow-500/20', 'bg-green-500/20',
    'bg-blue-500/20', 'bg-indigo-500/20', 'bg-purple-500/20', 'bg-pink-500/20',
];

/**
 * Creates a lookup map for byte offsets to their box/field metadata.
 * @param {import('../segment-analysis/isobmff-parser.js').Box[]} parsedData
 * @returns {Map<number, {box: object, field: string, color: string}>}
 */
function buildByteMap(parsedData) {
    const byteMap = new Map();
    let colorIndex = 0;

    const traverse = (boxes) => {
        for (const box of boxes) {
            const color = boxColors[colorIndex % boxColors.length];
            // Map the header
            for (let i = box.offset; i < box.contentOffset; i++) {
                byteMap.set(i, { box, field: 'Header', color });
            }
            // Map the detailed fields
            for (const [fieldName, fieldMeta] of Object.entries(box.details)) {
                for (let i = fieldMeta.offset; i < fieldMeta.offset + fieldMeta.length; i++) {
                    byteMap.set(i, { box, field: fieldName, color });
                }
            }
            colorIndex++;
            if (box.children.length > 0) {
                traverse(box.children);
            }
        }
    };
    traverse(parsedData);
    return byteMap;
}

/**
 * Generates a view model for a hex/ASCII view from a slice of an ArrayBuffer.
 * @param {ArrayBuffer} buffer
 * @param {Map<number, object>} byteMap
 * @returns {object[]}
 */
function generateHexAsciiView(buffer, byteMap) {
    const rows = [];
    const view = new Uint8Array(buffer);
    const bytesPerRow = 16;
    const startByte = (currentPage - 1) * BYTES_PER_PAGE;
    const endByte = Math.min(startByte + BYTES_PER_PAGE, buffer.byteLength);

    for (let i = startByte; i < endByte; i += bytesPerRow) {
        const rowBytes = view.slice(i, i + bytesPerRow);
        const offset = i.toString(16).padStart(8, '0').toUpperCase();
        const hexParts = [];
        const asciiParts = [];

        rowBytes.forEach((byte, index) => {
            const byteOffset = i + index;
            const mapEntry = byteMap.get(byteOffset);
            let tooltipContent = `<strong>Offset:</strong> 0x${byteOffset.toString(16).toUpperCase()}<br><strong>Dec:</strong> ${byte}`;
            let cssClass = 'cursor-help px-1 -mx-1';

            if (mapEntry) {
                tooltipContent += `<hr class="my-1 border-gray-500"><strong>Box:</strong> ${mapEntry.box.type}<br><strong>Field:</strong> ${mapEntry.field}`;
                cssClass += ` ${mapEntry.color} hover:ring-1 ring-white/50`;
            }

            const hexByte = byte.toString(16).padStart(2, '0').toUpperCase();
            hexParts.push(`<span class="${cssClass}" data-tooltip="${tooltipContent}">${hexByte}</span>`);

            const asciiChar = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
            asciiParts.push(`<span class="${cssClass}" data-tooltip="${tooltipContent}">${asciiChar}</span>`);
        });

        rows.push({
            offset,
            hex: hexParts.join(' '),
            ascii: asciiParts.join(''),
        });
    }
    return rows;
}

const hexViewTemplate = (buffer, parsedData) => {
    const totalPages = Math.ceil(buffer.byteLength / BYTES_PER_PAGE);
    const byteMap = buildByteMap(parsedData);
    const viewModel = generateHexAsciiView(buffer, byteMap);

    const changePage = (offset) => {
        const newPage = currentPage + offset;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            render(getInteractiveSegmentTemplate(), dom.tabContents['interactive-segment']);
        }
    };

    return html`
        <div class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto">
            <div class="flex sticky top-0 bg-slate-800 pb-2 mb-2 border-b border-gray-600">
                <div class="w-32 flex-shrink-0 text-gray-400 font-semibold">Offset (h)</div>
                <div class="flex-grow text-gray-400 font-semibold" style="max-width: 50ch;">Hexadecimal</div>
                <div class="w-48 flex-shrink-0 text-gray-400 font-semibold">ASCII</div>
            </div>
            ${viewModel.map(row => html`
                <div class="flex items-center h-6">
                    <div class="w-32 flex-shrink-0 text-gray-500">${row.offset}</div>
                    <div class="flex-grow" style="max-width: 50ch;">${unsafeHTML(row.hex)}</div>
                    <div class="w-48 flex-shrink-0 text-cyan-400">${unsafeHTML(row.ascii)}</div>
                </div>
            `)}
        </div>
        <div class="flex justify-center items-center mt-4 space-x-4">
            <button @click=${() => changePage(-1)} ?disabled=${currentPage === 1} class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">&lt; Previous</button>
            <span class="text-gray-400 font-semibold">Page ${currentPage} of ${totalPages}</span>
            <button @click=${() => changePage(1)} ?disabled=${currentPage === totalPages} class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">Next &gt;</button>
        </div>
    `;
};

export function getInteractiveSegmentTemplate() {
    const { activeSegmentUrl, segmentCache } = analysisState;

    if (!activeSegmentUrl) {
        currentPage = 1;
        return html`<p class="info text-center">Select a segment from the "Segment Explorer" tab and click "View Raw" to inspect its content here.</p>`;
    }

    const cachedSegment = segmentCache.get(activeSegmentUrl);

    if (!cachedSegment || cachedSegment.status === -1) {
        return html`<p class="info text-center">Loading and parsing segment data...</p>`;
    }

    if (cachedSegment.status !== 200 || !cachedSegment.data) {
        return html`<p class="fail text-center">Failed to fetch segment. Status: ${cachedSegment.status || 'Network Error'}.</p>`;
    }

    if (!cachedSegment.parsedData || cachedSegment.parsedData.error) {
        return html`<p class="warn text-center">Segment is not a recognized ISOBMFF format or failed to parse.</p>`;
    }

    return html`
        <h3 class="text-xl font-bold mb-2">Interactive Segment View</h3>
        <p class="text-sm text-gray-400 mb-4 font-mono break-all">${activeSegmentUrl}</p>
        ${hexViewTemplate(cachedSegment.data, cachedSegment.parsedData)}
    `;
}