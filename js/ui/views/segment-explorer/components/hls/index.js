import { html } from 'lit-html';
import { segmentRowTemplate } from '../../../../components/segment-row.js';
import { eventBus } from '../../../../../core/event-bus.js';

let liveSegmentHighlighterInterval = null;

export function startLiveSegmentHighlighter(container, stream) {
    stopLiveSegmentHighlighter();

    const updateHighlights = () => {
        if (!container || container.offsetParent === null) {
            stopLiveSegmentHighlighter();
            return;
        }

        const now = Date.now();
        const liveClass = 'bg-green-700/50';
        const staleClass = 'text-gray-500',
            opacityClass = 'opacity-50';

        const rows = container.querySelectorAll('tr.segment-row');
        rows.forEach((row) => {
            const tr = /** @type {HTMLElement} */ (row);
            const startTime = parseInt(tr.dataset.startTime, 10);
            const endTime = parseInt(tr.dataset.endTime, 10);

            // Remove all state classes first
            tr.classList.remove(liveClass, staleClass, opacityClass);

            if (!startTime || !endTime) return;

            if (now >= startTime && now < endTime) {
                tr.classList.add(liveClass);
            } else if (now > endTime + 30000) {
                // Mark as stale if it's more than 30s past its end time
                tr.classList.add(staleClass, opacityClass);
            }
        });
    };

    liveSegmentHighlighterInterval = setInterval(updateHighlights, 1000);
}

export function stopLiveSegmentHighlighter() {
    if (liveSegmentHighlighterInterval) {
        clearInterval(liveSegmentHighlighterInterval);
        liveSegmentHighlighterInterval = null;
    }
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
    let pdtAnchorTime = 0;
    let cumulativeDuration = 0;
    const allSegments = (Array.isArray(rawSegments) ? rawSegments : []).map(
        (seg, index) => {
            if (seg.dateTime) {
                pdtAnchorTime = new Date(seg.dateTime).getTime();
                cumulativeDuration = 0; // Reset cumulative duration at each PDT tag
            }

            const startTimeUTC = pdtAnchorTime + cumulativeDuration * 1000;
            const endTimeUTC = startTimeUTC + seg.duration * 1000;
            const segmentTime = cumulativeDuration;
            cumulativeDuration += seg.duration;

            const transformedSeg = {
                repId: 'hls-media',
                type: seg.type || 'Media',
                number: (stream.manifest.mediaSequence || 0) + index,
                resolvedUrl: seg.resolvedUrl,
                template: seg.uri,
                time: segmentTime * 90000,
                duration: seg.duration * 90000,
                timescale: 90000,
                gap: seg.gap || false,
                startTimeUTC: startTimeUTC || 0,
                endTimeUTC: endTimeUTC || 0,
            };
            return transformedSeg;
        }
    );

    const segmentsToDisplay =
        displayMode === 'last10' ? allSegments.slice(-10) : allSegments;

    const onToggleExpand = (e) => {
        e.preventDefault();
        eventBus.dispatch('hls-explorer:toggle-variant', {
            streamId: stream.id,
            variantUri,
        });
    };
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
    } else if (allSegments.length === 0 && isExpanded) {
        content = html`<div class="p-4 text-center text-gray-400">
            No segments found in this playlist.
        </div>`;
    } else if (isExpanded) {
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
                            freshSegmentUrls.has(seg.resolvedUrl)
                        )
                    )}
                </tbody>
            </table>
        </div>`;
    }

    return html`
        <style>
            details > summary {
                list-style: none;
            }
            details > summary::-webkit-details-marker {
                display: none;
            }
            details[open] .chevron {
                transform: rotate(90deg);
            }
        </style>
        <details
            class="bg-gray-800 rounded-lg border border-gray-700"
            ?open=${isExpanded}
        >
            <summary
                @click=${onToggleExpand}
                class="flex items-center p-2 bg-gray-900/50 cursor-pointer list-none"
            >
                <div class="flex-grow font-semibold text-gray-200">
                    ${variant.title}
                </div>
                <svg
                    class="chevron w-5 h-5 text-gray-400 transition-transform duration-200"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fill-rule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clip-rule="evenodd"
                    />
                </svg>
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
 * @param {import('../../../../../core/types.js').Stream} stream
 * @returns {import('lit-html').TemplateResult}
 */
export function getHlsExplorerTemplate(stream) {
    if (stream.manifest.isMaster) {
        const variants = (stream.manifest.variants || []).map((v, i) => ({
            ...v,
            title: `Variant Stream ${i + 1} (BW: ${(
                v.attributes.BANDWIDTH / 1000
            ).toFixed(0)}k)`,
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
