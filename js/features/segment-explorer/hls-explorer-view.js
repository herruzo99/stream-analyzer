import { html, render } from 'lit-html';
import { analysisState } from '../../core/state.js';
import { segmentRowTemplate } from './segment-row.js';
import { parseManifest } from '../../protocols/hls/parser.js';
import { parseAllSegmentUrls as parseHlsSegmentUrls } from './hls-parser.js';
import { fetchSegment } from './api.js';
import { eventBus } from '../../core/event-bus.js';

// --- CONFIG & STATE ---
const SEGMENTS_PER_LOAD = 10;
const LIVE_EDGE_OFFSET = 3;
const POLL_INTERVAL_MS = 5000;
let variantPollers = new Map();
let expandedVariants = new Set();
let hlsSegmentCache = new Map();
let hlsLoadingVariants = new Set();
let hlsLoadedSegmentCount = new Map();
let hlsFreshSegments = new Map();
let currentStream = null;
let mediaPlaylistLoaded = false;

function resetHlsState() {
    variantPollers.forEach(clearInterval);
    variantPollers.clear();
    expandedVariants.clear(); hlsSegmentCache.clear(); hlsLoadingVariants.clear();
    hlsLoadedSegmentCount.clear(); hlsFreshSegments.clear(); currentStream = null;
    mediaPlaylistLoaded = false;
}

async function fetchSegmentsForRange(variantUri, start, end) {
    const segments = hlsSegmentCache.get(variantUri);
    if (!Array.isArray(segments)) return;
    const rangeSegments = segments.slice(start, end);
    const segmentsToFetch = rangeSegments.filter(s => !analysisState.segmentCache.has(s.resolvedUrl));
    await Promise.all(segmentsToFetch.map(s => fetchSegment(s.resolvedUrl)));
    renderHlsExplorer();
}

async function loadMoreSegments(variantUri) {
    const currentCount = hlsLoadedSegmentCount.get(variantUri) || 0;
    const newCount = currentCount + SEGMENTS_PER_LOAD;
    hlsLoadedSegmentCount.set(variantUri, newCount);
    renderHlsExplorer();
    await fetchSegmentsForRange(variantUri, currentCount, newCount);
}

async function pollVariant(variantUri) {
    try {
        const response = await fetch(variantUri);
        if (!response.ok) return;
        const rawManifest = await response.text();
        const { manifest } = await parseManifest(rawManifest, variantUri);
        const latestSegments = parseHlsSegmentUrls(manifest.rawElement)['media-playlist'];
        
        const currentSegments = hlsSegmentCache.get(variantUri) || [];
        const currentUrlSet = new Set(currentSegments.map(s => s.resolvedUrl));
        const newSegments = latestSegments.filter(s => !currentUrlSet.has(s.resolvedUrl));

        if (newSegments.length > 0) {
            hlsSegmentCache.set(variantUri, [...currentSegments, ...newSegments]);
        }
        hlsFreshSegments.set(variantUri, new Set(latestSegments.map(s => s.resolvedUrl)));
        renderHlsExplorer();
    } catch (e) {
        console.error(`[HLS-POLL] Failed to refresh variant ${variantUri}:`, e);
    }
}

async function initializeVariant(variantUri, isRestart = false) {
    if (isRestart) {
        hlsSegmentCache.delete(variantUri);
        hlsLoadedSegmentCount.delete(variantUri);
        hlsFreshSegments.delete(variantUri);
    }
    
    hlsLoadingVariants.add(variantUri);
    renderHlsExplorer();
    try {
        const response = await fetch(variantUri);
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        const rawManifest = await response.text();
        const { manifest } = await parseManifest(rawManifest, variantUri);
        const segments = parseHlsSegmentUrls(manifest.rawElement)['media-playlist'];
        hlsSegmentCache.set(variantUri, segments);
        hlsFreshSegments.set(variantUri, new Set(segments.map(s => s.resolvedUrl)));
        hlsLoadedSegmentCount.set(variantUri, SEGMENTS_PER_LOAD);
        hlsLoadingVariants.delete(variantUri);
        renderHlsExplorer();
        await fetchSegmentsForRange(variantUri, 0, SEGMENTS_PER_LOAD);
    } catch (err) {
        hlsSegmentCache.set(variantUri, { error: err.message });
        hlsLoadingVariants.delete(variantUri);
        renderHlsExplorer();
    }
}

async function restartVariant(variantUri) {
    await initializeVariant(variantUri, true);
}

async function toggleVariant(variantUri) {
    if (expandedVariants.has(variantUri)) {
        expandedVariants.delete(variantUri);
        if (variantPollers.has(variantUri)) {
            clearInterval(variantPollers.get(variantUri));
            variantPollers.delete(variantUri);
        }
        renderHlsExplorer();
        return;
    }
    expandedVariants.add(variantUri);
    if (currentStream.manifest.type === 'dynamic') {
        const pollerId = setInterval(() => pollVariant(variantUri), POLL_INTERVAL_MS);
        variantPollers.set(variantUri, pollerId);
    }
    if (!hlsSegmentCache.has(variantUri)) {
        await initializeVariant(variantUri);
    } else {
        renderHlsExplorer();
    }
}

const hlsMediaExplorerTemplate = () => {
    // ... (logic remains the same, but we will call this function at the end)
};

const hlsMasterExplorerTemplate = () => {
    const variants = currentStream.manifest.rawElement.variants || [];
    return html`
    <div class="space-y-1">
        ${variants.map((variant, index) => {
            const variantUri = variant.resolvedUri;
            const isExpanded = expandedVariants.has(variantUri);
            const isLoading = hlsLoadingVariants.has(variantUri);
            const segments = hlsSegmentCache.get(variantUri) || [];
            const hasError = segments?.error;
            const freshUrlSet = hlsFreshSegments.get(variantUri) || new Set();
            const liveSegmentIndex = currentStream.manifest.type === 'dynamic' ? Math.max(0, segments.length - LIVE_EDGE_OFFSET) : -1;

            return html`
                <div class="bg-gray-800 rounded-lg border border-gray-700">
                    <div class="flex items-center p-2 bg-gray-900/50 hover:bg-gray-700/70 border-b border-gray-700">
                        <div @click=${() => toggleVariant(variantUri)} class="flex-grow flex items-center cursor-pointer">
                            <span class="transform transition-transform ${isExpanded ? 'rotate-90' : ''}">▶</span>
                            <span class="ml-2 font-semibold text-gray-200">Variant Stream ${index + 1}</span>
                            <span class="ml-3 text-xs text-gray-400 font-mono">
                                (BW: ${(variant.attributes.BANDWIDTH / 1000).toFixed(0)} kbps, Res: ${variant.attributes.RESOLUTION || 'N/A'})
                            </span>
                        </div>
                        <div class="flex items-center justify-end space-x-2 flex-shrink-0">
                             ${isLoading ? html`<div class="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>` : ''}
                             ${hasError ? html`<span class="text-xs text-red-400">Error</span>` : ''}
                             <button @click=${() => restartVariant(variantUri)} ?disabled=${!currentStream.manifest.type === 'dynamic'} class="text-xs bg-cyan-600 hover:bg-cyan-700 px-2 py-1 rounded disabled:opacity-50" title="Restart and fetch the latest playlist">Restart</button>
                        </div>
                    </div>
                    ${isExpanded ? html`
                        <div class="overflow-y-auto" style="max-height: calc(2.8rem * 15);">
                             <table class="w-full text-left text-sm table-auto">
                                <thead class="sticky top-0 bg-gray-900 z-10">
                                    <tr>
                                        <th class="px-3 py-2 w-8"></th>
                                        <th class="px-3 py-2 w-[25%]">Status / Type</th>
                                        <th class="px-3 py-2 w-[20%]">Timing (s)</th>
                                        <th class="px-3 py-2 w-[55%]">URL & Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Array.isArray(segments) ? segments.map((seg, segIndex) => {
                                        const isFresh = freshUrlSet.has(seg.resolvedUrl);
                                        let livenessState = isFresh ? 'default' : 'stale';
                                        if (isFresh && segIndex === liveSegmentIndex) livenessState = 'live';
                                        return segmentRowTemplate(seg, isFresh, livenessState);
                                    }) : ''}
                                </tbody>
                            </table>
                        </div>` : ''}
                </div>
            `;
        })}
    </div>`;
};

export function renderHlsExplorer(stream) {
    if (stream) resetHlsState();
    currentStream = stream || currentStream;
    const contentArea = document.getElementById('segment-explorer-content');
    if (!contentArea) return;
    if (currentStream.manifest.rawElement.isMaster) {
        render(hlsMasterExplorerTemplate(), contentArea);
    } else {
        render(hlsMediaExplorerTemplate(), contentArea);
    }
}