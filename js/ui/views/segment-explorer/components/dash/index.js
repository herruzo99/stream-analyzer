import { html } from 'lit-html';
import { segmentRowTemplate } from '../../../../components/segment-row.js';

const dashSegmentTableTemplate = (
    stream,
    period,
    representation,
    displayMode
) => {
    const compositeKey = `${period.id}-${representation.id}`;
    const repState = stream.dashRepresentationState.get(compositeKey);

    if (!repState) {
        return html`<div class="text-red-400 p-2">
            State not found for Representation ${representation.id} in Period
            ${period.id}.
        </div>`;
    }

    const { segments, freshSegmentUrls } = repState;

    const SEGMENT_PAGE_SIZE = 10;
    const segmentsToRender =
        displayMode === 'first'
            ? segments.slice(0, SEGMENT_PAGE_SIZE)
            : segments.slice(-SEGMENT_PAGE_SIZE);

    const header = html` <div
        class="flex items-center p-2 bg-gray-900/50 border-b border-gray-700"
    >
        <div class="flex-grow flex items-center">
            <span class="font-semibold text-gray-200"
                >Representation: ${representation.id}</span
            >
            <span class="ml-3 text-xs text-gray-400 font-mono"
                >(${(representation.bandwidth / 1000).toFixed(0)} kbps)</span
            >
        </div>
    </div>`;

    let content;
    if (segments.length === 0) {
        content = html`<div class="p-4 text-center text-gray-400 text-sm">
            No segments found for this representation.
        </div>`;
    } else {
        content = html`<div class="overflow-x-auto">
            <table class="w-full text-left text-sm table-auto min-w-[600px]">
                <thead class="sticky top-0 bg-gray-900 z-10">
                    <tr>
                        <th class="px-3 py-2 w-8"></th>
                        <th class="px-3 py-2">Status / Type</th>
                        <th class="px-3 py-2">Timing (s)</th>
                        <th class="px-3 py-2">URL & Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${segmentsToRender.map((seg) => {
                        const isFresh = freshSegmentUrls.has(seg.resolvedUrl);
                        // Liveness state is now handled by the real-time highlighter, not at render time.
                        return segmentRowTemplate(seg, isFresh);
                    })}
                </tbody>
            </table>
        </div>`;
    }

    return html`<div class="bg-gray-800 rounded-lg border border-gray-700 mt-2">
        ${header} ${content}
    </div>`;
};

/**
 * Creates the lit-html template for the DASH segment explorer content.
 * @param {import('../../../../../app/store.js').Stream} stream
 * @param {string} displayMode - 'first' or 'last'
 * @returns {import('lit-html').TemplateResult}
 */
export function getDashExplorerTemplate(stream, displayMode) {
    if (!stream.manifest || !stream.manifest.periods) {
        return html`<p class="text-gray-400">
            No periods found in the manifest.
        </p>`;
    }

    return html`
        <div class="space-y-6">
            ${stream.manifest.periods.map(
                (period, index) => html`
                    <div>
                        <h3
                            class="text-lg font-bold text-gray-300 border-b-2 border-gray-700 pb-1"
                        >
                            Period: ${period.id || `(index ${index})`}
                            <span class="text-sm font-mono text-gray-500"
                                >(Start: ${period.start}s)</span
                            >
                        </h3>
                        <div class="space-y-4 mt-2">
                            ${period.adaptationSets
                                .filter((as) => as.representations.length > 0)
                                .map(
                                    (as) => html`
                                        <div class="pl-4">
                                            <h4
                                                class="text-md font-semibold text-gray-400"
                                            >
                                                AdaptationSet
                                                ${as.id ? `(ID: ${as.id})` : ''}
                                                (${as.contentType || 'N/A'})
                                            </h4>
                                            ${as.representations.map((rep) =>
                                                dashSegmentTableTemplate(
                                                    stream,
                                                    period,
                                                    rep,
                                                    displayMode
                                                )
                                            )}
                                        </div>
                                    `
                                )}
                        </div>
                    </div>
                `
            )}
        </div>
    `;
}
