import { html, render } from 'lit-html';
import { analysisState, dom } from '../state.js';
import { dispatchAndRenderSegmentAnalysis } from '../api/segment-parser.js';

// --- CONSTANTS ---
const SEGMENT_PAGE_SIZE = 10;

// --- MODULE STATE ---
let segmentFreshnessInterval = null;
let allSegmentsByRep = {}; // Caches the full list of segments for the current MPD

// --- TEMPLATES ---
const segmentRowTemplate = (seg) => {
    const cacheEntry = analysisState.segmentCache.get(seg.resolvedUrl);
    let statusHtml;

    if (!cacheEntry || cacheEntry.status === -1) {
        // This case should now be rare, but kept for robustness
        statusHtml = html`<span
            class="segment-status-indicator status-pending"
            title="Status: Pending"
        ></span>`;
    } else if (cacheEntry.status !== 200) {
        const statusText =
            cacheEntry.status === 0
                ? 'Network Error'
                : `HTTP ${cacheEntry.status}`;
        statusHtml = html`<span
                class="segment-status-indicator status-fail"
                title="Status: ${statusText}"
            ></span
            ><span class="text-xs text-red-400 ml-1">[${statusText}]</span>`;
    } else {
        // Success case - no visible indicator needed, just the text
        statusHtml = html``;
    }

    const typeLabel = seg.type === 'Init' ? 'Init' : `Media #${seg.number}`;
    const canAnalyze =
        cacheEntry && cacheEntry.status === 200 && cacheEntry.data;

    const analyzeHandler = (e) => {
        const url = /** @type {HTMLElement} */ (e.currentTarget).dataset.url;
        const cached = analysisState.segmentCache.get(url);
        dom.modalSegmentUrl.textContent = url;
        dom.segmentModal.classList.add('modal-overlay-visible');
        dispatchAndRenderSegmentAnalysis(e, cached?.data);
    };

    const segmentTiming =
        seg.type === 'Media'
            ? html`${(seg.time / seg.timescale).toFixed(2)}s
              (+${(seg.duration / seg.timescale).toFixed(2)}s)`
            : 'N/A';

    return html` <tr
        class="border-t border-gray-700 segment-row"
        data-url="${seg.resolvedUrl}"
        data-time="${seg.time}"
    >
        <td class="py-2 pl-3 status-cell">${statusHtml}${typeLabel}</td>
        <td class="py-2 text-xs font-mono">${segmentTiming}</td>
        <td
            class="py-2 font-mono text-cyan-400 truncate"
            title="${seg.resolvedUrl}"
        >
            ${seg.template}
        </td>
        <td class="py-2 pr-3 text-right">
            <button
                class="view-details-btn text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                data-url="${seg.resolvedUrl}"
                data-repid="${seg.repId}"
                data-number="${seg.number}"
                ?disabled=${!canAnalyze}
                @click=${analyzeHandler}
            >
                Analyze
            </button>
        </td>
    </tr>`;
};

const segmentTableTemplate = (rep, segmentsToRender) => {
    const repId = rep.getAttribute('id');
    const bandwidth = parseInt(rep.getAttribute('bandwidth'));

    return html`
        <details class="bg-gray-900 p-3 rounded" open>
            <summary class="font-semibold cursor-pointer">
                Representation: ${repId} (${(bandwidth / 1000).toFixed(0)} kbps)
            </summary>
            <div class="mt-2 pl-4 max-h-96 overflow-y-auto">
                <table class="w-full text-left text-sm table-fixed">
                    <thead class="sticky top-0 bg-gray-900 z-10">
                        <tr>
                            <th class="py-2 pl-3 w-[15%]">Type / Status</th>
                            <th class="py-2 w-[20%]">Timing (s)</th>
                            <th class="py-2 w-[45%]">URL / Template</th>
                            <th class="py-2 pr-3 w-[20%] text-right">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody data-repid="${repId}">
                        ${segmentsToRender.map((seg) =>
                            segmentRowTemplate(seg)
                        )}
                    </tbody>
                </table>
            </div>
        </details>
    `;
};

// --- UI INITIALIZATION AND EVENT HANDLERS ---
export function initializeSegmentExplorer(container, mpd, baseUrl) {
    allSegmentsByRep = parseAllSegmentUrls(mpd, baseUrl);
    const isDynamic = mpd.getAttribute('type') === 'dynamic';

    const template = html`
        <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
            <h3 class="text-xl font-bold">Segment Explorer</h3>
            <div
                id="segment-explorer-controls"
                class="flex items-center flex-wrap gap-4"
            >
                <div class="flex items-center gap-2">
                    <button
                        @click=${() => loadAndRenderSegmentRange('first')}
                        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors"
                    >
                        First ${SEGMENT_PAGE_SIZE}
                    </button>
                    ${isDynamic
                        ? html`<button
                              @click=${() => loadAndRenderSegmentRange('last')}
                              class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-3 rounded-md transition-colors"
                          >
                              Last ${SEGMENT_PAGE_SIZE}
                          </button>`
                        : ''}
                </div>
                <div class="segment-filter-controls">
                    <select
                        id="segment-filter-type"
                        class="bg-gray-700 text-white rounded-l-md border-gray-600 p-2 text-sm h-full border-r-0"
                    >
                        <option value="number">Segment #</option>
                        <option value="time">Time (s)</option>
                    </select>
                    <input
                        type="text"
                        id="segment-filter-from"
                        class="bg-gray-700 text-white p-2 border-gray-600 w-24 text-sm h-full"
                        placeholder="From"
                    />
                    <input
                        type="text"
                        id="segment-filter-to"
                        class="bg-gray-700 text-white p-2 border-gray-600 w-24 text-sm h-full"
                        placeholder="To"
                    />
                    <button
                        @click=${handleFilter}
                        class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 h-full"
                    >
                        Filter
                    </button>
                    <button
                        @click=${() => loadAndRenderSegmentRange('first')}
                        class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded-r-md h-full"
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
        <div id="segment-explorer-content" class="space-y-4">
            <!-- Content will be rendered here -->
        </div>
        <div class="dev-watermark">Segment Explorer v3.0</div>
    `;
    render(template, container);
    // Auto-load the first page for a better user experience
    loadAndRenderSegmentRange('first');
}

async function loadAndRenderSegmentRange(mode) {
    const contentArea = /** @type {HTMLDivElement} */ (
        document.querySelector('#segment-explorer-content')
    );
    render(html`<p class="info">Fetching segment data...</p>`, contentArea);

    analysisState.segmentCache.clear();
    stopSegmentFreshnessChecker();

    const segmentsToFetch = Object.values(allSegmentsByRep).flatMap(
        (segments) =>
            mode === 'first'
                ? segments.slice(0, SEGMENT_PAGE_SIZE)
                : segments.slice(-SEGMENT_PAGE_SIZE)
    );

    await Promise.all(
        segmentsToFetch.map((seg) => fetchSegment(seg.resolvedUrl))
    );

    // *** THE FIX IS HERE: Generate the template *after* the cache is populated ***
    const mpd = analysisState.streams.find(
        (s) => s.id === analysisState.activeStreamId
    ).mpd;
    const tables = Array.from(mpd.querySelectorAll('Representation')).map(
        (rep) => {
            const repId = rep.getAttribute('id');
            const segments = allSegmentsByRep[repId] || [];
            const segmentsToRender =
                mode === 'first'
                    ? segments.slice(0, SEGMENT_PAGE_SIZE)
                    : segments.slice(-SEGMENT_PAGE_SIZE);
            return segmentTableTemplate(rep, segmentsToRender);
        }
    );
    render(html`${tables}`, contentArea);

    if (mpd.getAttribute('type') === 'dynamic') {
        startSegmentFreshnessChecker();
    }
}

async function handleFilter() {
    const contentArea = /** @type {HTMLDivElement} */ (
        document.querySelector('#segment-explorer-content')
    );
    const type = /** @type {HTMLSelectElement} */ (
        document.querySelector('#segment-filter-type')
    ).value;
    const fromInput = /** @type {HTMLInputElement} */ (
        document.querySelector('#segment-filter-from')
    );
    const toInput = /** @type {HTMLInputElement} */ (
        document.querySelector('#segment-filter-to')
    );

    const fromValue =
        fromInput.value !== '' ? parseFloat(fromInput.value) : -Infinity;
    const toValue = toInput.value !== '' ? parseFloat(toInput.value) : Infinity;

    if (isNaN(fromValue) || isNaN(toValue)) {
        render(
            html`<p class="warn">
                Please enter valid numbers for the filter range.
            </p>`,
            contentArea
        );
        return;
    }

    render(
        html`<p class="info">Filtering and fetching segments...</p>`,
        contentArea
    );

    const filteredSegmentsByRep = getFilteredSegments(fromValue, toValue, type);
    const segmentsToFetch = Object.values(filteredSegmentsByRep).flat();

    if (segmentsToFetch.length === 0) {
        render(
            html`<p class="warn">
                No segments found matching the specified filter.
            </p>`,
            contentArea
        );
        return;
    }

    await Promise.all(
        segmentsToFetch.map((seg) => fetchSegment(seg.resolvedUrl))
    );

    // *** THE FIX IS HERE: Generate the template *after* the cache is populated ***
    const mpd = analysisState.streams.find(
        (s) => s.id === analysisState.activeStreamId
    ).mpd;
    const tables = Array.from(mpd.querySelectorAll('Representation')).map(
        (rep) => {
            const repId = rep.getAttribute('id');
            const segmentsToRender = filteredSegmentsByRep[repId] || [];
            return segmentsToRender.length > 0
                ? segmentTableTemplate(rep, segmentsToRender)
                : '';
        }
    );

    render(html`${tables.filter(Boolean)}`, contentArea);
}

function getFilteredSegments(from, to, type) {
    const results = {};
    for (const repId in allSegmentsByRep) {
        const segments = allSegmentsByRep[repId];
        results[repId] = segments.filter((segment) => {
            if (segment.type !== 'Media') return false; // Only filter media segments
            let value;
            if (type === 'number') {
                value = segment.number;
            } else {
                // time
                value = segment.time / segment.timescale;
            }
            return value >= from && value <= to;
        });
    }
    return results;
}

// --- UTILITY AND HELPER FUNCTIONS ---

async function fetchSegment(url) {
    if (
        analysisState.segmentCache.has(url) &&
        analysisState.segmentCache.get(url).status !== -1
    )
        return;
    try {
        analysisState.segmentCache.set(url, { status: -1, data: null }); // Pending
        const response = await fetch(url, { method: 'GET', cache: 'no-store' });
        const data = response.ok ? await response.arrayBuffer() : null;
        analysisState.segmentCache.set(url, { status: response.status, data });
    } catch (_error) {
        analysisState.segmentCache.set(url, { status: 0, data: null }); // Network error
    }
}

function parseAllSegmentUrls(mpd, baseUrl) {
    const segmentsByRep = {};
    mpd.querySelectorAll('Representation').forEach((rep) => {
        const repId = rep.getAttribute('id');
        segmentsByRep[repId] = [];
        const as = rep.closest('AdaptationSet');
        const period = rep.closest('Period');
        const template =
            rep.querySelector('SegmentTemplate') ||
            as.querySelector('SegmentTemplate') ||
            period.querySelector('SegmentTemplate');
        if (!template) return;

        const timescale = parseInt(template.getAttribute('timescale') || '1');

        const initTemplate = template.getAttribute('initialization');
        if (initTemplate) {
            const url = initTemplate.replace(/\$RepresentationID\$/g, repId);
            segmentsByRep[repId].push({
                repId,
                type: 'Init',
                number: 0,
                resolvedUrl: new URL(url, baseUrl).href,
                template: url,
                time: -1,
                duration: 0,
                timescale,
            });
        }

        const mediaTemplate = template.getAttribute('media');
        const timeline = template.querySelector('SegmentTimeline');
        if (mediaTemplate && timeline) {
            let segmentNumber = parseInt(
                template.getAttribute('startNumber') || '1'
            );
            let currentTime = 0;
            timeline.querySelectorAll('S').forEach((s) => {
                const t = s.hasAttribute('t')
                    ? parseInt(s.getAttribute('t'))
                    : currentTime;
                const d = parseInt(s.getAttribute('d'));
                const r = parseInt(s.getAttribute('r') || '0');
                for (let i = 0; i <= r; i++) {
                    const segTime = t + i * d;
                    const url = mediaTemplate
                        .replace(/\$RepresentationID\$/g, repId)
                        .replace(/\$Number(%0\d+d)?\$/g, (match, padding) => {
                            const width = padding
                                ? parseInt(
                                      padding.substring(2, padding.length - 1)
                                  )
                                : 1;
                            return String(segmentNumber).padStart(width, '0');
                        })
                        .replace(/\$Time\$/g, String(segTime));
                    segmentsByRep[repId].push({
                        repId,
                        type: 'Media',
                        number: segmentNumber,
                        resolvedUrl: new URL(url, baseUrl).href,
                        template: url,
                        time: segTime,
                        duration: d,
                        timescale,
                    });
                    segmentNumber++;
                }
                currentTime = t + (r + 1) * d;
            });
        }
    });
    return segmentsByRep;
}

function updateSegmentFreshness() {
    const activeStream = analysisState.streams.find(
        (s) => s.id === analysisState.activeStreamId
    );
    if (!activeStream || activeStream.mpd.getAttribute('type') !== 'dynamic')
        return;

    const timeShiftBufferDepth = parseIsoDuration(
        activeStream.mpd.getAttribute('timeShiftBufferDepth')
    );
    const availabilityStartTime = new Date(
        activeStream.mpd.getAttribute('availabilityStartTime')
    ).getTime();
    if (!timeShiftBufferDepth || !availabilityStartTime) return;

    const now = Date.now();
    const liveEdge = (now - availabilityStartTime) / 1000;
    const dvrStartTime = liveEdge - timeShiftBufferDepth;

    document
        .querySelectorAll('#segment-explorer-content .segment-row')
        .forEach((row) => {
            const rowEl = /** @type {HTMLTableRowElement} */ (row);
            if (rowEl.dataset.time === '-1') return; // Skip init segment

            const tableBody = rowEl.closest('tbody');
            if (!tableBody) return;
            const repId = /** @type {HTMLElement} */ (tableBody).dataset.repid;
            const segmentData = allSegmentsByRep[repId]?.find(
                (s) => s.resolvedUrl === rowEl.dataset.url
            );
            if (!segmentData) return;

            const segmentTime = segmentData.time / segmentData.timescale;
            const statusCell = /** @type {HTMLTableCellElement} */ (
                rowEl.querySelector('.status-cell')
            );
            if (!statusCell) return;

            const isStale = segmentTime < dvrStartTime;
            const staleIndicator = statusCell.querySelector(
                '.stale-segment-indicator'
            );

            if (isStale && !staleIndicator) {
                // Surgically add the indicator element without breaking existing content or listeners.
                const indicator = document.createElement('div');
                indicator.className = 'stale-segment-indicator';
                indicator.title = `This segment is outside the current DVR window (${dvrStartTime.toFixed(1)}s - ${liveEdge.toFixed(1)}s).`;
                statusCell.prepend(indicator);
            } else if (!isStale && staleIndicator) {
                // Surgically remove the indicator when the segment is no longer stale.
                staleIndicator.remove();
            }
        });
}

export function startSegmentFreshnessChecker() {
    stopSegmentFreshnessChecker();
    const activeStream = analysisState.streams.find(
        (s) => s.id === analysisState.activeStreamId
    );
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

const parseIsoDuration = (durationStr) => {
    if (!durationStr) return 0;
    const match = durationStr.match(
        /PT(?:(\d+\.?\d*)H)?(?:(\d+\.?\d*)M)?(?:(\d+\.?\d*)S)?/
    );
    if (!match) return 0;
    const hours = parseFloat(match[1] || 0);
    const minutes = parseFloat(match[2] || 0);
    const seconds = parseFloat(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
};
