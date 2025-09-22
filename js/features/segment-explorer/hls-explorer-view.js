import { html, render } from 'lit-html';
import { analysisState } from '../../core/state.js';
import { segmentRowTemplate } from './segment-row.js';
import { parseManifest } from '../../protocols/hls/parser.js';
import { parseAllSegmentUrls as parseHlsSegmentUrls } from './hls-parser.js';
import { eventBus } from '../../core/event-bus.js';

// --- CONFIG & STATE ---
const LIVE_EDGE_OFFSET = 3;
const POLL_INTERVAL_MS = 5000;
const HIGHLIGHT_INTERVAL_MS = 1000;

let variantPollers = new Map();
let expandedVariants = new Set();
let hlsSegmentCache = new Map();
let hlsLoadingVariants = new Set();
let hlsFreshSegments = new Map();
let currentStream = null;
let pollingEnabled = new Map();
let displayMode = new Map(); // 'all' or 'last10'
let liveSegmentHighlighterInterval = null;
let segmentLoadedUnsubscribe = null;

export function startLiveSegmentHighlighter() {
    stopLiveSegmentHighlighter(); // Ensure no duplicates
    if (currentStream && currentStream.manifest.type === 'dynamic') {
        liveSegmentHighlighterInterval = setInterval(
            () => renderHlsExplorer(),
            HIGHLIGHT_INTERVAL_MS
        );
    }
}

export function stopLiveSegmentHighlighter() {
    if (liveSegmentHighlighterInterval) {
        clearInterval(liveSegmentHighlighterInterval);
        liveSegmentHighlighterInterval = null;
    }
}

function resetHlsState() {
    variantPollers.forEach(clearInterval);
    variantPollers.clear();
    stopLiveSegmentHighlighter();
    if (segmentLoadedUnsubscribe) {
        segmentLoadedUnsubscribe();
        segmentLoadedUnsubscribe = null;
    }
    expandedVariants.clear();
    hlsSegmentCache.clear();
    hlsLoadingVariants.clear();
    hlsFreshSegments.clear();
    pollingEnabled.clear();
    displayMode.clear();
    currentStream = null;
}

async function fetchAndRenderRange(variantUri, segments) {
    const segmentsToFetch = segments.filter(
        (s) => !analysisState.segmentCache.has(s.resolvedUrl)
    );
    segmentsToFetch.forEach((s) =>
        eventBus.dispatch('segment:fetch', { url: s.resolvedUrl })
    );
}

async function pollVariant(variantUri) {
    if (!pollingEnabled.get(variantUri)) return;

    try {
        const currentSegments = hlsSegmentCache.get(variantUri) || [];
        // Guard clause to prevent crash on poisoned cache
        if (!Array.isArray(currentSegments)) {
            console.warn(
                `Polling skipped for ${variantUri}: cache contains non-array data (likely an error state).`
            );
            return;
        }

        const response = await fetch(variantUri);
        if (!response.ok) return;
        const rawManifest = await response.text();
        const { manifest } = await parseManifest(rawManifest, variantUri);

        const lastSegment =
            currentSegments.length > 0
                ? currentSegments[currentSegments.length - 1]
                : null;
        const startTime = lastSegment
            ? (lastSegment.time + lastSegment.duration) / lastSegment.timescale
            : 0;

        const latestParsed = parseHlsSegmentUrls(
            manifest.rawElement,
            startTime
        );
        const latestSegments = latestParsed['media-playlist'];

        const currentUrlSet = new Set(currentSegments.map((s) => s.resolvedUrl));
        const newSegments = latestSegments.filter(
            (s) => !currentUrlSet.has(s.resolvedUrl)
        );

        if (newSegments.length > 0) {
            hlsSegmentCache.set(variantUri, [
                ...currentSegments,
                ...newSegments,
            ]);
        }
        hlsFreshSegments.set(
            variantUri,
            new Set(latestSegments.map((s) => s.resolvedUrl))
        );
        renderHlsExplorer();
    } catch (e) {
        console.error(`[HLS-POLL] Failed to refresh variant ${variantUri}:`, e);
    }
}

async function initializeVariant(variantUri, isRestart = false) {
    if (isRestart) {
        hlsSegmentCache.delete(variantUri);
        hlsFreshSegments.delete(variantUri);
    }
    displayMode.set(variantUri, 'all'); // Default to showing all segments

    hlsLoadingVariants.add(variantUri);
    renderHlsExplorer(); // Show spinner for the playlist fetch

    try {
        const response = await fetch(variantUri);
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        const rawManifest = await response.text();
        const { manifest } = await parseManifest(rawManifest, variantUri);
        const segments =
            parseHlsSegmentUrls(manifest.rawElement)['media-playlist'];
        hlsSegmentCache.set(variantUri, segments);

        hlsLoadingVariants.delete(variantUri);
        renderHlsExplorer();

        await fetchAndRenderRange(variantUri, segments.slice(-10));
    } catch (err) {
        hlsSegmentCache.set(variantUri, { error: err.message });
        hlsLoadingVariants.delete(variantUri);
        renderHlsExplorer();
    }
}

function togglePolling(variantUri) {
    const isEnabled = !pollingEnabled.get(variantUri);
    pollingEnabled.set(variantUri, isEnabled);
    if (isEnabled) {
        pollVariant(variantUri); // Poll immediately
    }
    renderHlsExplorer();
}

function toggleDisplayMode(variantUri) {
    const currentMode = displayMode.get(variantUri) || 'all';
    displayMode.set(variantUri, currentMode === 'all' ? 'last10' : 'all');
    renderHlsExplorer();
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
    } else {
        expandedVariants.add(variantUri);
        if (currentStream.manifest.type === 'dynamic') {
            pollingEnabled.set(variantUri, true); // Default to on
            const pollerId = setInterval(
                () => pollVariant(variantUri),
                POLL_INTERVAL_MS
            );
            variantPollers.set(variantUri, pollerId);
        }
        if (!hlsSegmentCache.has(variantUri)) {
            await initializeVariant(variantUri);
        }
    }
    renderHlsExplorer();
}

function findCurrentLiveSegmentIndex(segments) {
    if (!Array.isArray(segments) || segments.length === 0) return -1;
    const now = Date.now();
    for (let i = segments.length - 1; i >= 0; i--) {
        const seg = segments[i];
        if (seg.dateTime) {
            const segStartTime = new Date(seg.dateTime).getTime();
            const segDurationMs = (seg.duration / seg.timescale) * 1000 * 90;
            if (now >= segStartTime && now < segStartTime + segDurationMs) {
                return i;
            }
        }
    }
    return Math.max(0, segments.length - LIVE_EDGE_OFFSET);
}

const renderVariant = (variant, index) => {
    const variantUri = variant.uri
        ? variant.resolvedUri
        : currentStream.originalUrl;
    const isExpanded = expandedVariants.has(variantUri);
    const isLoading = hlsLoadingVariants.has(variantUri);
    const allSegments = hlsSegmentCache.get(variantUri) || [];
    const hasError = allSegments?.error;
    const freshUrlSet = hlsFreshSegments.get(variantUri) || new Set();
    const isLive = currentStream.manifest.type === 'dynamic';

    const currentMode = displayMode.get(variantUri) || 'all';
    const sourceSegments = Array.isArray(allSegments) ? allSegments : [];
    const visibleSegments =
        currentMode === 'last10'
            ? sourceSegments.slice(-10)
            : sourceSegments;
    const segmentsToRender = visibleSegments.slice().reverse();

    const currentLiveSegmentIndex = isLive
        ? findCurrentLiveSegmentIndex(sourceSegments)
        : -1;

    return html`
        <div class="bg-gray-800 rounded-lg border border-gray-700">
            <div
                class="flex items-center p-2 bg-gray-900/50 hover:bg-gray-700/70 border-b border-gray-700"
            >
                <div
                    @click=${() => toggleVariant(variantUri)}
                    class="flex-grow flex items-center cursor-pointer"
                >
                    <span
                        class="transform transition-transform ${isExpanded
                            ? 'rotate-90'
                            : ''}"
                        >▶</span
                    >
                    <span class="ml-2 font-semibold text-gray-200"
                        >${variant.title}</span
                    >
                    ${variant.attributes
                        ? html`<span
                              class="ml-3 text-xs text-gray-400 font-mono"
                          >
                              (BW:
                              ${(
                                  variant.attributes.BANDWIDTH / 1000
                              ).toFixed(0)}
                              kbps, Res:
                              ${variant.attributes.RESOLUTION || 'N/A'})
                          </span>`
                        : ''}
                </div>
                <div
                    class="flex items-center justify-end space-x-2 flex-shrink-0"
                >
                    ${isLoading
                        ? html`<div
                              class="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"
                          ></div>`
                        : ''}
                    ${hasError
                        ? html`<span class="text-xs text-red-400"
                              >Error: ${hasError}</span
                          >`
                        : ''}
                    ${isLive
                        ? html`
                              <button
                                  @click=${() => toggleDisplayMode(variantUri)}
                                  class="text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded"
                              >
                                  ${currentMode === 'last10'
                                      ? 'Show All'
                                      : 'Show Last 10'}
                              </button>
                              <button
                                  @click=${() => togglePolling(variantUri)}
                                  class="text-xs px-2 py-1 rounded ${pollingEnabled.get(
                                      variantUri
                                  )
                                      ? 'bg-orange-600 hover:bg-orange-700'
                                      : 'bg-gray-600 hover:bg-gray-700'}"
                              >
                                  ${pollingEnabled.get(variantUri)
                                      ? 'Auto-Refresh: ON'
                                      : 'Auto-Refresh: OFF'}
                              </button>
                              <button
                                  @click=${() => restartVariant(variantUri)}
                                  class="text-xs bg-cyan-600 hover:bg-cyan-700 px-2 py-1 rounded"
                                  title="Restart and fetch the latest playlist"
                              >
                                  Restart
                              </button>
                          `
                        : ''}
                </div>
            </div>
            ${isExpanded
                ? html`
                      <div
                          class="overflow-y-auto"
                          style="max-height: calc(2.8rem * 15);"
                      >
                          <table class="w-full text-left text-sm table-auto">
                              <thead class="sticky top-0 bg-gray-900 z-10">
                                  <tr>
                                      <th class="px-3 py-2 w-8"></th>
                                      <th class="px-3 py-2 w-[25%]">
                                          Status / Type
                                      </th>
                                      <th class="px-3 py-2 w-[20%]">
                                          Timing (s)
                                      </th>
                                      <th class="px-3 py-2 w-[55%]">
                                          URL & Actions
                                      </th>
                                  </tr>
                              </thead>
                              <tbody>
                                  ${segmentsToRender.map((seg) => {
                                      const originalIndex =
                                          sourceSegments.indexOf(seg);
                                      const isFresh = isLive
                                          ? freshUrlSet.has(seg.resolvedUrl)
                                          : true;
                                      let livenessState = 'default';
                                      if (isLive) {
                                          if (
                                              originalIndex ===
                                              currentLiveSegmentIndex
                                          ) {
                                              livenessState = 'current';
                                          } else if (!isFresh) {
                                              livenessState = 'stale';
                                          }
                                      }
                                      return segmentRowTemplate(
                                          seg,
                                          isFresh,
                                          livenessState
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  `
                : ''}
        </div>
    `;
};

export function renderHlsExplorer(stream) {
    if (stream) {
        resetHlsState();
        segmentLoadedUnsubscribe = eventBus.subscribe('segment:loaded', () =>
            renderHlsExplorer()
        );
    }
    currentStream = stream || currentStream;
    const contentArea = document.getElementById('segment-explorer-content');
    if (!contentArea || !currentStream) return;

    if (currentStream.manifest.rawElement.isMaster) {
        const variants =
            currentStream.manifest.rawElement.variants.map(
                (variant, index) => ({
                    ...variant,
                    title: `Variant Stream ${index + 1}`,
                })
            ) || [];
        render(
            html`<div class="space-y-1">
                ${variants.map((v, i) => renderVariant(v, i))}
            </div>`,
            contentArea
        );
    } else {
        const mediaVariant = {
            title: 'Media Playlist Segments',
            uri: null,
            resolvedUri: currentStream.originalUrl,
        };
        if (!expandedVariants.has(mediaVariant.resolvedUri)) {
            toggleVariant(mediaVariant.resolvedUri);
        }
        render(renderVariant(mediaVariant, 0), contentArea);
    }
}

// Subscribe to the global analysis start event to clean up module state
eventBus.subscribe('analysis:started', resetHlsState);