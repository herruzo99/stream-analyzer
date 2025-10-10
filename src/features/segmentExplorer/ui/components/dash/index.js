import { html } from 'lit-html';
import { segmentRowTemplate } from '@/ui/components/segment-row';
import { isDebugMode } from '@/application/utils/env';
import '@/ui/components/virtualized-list'; // Import the custom element

const diagnosticsTemplate = (diagnostics) => {
    if (!diagnostics || Object.keys(diagnostics).length === 0) {
        return '';
    }

    return html`
        <div
            class="bg-gray-900 border-2 border-dashed border-yellow-500/50 rounded-lg p-3 my-2 text-xs"
        >
            <h5 class="font-bold text-yellow-300 mb-2">
                Live Segment Calculation Diagnostics
            </h5>
            <table class="w-full text-left">
                <thead>
                    <tr class="border-b border-gray-700">
                        <th class="font-semibold text-gray-400 pb-1 w-1/3">
                            Strategy
                        </th>
                        <th class="font-semibold text-gray-400 pb-1">
                            Calculated Latest Segment #
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(diagnostics).map(
                        ([name, data]) => html`
                            <tr>
                                <td class="py-1 text-gray-300">${name}</td>
                                <td class="py-1 font-mono text-cyan-300">
                                    ${data.latestSegmentNum}
                                </td>
                            </tr>
                        `
                    )}
                </tbody>
            </table>
        </div>
    `;
};

const dashSegmentTableTemplate = (stream, period, representation) => {
    const compositeKey = `${period.id}-${representation.id}`;
    const repState = stream.dashRepresentationState.get(compositeKey);

    if (!repState) {
        return html`<div class="text-red-400 p-2">
            State not found for Representation ${representation.id} in Period
            ${period.id}.
        </div>`;
    }

    const { segments, freshSegmentUrls, diagnostics } = repState;

    const rowRenderer = (seg) => {
        const isFresh = freshSegmentUrls.has(
            /** @type {any} */ (seg).resolvedUrl
        );
        return segmentRowTemplate(seg, isFresh, stream.manifest.segmentFormat);
    };

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
        const listData = {
            items: segments,
            rowTemplate: rowRenderer,
            rowHeight: 40,
        };
        content = html`
            <div
                class="segment-grid-container text-sm min-w-[700px] overflow-hidden"
            >
                <div
                    class="grid-header grid sticky top-0 bg-gray-900 z-10 font-semibold text-gray-400"
                    style="grid-template-columns: 32px 160px 128px 96px 1fr;"
                >
                    <div
                        class="px-3 py-2 border-b border-r border-gray-700"
                    ></div>
                    <div class="px-3 py-2 border-b border-r border-gray-700">
                        Status / Type
                    </div>
                    <div class="px-3 py-2 border-b border-r border-gray-700">
                        Timing (s)
                    </div>
                    <div class="px-3 py-2 border-b border-r border-gray-700">
                        Flags
                    </div>
                    <div class="px-3 py-2 border-b border-gray-700">
                        URL & Actions
                    </div>
                </div>
                <virtualized-list
                    id="vl-${compositeKey}"
                    .tempData=${listData}
                    style="height: ${Math.min(segments.length * 40, 400)}px;"
                ></virtualized-list>
            </div>
        `;
    }

    return html`<div class="bg-gray-800 rounded-lg border border-gray-700 mt-2">
        ${header}
        ${isDebugMode && stream.manifest.type === 'dynamic'
            ? diagnosticsTemplate(diagnostics)
            : ''}
        <div class="p-2">${content}</div>
    </div>`;
};

/**
 * Creates the lit-html template for the DASH segment explorer content.
 * @param {import('@/types.ts').Stream} stream
 * @returns {import('lit-html').TemplateResult}
 */
export function getDashExplorerTemplate(stream) {
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
                                                    rep
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
