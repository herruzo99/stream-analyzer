import { html } from 'lit-html';
import { segmentRowTemplate } from '../../../../components/segment-row.js';

const getDashSegmentLivenessState = (stream, segment, isFresh) => {
    if (!isFresh) {
        return 'stale';
    }

    const manifest = stream.manifest;
    if (manifest.type !== 'dynamic') {
        return 'default';
    }

    const now = Date.now();
    const availabilityStartTime = manifest.availabilityStartTime?.getTime();
    if (!availabilityStartTime) {
        return 'default';
    }

    const liveEdgeSeconds = (now - availabilityStartTime) / 1000;
    const segmentStartSeconds = segment.time / segment.timescale;
    const segmentEndSeconds =
        (segment.time + segment.duration) / segment.timescale;

    // Check if the segment is the one currently at the live edge
    if (
        liveEdgeSeconds >= segmentStartSeconds &&
        liveEdgeSeconds < segmentEndSeconds
    ) {
        return 'live';
    }

    return 'default';
};

const dashSegmentTableTemplate = (stream, repId, repState, displayMode) => {
    const { segments, freshSegmentUrls } = repState;

    const SEGMENT_PAGE_SIZE = 10;
    const segmentsToRender =
        displayMode === 'first'
            ? segments.slice(0, SEGMENT_PAGE_SIZE)
            : segments.slice(-SEGMENT_PAGE_SIZE);

    const bandwidth =
        stream.manifest.periods[0]?.adaptationSets
            .flatMap((as) => as.representations)
            .find((r) => r.id === repId)?.bandwidth || 0;

    return html`<div class="bg-gray-800 rounded-lg border border-gray-700">
        <div
            class="flex items-center p-2 bg-gray-900/50 border-b border-gray-700"
        >
            <div class="flex-grow flex items-center">
                <span class="font-semibold text-gray-200"
                    >Representation: ${repId}</span
                >
                <span class="ml-3 text-xs text-gray-400 font-mono"
                    >(${(bandwidth / 1000).toFixed(0)} kbps)</span
                >
            </div>
        </div>
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
                    ${segmentsToRender.map((seg) => {
                        const isFresh = freshSegmentUrls.has(seg.resolvedUrl);
                        return segmentRowTemplate(
                            seg,
                            isFresh,
                            getDashSegmentLivenessState(stream, seg, isFresh)
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>`;
};

/**
 * Creates the lit-html template for the DASH segment explorer content.
 * @param {import('../../../../../core/state.js').Stream} stream
 * @param {string} displayMode - 'first' or 'last'
 * @returns {import('lit-html').TemplateResult}
 */
export function getDashExplorerTemplate(stream, displayMode) {
    const repStates = Array.from(stream.dashRepresentationState.entries());

    if (repStates.length === 0) {
        return html`<p class="text-gray-400">
            No representations with segments found.
        </p>`;
    }

    return html`<div class="space-y-4">
        ${repStates.map(([repId, repState]) =>
            dashSegmentTableTemplate(stream, repId, repState, displayMode)
        )}
    </div>`;
}
