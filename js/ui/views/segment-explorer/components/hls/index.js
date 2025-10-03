import { html } from 'lit-html';
import { segmentRowTemplate } from '../../../../components/segment-row.js';
import { eventBus } from '../../../../../core/event-bus.js';

let liveSegmentHighlighterInterval = null;

export function startLiveSegmentHighlighter(renderCallback) {
    stopLiveSegmentHighlighter();
    if (renderCallback) {
        liveSegmentHighlighterInterval = setInterval(renderCallback, 1000);
    }
}

export function stopLiveSegmentHighlighter() {
    if (liveSegmentHighlighterInterval) {
        clearInterval(liveSegmentHighlighterInterval);
        liveSegmentHighlighterInterval = null;
    }
}

function getHlsSegmentLivenessState(stream, segment, variantState) {
    if (!stream || stream.manifest.type !== 'dynamic' || !variantState) {
        return 'default';
    }

    if (!variantState.freshSegmentUrls.has(segment.resolvedUrl)) {
        return 'stale';
    }

    const freshSegments = variantState.segments;
    const liveSegmentCount = Math.min(3, Math.floor(freshSegments.length / 2));
    const liveEdgeIndex = freshSegments.length - liveSegmentCount;

    const currentIndex = freshSegments.findIndex(
        (s) => s.resolvedUrl === segment.resolvedUrl
    );

    if (currentIndex !== -1 && currentIndex >= liveEdgeIndex) {
        return 'live';
    }

    return 'default';
}

const liveEdgeIndicatorTemplate = (stream, segments) => {
    if (stream.manifest.type !== 'dynamic' || segments.length === 0) {
        return '';
    }

    const totalDuration = segments.reduce(
        (sum, seg) => sum + seg.duration / seg.timescale,
        0
    );
    if (totalDuration <= 0) return '';

    const _liveEdgeTime = totalDuration;
    const partHoldBack = stream.manifest.summary.lowLatency?.partHoldBack;

    let positionFromEnd;
    let title;

    if (partHoldBack != null) {
        // LL-HLS: Position is based on PART-HOLD-BACK
        positionFromEnd = (partHoldBack / totalDuration) * 100;
        title = `Live Edge (Target: ${partHoldBack.toFixed(2)}s behind edge)`;
    } else {
        // Standard HLS: Position is at the very end
        positionFromEnd = 0;
        title = 'Live Edge';
    }

    return html`<div
        class="absolute top-0 bottom-0 right-0 w-0.5 bg-red-500 rounded-full z-20"
        style="right: ${positionFromEnd}%;"
        title="${title}"
    >
        <div
            class="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-red-500 animate-ping"
        ></div>
    </div>`;
};

const renderVariant = (stream, variant, variantUri) => {
    const variantState = stream.hlsVariantState.get(variantUri);
    if (!variantState) return html``;

    const {
        segments: rawSegments,
        error,
        isLoading,
        isExpanded,
        displayMode,
        isPolling,
        freshSegmentUrls,
    } = variantState;

    // Transform raw parser segments into the view model the template expects
    const hlsTimescale = 90000;
    let currentTime = 0;
    const mediaSequence = stream.manifest?.mediaSequence || 0;
    const allSegments = (Array.isArray(rawSegments) ? rawSegments : []).map(
        (seg, index) => {
            const transformedSeg = {
                repId: 'hls-media',
                type: seg.type || 'Media',
                number: mediaSequence + index,
                resolvedUrl: seg.resolvedUrl,
                template: seg.uri,
                time: Math.round(currentTime * hlsTimescale),
                duration: Math.round(seg.duration * hlsTimescale),
                timescale: hlsTimescale,
                gap: seg.gap || false,
            };
            currentTime += seg.duration;
            return transformedSeg;
        }
    );

    const segmentsToDisplay =
        displayMode === 'last10' ? allSegments.slice(-10) : allSegments;

    const onToggleExpand = () =>
        eventBus.dispatch('hls-explorer:toggle-variant', {
            streamId: stream.id,
            variantUri,
        });
    const onTogglePolling = (e) => {
        e.stopPropagation();
        eventBus.dispatch('hls-explorer:toggle-polling', {
            streamId: stream.id,
            variantUri,
        });
    };
    const onSetDisplayMode = (e) => {
        e.stopPropagation();
        eventBus.dispatch('hls-explorer:set-display-mode', {
            streamId: stream.id,
            variantUri,
            mode: displayMode === 'all' ? 'last10' : 'all',
        });
    };

    let content;
    if (isLoading) {
        content = html`<div class="p-4 text-center text-gray-400">
            Loading segments...
        </div>`;
    } else if (error) {
        content = html`<div class="p-4 text-red-400">Error: ${error}</div>`;
    } else if (allSegments.length === 0) {
        content = html`<div class="p-4 text-center text-gray-400">
            No segments found in this playlist.
        </div>`;
    } else {
        content = html` <div class="overflow-y-auto relative max-h-[70vh]">
            ${liveEdgeIndicatorTemplate(stream, segmentsToDisplay)}
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
                    ${segmentsToDisplay.map((seg) =>
                        segmentRowTemplate(
                            seg,
                            freshSegmentUrls.has(seg.resolvedUrl),
                            getHlsSegmentLivenessState(
                                stream,
                                seg,
                                variantState
                            )
                        )
                    )}
                </tbody>
            </table>
        </div>`;
    }

    return html`
        <details
            class="bg-gray-800 rounded-lg border border-gray-700"
            ?open=${isExpanded}
        >
            <summary
                @click=${(e) => {
                    e.preventDefault();
                    onToggleExpand();
                }}
                class="flex items-center p-2 bg-gray-900/50 cursor-pointer"
            >
                <div class="flex-grow font-semibold text-gray-200">
                    ${variant.title}
                </div>
            </summary>
            ${isExpanded
                ? html`
                      <div class="p-2 border-t border-gray-700">
                          <div class="flex items-center gap-4 p-2">
                              ${stream.manifest.type === 'dynamic'
                                  ? html`
                                        <button
                                            @click=${onTogglePolling}
                                            class="text-xs px-3 py-1 rounded ${isPolling
                                                ? 'bg-red-600 hover:bg-red-700'
                                                : 'bg-blue-600 hover:bg-blue-700'}"
                                        >
                                            ${isPolling
                                                ? 'Stop Polling'
                                                : 'Start Polling'}
                                        </button>
                                    `
                                  : ''}
                              <button
                                  @click=${onSetDisplayMode}
                                  class="text-xs px-3 py-1 rounded bg-gray-600 hover:bg-gray-700"
                              >
                                  Show
                                  ${displayMode === 'all' ? 'Last 10' : 'All'}
                              </button>
                          </div>
                          ${content}
                      </div>
                  `
                : ''}
        </details>
    `;
};

/**
 * Creates the lit-html template for the HLS segment explorer content.
 * @param {import('../../../../../core/store.js').Stream} stream
 * @returns {import('lit-html').TemplateResult}
 */
export function getHlsExplorerTemplate(stream) {
    if (stream.manifest.isMaster) {
        const variants = (stream.manifest.variants || []).map((v, i) => ({
            ...v,
            title: `Variant Stream ${i + 1} (BW: ${(v.attributes.BANDWIDTH / 1000).toFixed(0)}k)`,
        }));
        return html`<div class="space-y-1">
            ${variants.map((v) => renderVariant(stream, v, v.resolvedUri))}
        </div>`;
    } else {
        const mediaVariant = {
            title: 'Media Playlist Segments',
            uri: null,
            resolvedUri: stream.originalUrl,
        };
        return renderVariant(stream, mediaVariant, mediaVariant.resolvedUri);
    }
}
