import { html, render } from 'lit-html';
import { analysisState, dom } from '../../state.js';
import { dispatchAndRenderSegmentAnalysis } from '../segment-analysis/view.js';
import { getInteractiveSegmentTemplate } from '../interactive-segment/view.js';
import { parseAllSegmentUrls } from './parser.js';
import { parseAllSegmentUrls as parseHlsSegmentUrls } from './hls-parser.js';
import { fetchSegment } from './api.js';
import { showStatus } from '../../ui.js';
import { parseManifest } from '../../protocols/hls/parser.js';

// --- CONSTANTS ---
const SEGMENT_PAGE_SIZE = 10;

// --- MODULE STATE ---
let segmentFreshnessInterval = null;
let allSegmentsByRep = {}; // Cache for DASH segments
let currentContainer = null;
let currentStream = null;

// HLS-specific state for the new tree view
let expandedVariants = new Set();
let hlsSegmentCache = new Map(); // Cache for loaded media playlist segments
let hlsLoadingVariants = new Set(); // Track which variants are currently loading

// --- SHARED EVENT HANDLERS ---
function handleSegmentCheck(e) {
    const checkbox = /** @type {HTMLInputElement} */ (e.target);
    const url = checkbox.value;
    const { segmentsForCompare } = analysisState;

    if (checkbox.checked) {
        if (segmentsForCompare.length >= 2) {
            checkbox.checked = false;
            return;
        }
        if (!segmentsForCompare.includes(url)) {
            segmentsForCompare.push(url);
        }
    } else {
        const index = segmentsForCompare.indexOf(url);
        if (index > -1) {
            segmentsForCompare.splice(index, 1);
        }
    }
    const compareButton = currentContainer.querySelector('#segment-compare-btn');
    if (compareButton) {
        compareButton.textContent = `Compare Selected (${segmentsForCompare.length}/2)`;
        compareButton.toggleAttribute('disabled', segmentsForCompare.length !== 2);
    }
}

function handleCompareClick() {
    const { segmentsForCompare, segmentCache } = analysisState;
    if (segmentsForCompare.length !== 2) return;

    const [urlA, urlB] = segmentsForCompare;
    const segmentA = segmentCache.get(urlA);
    const segmentB = segmentCache.get(urlB);

    if (!segmentA?.data || !segmentB?.data) {
        alert('One or both selected segments have not been fetched successfully.');
        return;
    }

    dom.modalTitle.textContent = 'Segment Comparison';
    dom.modalSegmentUrl.textContent = `Comparing Segment A vs. Segment B`;
    const modalContent = dom.segmentModal.querySelector('div');
    dom.segmentModal.classList.remove('opacity-0', 'invisible');
    dom.segmentModal.classList.add('opacity-100', 'visible');
    modalContent.classList.remove('scale-95');
    modalContent.classList.add('scale-100');

    dispatchAndRenderSegmentAnalysis(null, segmentA.data, segmentB.data);
}

// --- HLS IMPLEMENTATION ---

async function toggleVariant(variantUri) {
    if (expandedVariants.has(variantUri)) {
        expandedVariants.delete(variantUri);
        renderHlsExplorer();
        return;
    }

    expandedVariants.add(variantUri);
    if (!hlsSegmentCache.has(variantUri)) {
        hlsLoadingVariants.add(variantUri);
        renderHlsExplorer(); // Re-render to show loading spinner

        try {
            const response = await fetch(variantUri);
            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
            const rawManifest = await response.text();
            const { manifest } = await parseManifest(rawManifest, variantUri);
            const segments = parseHlsSegmentUrls(manifest.rawElement)['media-playlist'];
            hlsSegmentCache.set(variantUri, segments);
            
            await Promise.all(segments.map(s => fetchSegment(s.resolvedUrl)));

        } catch (err) {
            console.error(`Error loading HLS media playlist ${variantUri}:`, err);
            hlsSegmentCache.set(variantUri, { error: err.message });
        } finally {
            hlsLoadingVariants.delete(variantUri);
            renderHlsExplorer();
        }
    } else {
        renderHlsExplorer();
    }
}

const hlsRowTemplate = (rowData) => {
    const indentClass = `pl-${rowData.level * 6}`;

    switch (rowData.type) {
        case 'master':
            return html`<div class="bg-gray-900/50 p-2 font-semibold text-gray-300 border-b border-gray-700">${rowData.name}</div>`;
        case 'variant':
            const isLoading = hlsLoadingVariants.has(rowData.uri);
            const isExpanded = expandedVariants.has(rowData.uri);
            const segments = hlsSegmentCache.get(rowData.uri);
            const hasError = segments?.error;

            return html`
                <div @click=${() => toggleVariant(rowData.uri)}
                     class="flex items-center p-2 cursor-pointer bg-gray-800 hover:bg-gray-700/70 border-t border-gray-700 ${indentClass}">
                    <span class="transform transition-transform ${isExpanded ? 'rotate-90' : ''}">▶</span>
                    <span class="ml-2 font-semibold text-gray-200">Variant Stream ${rowData.index + 1}</span>
                    <span class="ml-3 text-xs text-gray-400 font-mono">(BW: ${rowData.bw} kbps, Res: ${rowData.res})</span>
                    ${isLoading ? html`<div class="ml-auto animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>` : ''}
                    ${hasError ? html`<span class="ml-auto text-xs text-red-400">Error</span>` : ''}
                </div>`;
        case 'segment':
            const baseRow = segmentRowTemplate(rowData.segment);
            // This is a bit of a hack to inject the indent class into the lit-html template result
            return html`<tr class="border-t border-gray-700 segment-row bg-gray-900" data-url="${rowData.segment.resolvedUrl}" data-time="${rowData.segment.time}">
                ${baseRow.values.map((val, i) => html`<td class="py-2 ${i === 1 ? indentClass : ''} ${i === 0 ? 'pl-3' : ''} ${i === baseRow.values.length-1 ? 'pr-3' : ''}">${val}</td>`)}
            </tr>`;
        default:
            return html``;
    }
};

const hlsMasterExplorerTemplate = () => {
    const rows = [];
    rows.push({ type: 'master', name: 'HLS Master Playlist', level: 0 });

    const variants = currentStream.manifest.rawElement.variants || [];
    variants.forEach((variant, index) => {
        rows.push({
            type: 'variant',
            level: 1,
            index: index,
            uri: variant.resolvedUri,
            bw: (variant.attributes.BANDWIDTH / 1000).toFixed(0),
            res: variant.attributes.RESOLUTION || 'N/A',
        });

        if (expandedVariants.has(variant.resolvedUri)) {
            const segments = hlsSegmentCache.get(variant.resolvedUri);
            if (Array.isArray(segments)) {
                segments.forEach(seg => {
                    rows.push({ type: 'segment', level: 2, segment: seg });
                });
            }
        }
    });

    return html`<div class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
        <table class="w-full text-left text-sm table-fixed">
            <thead class="sticky top-0 bg-gray-900 z-10">
                <tr>
                    <th class="py-2 pl-3 w-8"></th>
                    <th class="py-2 w-[25%]">Type / Status</th>
                    <th class="py-2 w-[15%]">Timing (s)</th>
                    <th class="py-2 w-[35%]">URL</th>
                    <th class="py-2 pr-3 w-[25%] text-right">Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
        <div class="hls-rows-container">${rows.map(hlsRowTemplate)}</div>
    </div>`;
};

// --- SHARED TEMPLATE (Segment Row Core) ---
const segmentRowTemplate = (seg) => {
    const cacheEntry = analysisState.segmentCache.get(seg.resolvedUrl);
    let statusHtml;

    if (!cacheEntry || cacheEntry.status === -1) {
        statusHtml = html`<div class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-gray-500 animate-pulse" title="Status: Pending"></div>`;
    } else if (cacheEntry.status !== 200) {
        const statusText = cacheEntry.status === 0 ? 'Network Error' : `HTTP ${cacheEntry.status}`;
        statusHtml = html`<div class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-red-500" title="Status: ${statusText}"></div><span class="text-xs text-red-400 ml-2">[${statusText}]</span>`;
    } else {
        statusHtml = html`<div class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-green-500" title="Status: OK (200)"></div>`;
    }

    const typeLabel = seg.type === 'Init' ? 'Init' : `Media #${seg.number}`;
    const canAnalyze = cacheEntry && cacheEntry.status === 200 && cacheEntry.data;
    const isChecked = analysisState.segmentsForCompare.includes(seg.resolvedUrl);

    const analyzeHandler = (e) => {
        dom.modalTitle.textContent = 'Segment Analysis';
        const url = /** @type {HTMLElement} */ (e.currentTarget).dataset.url;
        const cached = analysisState.segmentCache.get(url);
        dom.modalSegmentUrl.textContent = url;
        const modalContent = dom.segmentModal.querySelector('div');
        dom.segmentModal.classList.remove('opacity-0', 'invisible');
        dom.segmentModal.classList.add('opacity-100', 'visible');
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
        dispatchAndRenderSegmentAnalysis(e, cached?.data);
    };

    const viewRawHandler = (e) => {
        const url = /** @type {HTMLElement} */ (e.currentTarget).dataset.url;
        analysisState.activeSegmentUrl = url;
        const targetTab = /** @type {HTMLButtonElement} */ (document.querySelector('[data-tab="interactive-segment"]'));
        targetTab?.click();
    };

    const segmentTiming = seg.type === 'Media' ? html`${(seg.time / seg.timescale).toFixed(2)}s (+${(seg.duration / seg.timescale).toFixed(2)}s)` : 'N/A';

    // Instead of a full <tr>, return just the values for the cells. The parent will construct the row.
    return [
        html`<input type="checkbox" class="bg-gray-700 border-gray-500 rounded focus:ring-blue-500" .value=${seg.resolvedUrl} ?checked=${isChecked} @change=${handleSegmentCheck}/>`,
        html`<div class="flex items-center">${statusHtml}<span class="ml-2">${typeLabel}</span></div>`,
        html`<span class="text-xs font-mono">${segmentTiming}</span>`,
        html`<span class="font-mono text-cyan-400 truncate" title="${seg.resolvedUrl}">${seg.template}</span>`,
        html`<div class="flex items-center justify-end space-x-2">
                <button class="view-raw-btn text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed" data-url="${seg.resolvedUrl}" ?disabled=${!canAnalyze} @click=${viewRawHandler}>View Raw</button>
                <button class="view-details-btn text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed" data-url="${seg.resolvedUrl}" data-repid="${seg.repId}" data-number="${seg.number}" ?disabled=${!canAnalyze} @click=${analyzeHandler}>Analyze</button>
            </div>`
    ];
};

// --- DASH IMPLEMENTATION ---
async function loadAndRenderDashSegmentRange(mode) {
    const contentArea = document.getElementById('segment-explorer-content');
    render(html`<p class="info">Fetching segment data...</p>`, contentArea);
    analysisState.segmentCache.clear();
    analysisState.segmentsForCompare = [];
    stopSegmentFreshnessChecker();
    const segmentsToFetch = Object.values(allSegmentsByRep).flatMap((segments) =>
        mode === 'first' ? segments.slice(0, SEGMENT_PAGE_SIZE) : segments.slice(-SEGMENT_PAGE_SIZE)
    );
    await Promise.all(segmentsToFetch.map((seg) => fetchSegment(seg.resolvedUrl)));
    const tables = Array.from(/** @type {Element} */ (currentStream.manifest.rawElement).querySelectorAll('Representation')).map((rep) => {
        const repId = rep.getAttribute('id');
        const segments = allSegmentsByRep[repId] || [];
        const segmentsToRender = mode === 'first' ? segments.slice(0, SEGMENT_PAGE_SIZE) : segments.slice(-SEGMENT_PAGE_SIZE);
        return dashSegmentTableTemplate(rep, segmentsToRender);
    });
    render(html`${tables}`, contentArea);
    if (currentStream.manifest.type === 'dynamic') {
        startSegmentFreshnessChecker();
    }
}

const dashSegmentTableTemplate = (rep, segmentsToRender) => {
    const repId = rep.getAttribute('id');
    const bandwidth = parseInt(rep.getAttribute('bandwidth'));
    return html`<details class="bg-gray-900 p-3 rounded" open>
        <summary class="font-semibold cursor-pointer">Representation: ${repId} (${(bandwidth / 1000).toFixed(0)} kbps)</summary>
        <div class="mt-2 max-h-96 overflow-y-auto">
            <table class="w-full text-left text-sm table-fixed">
                <thead class="sticky top-0 bg-gray-900 z-10">
                    <tr>
                        <th class="py-2 pl-3 w-8"></th><th class="py-2 w-[15%]">Type / Status</th><th class="py-2 w-[20%]">Timing (s)</th><th class="py-2 w-[45%]">URL</th><th class="py-2 pr-3 w-[20%] text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>${segmentsToRender.map(seg => html`${segmentRowTemplate(seg)}`)}</tbody>
            </table>
        </div>
    </details>`;
};


// --- DISPATCHER & MAIN TEMPLATE ---

function renderHlsExplorer() {
    const contentArea = document.getElementById('segment-explorer-content');
    if(contentArea) render(hlsMasterExplorerTemplate(), contentArea);
}

export function initializeSegmentExplorer(container, stream) {
    currentContainer = container;
    currentStream = stream;
    analysisState.segmentsForCompare = [];
    allSegmentsByRep = (stream.protocol === 'dash') ? parseAllSegmentUrls(stream) : {};
    
    // Reset HLS state for the new stream
    expandedVariants.clear();
    hlsSegmentCache.clear();
    hlsLoadingVariants.clear();

    const isHlsMaster = stream.protocol === 'hls' && stream.manifest?.rawElement?.isMaster;

    const template = html`
        <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
            <h3 class="text-xl font-bold">Segment Explorer</h3>
            <div id="segment-explorer-controls" class="flex items-center flex-wrap gap-4">
                ${stream.protocol === 'dash' ? html`
                    <button @click=${() => loadAndRenderDashSegmentRange('first')} class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors">First ${SEGMENT_PAGE_SIZE}</button>
                    ${stream.manifest.type === 'dynamic' ? html`<button @click=${() => loadAndRenderDashSegmentRange('last')} class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-3 rounded-md transition-colors">Last ${SEGMENT_PAGE_SIZE}</button>` : ''}
                ` : ''}
                <button id="segment-compare-btn" @click=${handleCompareClick} class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                    Compare Selected (0/2)
                </button>
            </div>
        </div>
        <div id="segment-explorer-content" class="space-y-4"></div>
    `;
    render(template, container);

    const contentArea = document.getElementById('segment-explorer-content');
    if (stream.protocol === 'dash') {
        loadAndRenderDashSegmentRange('first');
    } else {
        if (isHlsMaster) {
            renderHlsExplorer();
        } else {
            // HLS Media Playlist
            const segments = parseAllSegmentUrls(stream)['media-playlist'] || [];
            Promise.all(segments.map(s => fetchSegment(s.resolvedUrl))).then(() => {
                const tableHtml = html`<div class="mt-2 max-h-96 overflow-y-auto">
                    <table class="w-full text-left text-sm table-fixed">
                         <thead class="sticky top-0 bg-gray-900 z-10">
                            <tr>
                                <th class="py-2 pl-3 w-8"></th><th class="py-2 w-[15%]">Type / Status</th><th class="py-2 w-[20%]">Timing (s)</th><th class="py-2 w-[45%]">URL</th><th class="py-2 pr-3 w-[20%] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>${segments.map(seg => html`${segmentRowTemplate(seg)}`)}</tbody>
                    </table>
                </div>`;
                 render(tableHtml, contentArea);
            });
        }
    }
}

export function startSegmentFreshnessChecker() {
    stopSegmentFreshnessChecker();
    if (currentStream && currentStream.manifest.type === 'dynamic' && currentStream.protocol === 'dash') {
        segmentFreshnessInterval = setInterval(() => { /* TODO: DASH freshness logic */ }, 2000);
    }
}

export function stopSegmentFreshnessChecker() {
    if (segmentFreshnessInterval) {
        clearInterval(segmentFreshnessInterval);
        segmentFreshnessInterval = null;
    }
}