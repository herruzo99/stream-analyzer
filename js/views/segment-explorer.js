import { analysisState, dom } from '../state.js';
import { handleSegmentAnalysisClick as analyzeSegmentFromBuffer } from '../api/segment-parser.js';

const SEGMENT_PAGE_SIZE = 10;
let segmentFreshnessInterval = null;

/**
 * Main entry point to set up the Segment Explorer tab with its initial state.
 * @param {HTMLDivElement} container The container element for the tab.
 * @param {Element} mpd The parsed MPD.
 * @param {string} baseUrl The stream's base URL.
 */
export function initializeSegmentExplorer(container, mpd, baseUrl) {
    const isDynamic = mpd.getAttribute('type') === 'dynamic';

    let initialButtons = `
        <button id="load-first-segments-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors">
            Load First ${SEGMENT_PAGE_SIZE} Segments
        </button>
    `;
    if (isDynamic) {
        initialButtons += `
            <button id="load-last-segments-btn" class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-3 rounded-md transition-colors ml-2">
                Load Last ${SEGMENT_PAGE_SIZE} Segments
            </button>
        `;
    }

    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold">Segment Explorer</h3>
            <div id="segment-explorer-controls" class="flex items-center gap-2">${initialButtons}</div>
        </div>
        <div id="segment-explorer-content" class="space-y-4">
            <p class="text-gray-400">Click a button above to load and check an initial set of segments.</p>
        </div>
    `;

    container.querySelector('#load-first-segments-btn')?.addEventListener('click', () => {
        loadAndCheckSegments(container, mpd, baseUrl, isDynamic, 'first');
    });
    if (isDynamic) {
        container.querySelector('#load-last-segments-btn')?.addEventListener('click', () => {
            loadAndCheckSegments(container, mpd, baseUrl, isDynamic, 'last');
        });
    }
}

async function loadAndCheckSegments(container, mpd, baseUrl, isDynamic, mode) {
    const contentArea = container.querySelector('#segment-explorer-content');
    const controlsArea = container.querySelector('#segment-explorer-controls');
    
    controlsArea.innerHTML = `<button class="bg-gray-600 text-white font-bold py-2 px-3 rounded-md" disabled>Loading & Fetching...</button>`;
    contentArea.innerHTML = `<p class="info">Parsing MPD and fetching segments...</p>`;
    
    analysisState.segmentCache.clear();
    stopSegmentFreshnessChecker();

    const allSegmentsByRep = parseAllSegmentUrls(mpd, baseUrl);
    if (Object.keys(allSegmentsByRep).length === 0) {
        contentArea.innerHTML = '<p class="warn">Could not find any segments to load.</p>';
        return;
    }

    const segmentsToFetch = mode === 'all' 
        ? Object.values(allSegmentsByRep).flat()
        : Object.values(allSegmentsByRep).flatMap(segments => 
            mode === 'first' ? segments.slice(0, SEGMENT_PAGE_SIZE) : segments.slice(-SEGMENT_PAGE_SIZE)
          );

    await Promise.all(segmentsToFetch.map(seg => fetchSegment(seg.resolvedUrl)));

    contentArea.innerHTML = renderAllSegmentTables(allSegmentsByRep, mode);
    attachSegmentExplorerListeners(container, mpd, baseUrl, isDynamic, allSegmentsByRep);

    if (isDynamic) {
        startSegmentFreshnessChecker();
    }
    
    const refreshButtons = `
        <button id="refresh-first-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors">Refresh First ${SEGMENT_PAGE_SIZE}</button>
        ${isDynamic ? `<button id="refresh-last-btn" class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-3 rounded-md transition-colors">Refresh Last ${SEGMENT_PAGE_SIZE}</button>` : ''}
        <button id="load-all-btn" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-md transition-colors">Load All Segments</button>
    `;
    controlsArea.innerHTML = refreshButtons;
    controlsArea.querySelector('#refresh-first-btn')?.addEventListener('click', () => loadAndCheckSegments(container, mpd, baseUrl, isDynamic, 'first'));
    controlsArea.querySelector('#refresh-last-btn')?.addEventListener('click', () => loadAndCheckSegments(container, mpd, baseUrl, isDynamic, 'last'));
    controlsArea.querySelector('#load-all-btn')?.addEventListener('click', () => loadAndCheckSegments(container, mpd, baseUrl, isDynamic, 'all'));
}

async function fetchSegment(url) {
    try {
        const response = await fetch(url, { method: 'GET', cache: 'no-store' });
        const data = response.ok ? await response.arrayBuffer() : null;
        analysisState.segmentCache.set(url, { status: response.status, data });
    } catch (error) {
        analysisState.segmentCache.set(url, { status: 0, data: null });
    }
}

function renderAllSegmentTables(allSegmentsByRep, mode) {
    let html = '';
    const mpd = analysisState.streams.find(s => s.id === analysisState.activeStreamId).mpd;
    mpd.querySelectorAll('Representation').forEach(rep => {
        const repId = rep.getAttribute('id');
        const repSegments = allSegmentsByRep[repId] || [];
        const segmentsToRender = mode === 'all' ? repSegments : (mode === 'first' ? repSegments.slice(0, SEGMENT_PAGE_SIZE) : repSegments.slice(-SEGMENT_PAGE_SIZE));
        const initialSegmentsHtml = renderSegmentRows(segmentsToRender);

        let paginationButtonHtml = '';
        if (mode === 'first' && repSegments.length > SEGMENT_PAGE_SIZE) {
            paginationButtonHtml = `<tr class="load-more-row"><td colspan="3" class="text-center py-2"><button class="load-more-btn text-blue-400 hover:text-blue-600" data-repid="${repId}" data-offset="${SEGMENT_PAGE_SIZE}">Load More (${repSegments.length - SEGMENT_PAGE_SIZE} remaining)</button></td></tr>`;
        } else if (mode === 'last' && repSegments.length > SEGMENT_PAGE_SIZE) {
            paginationButtonHtml = `<tr class="load-previous-row"><td colspan="3" class="text-center py-2"><button class="load-previous-btn text-blue-400 hover:text-blue-600" data-repid="${repId}" data-offset="${repSegments.length - SEGMENT_PAGE_SIZE}">Load Previous</button></td></tr>`;
        }

        html += `<details class="bg-gray-900 p-3 rounded" open>
                    <summary class="font-semibold cursor-pointer">Representation: ${repId} (${(parseInt(rep.getAttribute('bandwidth'))/1000).toFixed(0)} kbps)</summary>
                    <div class="mt-2 pl-4 max-h-96 overflow-y-auto">
                        <table class="w-full text-left text-sm">
                            <thead class="sticky top-0 bg-gray-900 z-10"><tr>
                                <th class="py-2 w-1/4">Type / Status</th>
                                <th class="py-2 w-1/2">URL / Template</th>
                                <th class="py-2 w-1/4 text-right pr-4">Actions</th>
                            </tr></thead>
                            <tbody data-repid="${repId}">${initialSegmentsHtml}${paginationButtonHtml}</tbody>
                        </table>
                    </div>
                 </details>`;
    });
    return html;
}

function renderSegmentRows(segments) {
    return segments.map(seg => {
        const cacheEntry = analysisState.segmentCache.get(seg.resolvedUrl);
        let statusHtml = '';
        if (cacheEntry && cacheEntry.status !== 200) {
            const statusText = cacheEntry.status === 0 ? 'ERR' : cacheEntry.status;
            statusHtml = `<span class="segment-status-indicator status-fail" title="Status: ${statusText}"></span><span class="text-xs text-red-400 ml-1">[${statusText}]</span>`;
        }
        const typeLabel = seg.type === 'Init' ? 'Init' : `Media #${seg.number}`;

        return `<tr class="border-t border-gray-700 segment-row" data-url="${seg.resolvedUrl}" data-time="${seg.time}">
                    <td class="py-2 status-cell">${statusHtml}${typeLabel}</td>
                    <td class="font-mono text-cyan-400 truncate py-2" title="${seg.resolvedUrl}">${seg.template}</td>
                    <td class="py-2 text-right">
                        <button class="view-details-btn text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded" data-url="${seg.resolvedUrl}" data-repid="${seg.repId}" data-number="${seg.number}">Analyze</button>
                    </td>
                 </tr>`;
    }).join('');
}

function parseAllSegmentUrls(mpd, baseUrl) {
    const segmentsByRep = {};
    mpd.querySelectorAll('Representation').forEach(rep => {
        const repId = rep.getAttribute('id');
        segmentsByRep[repId] = [];
        const as = rep.closest('AdaptationSet');
        const period = rep.closest('Period');
        const template = rep.querySelector('SegmentTemplate') || as.querySelector('SegmentTemplate') || period.querySelector('SegmentTemplate');
        if (!template) return;

        const initTemplate = template.getAttribute('initialization');
        if (initTemplate) {
            const url = initTemplate.replace(/\$RepresentationID\$/g, repId);
            segmentsByRep[repId].push({ repId, type: 'Init', number: 0, resolvedUrl: new URL(url, baseUrl).href, template: url, time: -1 });
        }

        const mediaTemplate = template.getAttribute('media');
        const timeline = template.querySelector('SegmentTimeline');
        if (mediaTemplate && timeline) {
            let segmentNumber = parseInt(template.getAttribute('startNumber') || '1');
            let currentTime = 0;
            timeline.querySelectorAll('S').forEach(s => {
                const t = s.hasAttribute('t') ? parseInt(s.getAttribute('t')) : currentTime;
                const d = parseInt(s.getAttribute('d'));
                const r = parseInt(s.getAttribute('r') || '0');
                for (let i = 0; i <= r; i++) {
                    const segTime = t + (i * d);
                    const url = mediaTemplate.replace(/\$RepresentationID\$/g, repId).replace(/\$Number(%0\d+d)?\$/g, (match, padding) => {
                        const width = padding ? parseInt(padding.substring(2, padding.length - 1)) : 1;
                        return String(segmentNumber).padStart(width, '0');
                    }).replace(/\$Time\$/g, String(segTime));
                    segmentsByRep[repId].push({ repId, type: 'Media', number: segmentNumber, resolvedUrl: new URL(url, baseUrl).href, template: url, time: segTime });
                    segmentNumber++;
                }
                currentTime = t + ((r + 1) * d);
            });
        }
    });
    return segmentsByRep;
}

async function handleLoadMoreSegments(e, allSegmentsByRep) {
    const btn = /** @type {HTMLButtonElement} */ (e.target);
    btn.textContent = 'Loading...';
    btn.disabled = true;

    const repId = btn.dataset.repid;
    const offset = parseInt(btn.dataset.offset);
    
    const segmentsToFetch = allSegmentsByRep[repId].slice(offset, offset + SEGMENT_PAGE_SIZE);
    await Promise.all(segmentsToFetch.map(seg => fetchSegment(seg.resolvedUrl)));

    const newRowsHtml = renderSegmentRows(segmentsToFetch);
    const tableBody = document.querySelector(`tbody[data-repid="${repId}"]`);
    const loadMoreRow = tableBody.querySelector('.load-more-row');
    if (loadMoreRow) {
        loadMoreRow.insertAdjacentHTML('beforebegin', newRowsHtml);
    }

    const newOffset = offset + SEGMENT_PAGE_SIZE;
    if (newOffset < allSegmentsByRep[repId].length) {
        btn.textContent = `Load More (${allSegmentsByRep[repId].length - newOffset} remaining)`;
        btn.dataset.offset = String(newOffset);
        btn.disabled = false;
    } else {
        loadMoreRow.remove();
    }
}

async function handleLoadPreviousSegments(e, allSegmentsByRep) {
    const btn = /** @type {HTMLButtonElement} */ (e.target);
    btn.textContent = 'Loading...';
    btn.disabled = true;

    const repId = btn.dataset.repid;
    const offset = parseInt(btn.dataset.offset);
    
    const start = Math.max(0, offset - SEGMENT_PAGE_SIZE);
    const end = offset;
    const segmentsToFetch = allSegmentsByRep[repId].slice(start, end);
    await Promise.all(segmentsToFetch.map(seg => fetchSegment(seg.resolvedUrl)));

    const newRowsHtml = renderSegmentRows(segmentsToFetch);
    const tableBody = document.querySelector(`tbody[data-repid="${repId}"]`);
    const loadPreviousRow = tableBody.querySelector('.load-previous-row');
    if (loadPreviousRow) {
        tableBody.querySelector('tr:first-child').insertAdjacentHTML('afterend', newRowsHtml); // after init
    }
    
    const newOffset = start;
    if (newOffset > 0) {
        btn.textContent = `Load Previous`;
        btn.dataset.offset = String(newOffset);
        btn.disabled = false;
    } else {
        loadPreviousRow.remove();
    }
}

export function attachSegmentExplorerListeners(container, mpd, baseUrl, isDynamic, allSegmentsByRep) {
    const refreshBtn = container.querySelector('#refresh-segments-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadAndCheckSegments(container, mpd, baseUrl, isDynamic, 'first'));
    }
    
    container.querySelectorAll('.view-details-btn:not([data-listener-attached])').forEach(btn => {
        btn.setAttribute('data-listener-attached', 'true');
        btn.addEventListener('click', async (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const url = target.dataset.url;
            const cacheEntry = analysisState.segmentCache.get(url);
            dom.modalSegmentUrl.textContent = url;
            dom.segmentModal.classList.add('modal-overlay-visible');
            if (cacheEntry && cacheEntry.data) {
                dom.modalContentArea.innerHTML = '<p class="info">Parsing segment from local cache...</p>';
                await analyzeSegmentFromBuffer(e, cacheEntry.data);
            } else {
                dom.modalContentArea.innerHTML = `<p class="fail">Segment data not in cache. Status: ${cacheEntry?.status || 'N/A'}.</p>`;
            }
        });
    });

    container.querySelectorAll('.load-more-btn:not([data-listener-attached])').forEach(btn => {
        btn.setAttribute('data-listener-attached', 'true');
        btn.addEventListener('click', (e) => handleLoadMoreSegments(e, allSegmentsByRep));
    });

    container.querySelectorAll('.load-previous-btn:not([data-listener-attached])').forEach(btn => {
        btn.setAttribute('data-listener-attached', 'true');
        btn.addEventListener('click', (e) => handleLoadPreviousSegments(e, allSegmentsByRep));
    });
}

function updateSegmentFreshness() {
    const activeStream = analysisState.streams.find(s => s.id === analysisState.activeStreamId);
    if (!activeStream || activeStream.mpd.getAttribute('type') !== 'dynamic') return;

    const timeShiftBufferDepth = parseDuration(activeStream.mpd.getAttribute('timeShiftBufferDepth'));
    const availabilityStartTime = new Date(activeStream.mpd.getAttribute('availabilityStartTime')).getTime();
    if (!timeShiftBufferDepth || !availabilityStartTime) return;

    const now = Date.now();
    const liveEdgeTime = (now - availabilityStartTime) / 1000;
    const dvrStartTime = liveEdgeTime - timeShiftBufferDepth;
    
    document.querySelectorAll('#segment-explorer-content .segment-row').forEach(row => {
        const rowEl = /** @type {HTMLTableRowElement} */ (row);
        if (rowEl.dataset.time === "-1") return;

        const template = rowEl.closest('details')?.querySelector('tbody[data-repid]')?.closest('details')?.querySelector('SegmentTemplate');
        if (!template) return;
        const timescale = parseInt(template.getAttribute('timescale') || '1');
        const segmentTime = parseInt(rowEl.dataset.time) / timescale;
        const statusCell = /** @type {HTMLTableCellElement} */ (rowEl.querySelector('.status-cell'));
        
        let isStale = segmentTime < dvrStartTime || segmentTime > liveEdgeTime + 2;
        let staleIndicator = statusCell.querySelector('.stale-segment-indicator');

        if (isStale) {
            if (!staleIndicator) {
                const typeLabel = statusCell.innerText;
                statusCell.innerHTML = `<div class="stale-segment-indicator tooltip" title="This segment is outside the current DVR window (${dvrStartTime.toFixed(1)}s - ${liveEdgeTime.toFixed(1)}s)."></div>${typeLabel}`;
            }
        } else {
             if (staleIndicator) {
                const typeLabel = statusCell.innerText;
                const cacheEntry = analysisState.segmentCache.get(rowEl.dataset.url);
                let statusHtml = '';
                 if (cacheEntry && cacheEntry.status !== 200) {
                    const statusText = cacheEntry.status === 0 ? 'ERR' : cacheEntry.status;
                    statusHtml = `<span class="segment-status-indicator status-fail" title="Status: ${statusText}"></span><span class="text-xs text-red-400 ml-1">[${statusText}]</span>`;
                }
                statusCell.innerHTML = `${statusHtml}${typeLabel}`;
             }
        }
    });
}

export function startSegmentFreshnessChecker() {
    stopSegmentFreshnessChecker();
    const activeStream = analysisState.streams.find(s => s.id === analysisState.activeStreamId);
    if (activeStream && activeStream.mpd.getAttribute('type') === 'dynamic') {
        updateSegmentFreshness();
        segmentFreshnessInterval = setInterval(updateSegmentFreshness, 2000);
        analysisState.segmentFreshnessChecker = segmentFreshnessInterval;
    }
}

export function stopSegmentFreshnessChecker() {
    if (segmentFreshnessInterval) {
        clearInterval(segmentFreshnessInterval);
        segmentFreshnessInterval = null;
        analysisState.segmentFreshnessChecker = null;
    }
}

const parseDuration = (durationStr) => {
    if (!durationStr) return 0;
    const match = durationStr.match(/PT(?:(\d+\.?\d*)S)?/);
    return match ? parseFloat(match[1] || 0) : 0;
};