import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { analysisState, dom } from '../../state.js';
import { generateHexAsciiView } from './logic.js';
import { getTooltipData } from '../segment-analysis/isobmff-parser.js';

// --- STATE & CONFIG ---
let currentPage = 1;
const BYTES_PER_PAGE = 1024; // 1KB per page
let parsedSegmentData = null; // Cache parsed data for the view
const boxTooltipData = getTooltipData(); // Get all box/field tooltips

// --- INTERACTIVITY & HELPERS ---

/**
 * Finds a box within the parsed structure by its byte offset.
 * @param {object[]} boxes The array of parsed boxes to search.
 * @param {number} offset The byte offset of the box to find.
 * @returns {object | null} The found box object or null.
 */
function findBoxByOffset(boxes, offset) {
    for (const box of boxes) {
        if (box.offset === offset) {
            return box;
        }
        if (box.children && box.children.length > 0) {
            const foundInChild = findBoxByOffset(box.children, offset);
            if (foundInChild) return foundInChild;
        }
    }
    return null;
}

/**
 * Sets up all interactivity for the segment view: tooltips, tree clicks, etc.
 */
function initializeSegmentViewInteractivity() {
    const container = dom.tabContents['interactive-segment'];
    if (!container || !parsedSegmentData) return;

    const tooltip = container.querySelector('.segment-inspector-tooltip');
    const hexView = container.querySelector('.hex-viewer-area');

    container.addEventListener('mousemove', (e) => {
        const target = e.target.closest('[data-box-offset]');
        if (target && tooltip) {
            const boxOffset = parseInt(target.dataset.boxOffset);
            const fieldName = target.dataset.fieldName;
            const box = findBoxByOffset(parsedSegmentData, boxOffset);

            if (box) {
                tooltip.innerHTML = createInspectorTooltipHTML(box, fieldName);
                tooltip.style.display = 'block';
                const containerRect = container.getBoundingClientRect();
                const x = e.clientX - containerRect.left + 20;
                const y = e.clientY - containerRect.top + 20;
                tooltip.style.transform = `translate(${x}px, ${y}px)`;
            }
        } else if (tooltip) {
            tooltip.style.display = 'none';
        }
    });

    container.addEventListener('click', (e) => {
        const treeNode = e.target.closest('[data-tree-offset]');
        const hexNode = e.target.closest('[data-byte-offset]');
        let targetOffset = -1;

        if (treeNode) {
            targetOffset = parseInt(treeNode.dataset.treeOffset);
            // Scroll hex view to the target
            const targetRowOffset = Math.floor(targetOffset / 16) * 16;
            const rowEl = hexView.querySelector(`[data-row-offset="${targetRowOffset}"]`);
            rowEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (hexNode) {
            targetOffset = parseInt(hexNode.dataset.boxOffset);
        }

        // Remove previous highlights
        container.querySelectorAll('.is-highlighted').forEach(el => el.classList.remove('is-highlighted'));

        if (targetOffset > -1) {
            // Add new highlights
            container.querySelectorAll(`[data-tree-offset="${targetOffset}"], [data-box-offset="${targetOffset}"]`).forEach(el => {
                el.classList.add('is-highlighted');
            });
        }
    });
}

/**
 * Creates the HTML for the rich inspector tooltip.
 * @param {object} box The full parsed box object.
 * @param {string} highlightedField The name of the field to highlight.
 * @returns {string} The inner HTML for the tooltip element.
 */
function createInspectorTooltipHTML(box, highlightedField) {
    const boxInfo = boxTooltipData[box.type] || {};
    let fieldsHtml = '<tr><td colspan="2" class="p-1 text-xs text-gray-400">No parsed details.</td></tr>';

    const allFields = { Header: { value: `${box.headerSize} bytes`, ...box }, ...box.details };
    
    if (Object.keys(allFields).length > 0) {
        fieldsHtml = Object.entries(allFields).map(([key, field]) => {
            const isHighlighted = key === highlightedField ? 'bg-blue-500/30' : '';
            const fieldInfo = boxTooltipData[`${box.type}@${key}`] || {};
            return `
                <tr class="${isHighlighted}">
                    <td class="p-1 pr-2 text-xs text-gray-400 align-top" title="${fieldInfo.text || ''}">${key}</td>
                    <td class="p-1 text-xs font-mono text-white break-all">${field.value !== undefined ? field.value : 'N/A'}</td>
                </tr>
            `;
        }).join('');
    }

    return `
        <div class="font-bold text-base mb-1">${box.type} <span class="text-sm text-gray-400">(${box.size} bytes)</span></div>
        <div class="text-xs text-emerald-400 mb-2 font-mono">${boxInfo.ref || ''}</div>
        <p class="text-xs text-gray-300 mb-2">${boxInfo.text || 'No description available.'}</p>
        <table class="w-full">${fieldsHtml}</table>
    `;
}

// --- TEMPLATES ---

const boxTreeTemplate = (boxes) => html`
    <ul class="text-sm font-mono list-none p-0 pl-3">
        ${boxes.map(box => html`
            <li>
                <details open>
                    <summary class="cursor-pointer p-1 rounded hover:bg-gray-700 data-[tree-offset]:bg-blue-900/50" data-tree-offset="${box.offset}">
                        <span class="text-emerald-300">${box.type}</span>
                        <span class="text-gray-500 text-xs">@${box.offset}, ${box.size}b</span>
                    </summary>
                    ${box.children && box.children.length > 0 ? boxTreeTemplate(box.children) : ''}
                </details>
            </li>
        `)}
    </ul>
`;

const hexViewTemplate = (buffer, parsedData) => {
    // ... (pagination logic from your original file, no changes needed here) ...
    const totalPages = Math.ceil(buffer.byteLength / BYTES_PER_PAGE);
    const startOffset = (currentPage - 1) * BYTES_PER_PAGE;
    const viewModel = generateHexAsciiView(buffer, parsedData, startOffset, BYTES_PER_PAGE);

    const changePage = (offset) => {
        const newPage = currentPage + offset;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            render(getInteractiveSegmentTemplate(), dom.tabContents['interactive-segment']);
        }
    };

    return html`
        <div class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto hex-viewer-area">
            <div class="flex sticky top-0 bg-slate-800 pb-2 mb-2 border-b border-gray-600">
                <div class="w-24 flex-shrink-0 text-gray-400 font-semibold">Offset</div>
                <div class="flex-grow text-gray-400 font-semibold">Hexadecimal</div>
                <div class="w-64 flex-shrink-0 text-gray-400 font-semibold pl-4">ASCII</div>
            </div>
            
            ${viewModel.map(row => html`
                <div class="flex items-center hover:bg-slate-700/50" data-row-offset="${parseInt(row.offset, 16)}">
                    <div class="w-24 flex-shrink-0 text-gray-500 font-mono">${row.offset}</div>
                    <div class="flex-grow font-mono">${unsafeHTML(row.hex)}</div>
                    <div class="w-64 flex-shrink-0 text-cyan-400 font-mono tracking-wider pl-4">${unsafeHTML(row.ascii)}</div>
                </div>
            `)}
        </div>
        
        ${totalPages > 1 ? html`
            <div class="text-center text-sm text-gray-500 mt-2">
                Showing bytes ${startOffset} - ${Math.min(startOffset + BYTES_PER_PAGE - 1, buffer.byteLength - 1)}
                of ${buffer.byteLength} (${(buffer.byteLength / 1024).toFixed(2)} KB)
                <button @click=${() => changePage(-1)} ?disabled=${currentPage === 1}>&lt;</button>
                Page ${currentPage} of ${totalPages}
                <button @click=${() => changePage(1)} ?disabled=${currentPage === totalPages}>&gt;</button>
            </div>
        ` : ''}
    `;
};

export function getInteractiveSegmentTemplate() {
    const { activeSegmentUrl, segmentCache } = analysisState;

    if (!activeSegmentUrl) {
        currentPage = 1;
        return html`
            <div class="text-center py-12">
                <div class="text-gray-400 text-lg mb-4">📄 Interactive Segment View</div>
                <p class="text-gray-500">Select a segment from the "Segment Explorer" tab and click "View Raw" to inspect its content here.</p>
            </div>
        `;
    }

    const cachedSegment = segmentCache.get(activeSegmentUrl);

    if (!cachedSegment || cachedSegment.status === -1) {
        return html`
            <div class="text-center py-12">
                <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                <p class="text-gray-400">Loading and parsing segment data...</p>
            </div>
        `;
    }

    if (cachedSegment.status !== 200 || !cachedSegment.data) {
        return html`
            <div class="text-center py-12">
                <div class="text-red-400 text-lg mb-2">❌ Failed to Load</div>
                <p class="text-gray-400">Failed to fetch segment. Status: ${cachedSegment.status || 'Network Error'}.</p>
            </div>
        `;
    }

    // Cache the parsed data at the module level for the interactivity handlers to access
    parsedSegmentData = (cachedSegment.parsedData && !cachedSegment.parsedData.error) ? cachedSegment.parsedData : null;

    // Initialize interactivity after the template is rendered
    setTimeout(() => initializeSegmentViewInteractivity(), 0);

    return html`
        <div class="mb-6">
            <h3 class="text-xl font-bold mb-2 text-white">🔍 Interactive Segment View</h3>
            <p class="text-sm text-gray-400 mb-4 font-mono break-all bg-gray-800 p-2 rounded">${activeSegmentUrl}</p>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-4 relative">
            <div class="bg-gray-800 p-3 rounded-lg max-h-[70vh] overflow-auto">
                <h4 class="font-bold mb-2 sticky top-0 bg-gray-800 pb-2">Box Structure</h4>
                ${parsedSegmentData ? boxTreeTemplate(parsedSegmentData) : html`<p class="text-xs text-gray-500">No ISOBMFF structure found.</p>`}
            </div>
            
            <div class="overflow-auto">
                 ${hexViewTemplate(cachedSegment.data, parsedSegmentData)}
            </div>

            <div class="segment-inspector-tooltip fixed top-0 left-0 z-50 p-3 rounded-md bg-gray-900/90 text-white text-left text-xs leading-relaxed border border-gray-700 min-w-[300px] max-w-md pointer-events-none" style="display: none;">
                </div>
        </div>
    `;
}