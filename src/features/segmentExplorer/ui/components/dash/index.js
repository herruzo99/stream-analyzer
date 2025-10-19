import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { isDebugMode } from '@/shared/utils/env';
import { segmentTableTemplate } from '../../components/segment-table.js';
import { useUiStore } from '@/state/uiStore';

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

const getPeriodTimingInfo = (period, manifest) => {
    let durationInfo = '';
    if (period.duration) {
        durationInfo = `, Duration: ${period.duration.toFixed(2)}s`;
    }

    let relativeTimeInfo = '';
    if (manifest.type === 'dynamic' && manifest.availabilityStartTime) {
        const liveEdge =
            (Date.now() - manifest.availabilityStartTime.getTime()) / 1000;
        const relativeStart = period.start - liveEdge;
        const absRelativeStart = Math.abs(relativeStart);
        const hours = Math.floor(absRelativeStart / 3600);
        const minutes = Math.floor((absRelativeStart % 3600) / 60);
        const seconds = Math.floor(absRelativeStart % 60);

        let formattedRelativeTime = '';
        if (hours > 0) formattedRelativeTime += `${hours}h `;
        if (minutes > 0) formattedRelativeTime += `${minutes}m `;
        formattedRelativeTime += `${seconds}s`;

        if (relativeStart > 0) {
            relativeTimeInfo = `, Starts in: ${formattedRelativeTime}`;
        } else {
            relativeTimeInfo = `, Started ${formattedRelativeTime} ago`;
        }
    }

    return `${durationInfo}${relativeTimeInfo}`;
};

/**
 * Creates the lit-html template for the DASH segment explorer content for a specific content type.
 * @param {import('@/types.ts').Stream} stream
 * @param {string} contentType - The content type to display ('video', 'audio', 'text').
 * @returns {import('lit-html').TemplateResult}
 */
export function getDashExplorerForType(stream, contentType) {
    if (!stream.manifest || !stream.manifest.periods) {
        return html`<p class="text-gray-400">
            No periods found in the manifest.
        </p>`;
    }

    const { segmentExplorerSortOrder, segmentExplorerTimeFilter } =
        useUiStore.getState();

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
                                >(Start:
                                ${period.start.toFixed(
                                    2
                                )}s${getPeriodTimingInfo(
                                    period,
                                    stream.manifest
                                )})</span
                            >
                        </h3>
                        <div class="space-y-4 mt-2">
                            ${period.adaptationSets
                                .filter(
                                    (as) =>
                                        as.contentType === contentType &&
                                        as.representations.length > 0
                                )
                                .map(
                                    (as) => html`
                                        <div class="pl-4">
                                            <h4
                                                class="text-md font-semibold text-gray-400"
                                            >
                                                AdaptationSet
                                                ${as.id ? `(ID: ${as.id})` : ''}
                                                (${as.lang || 'N/A'})
                                            </h4>
                                            ${as.representations.map((rep) => {
                                                const compositeKey = `${
                                                    period.id || index
                                                }-${rep.id}`;
                                                const repState =
                                                    stream.dashRepresentationState.get(
                                                        compositeKey
                                                    );

                                                if (!repState) {
                                                    return html`<div
                                                        class="text-red-400 p-2"
                                                    >
                                                        State not found for
                                                        Representation
                                                        ${rep.id}.
                                                    </div>`;
                                                }

                                                const {
                                                    segments,
                                                    freshSegmentUrls,
                                                    diagnostics,
                                                } = repState;
                                                const title = `Representation: ${
                                                    rep.id
                                                } <span class="ml-3 text-xs text-gray-400 font-mono">(${(
                                                    rep.bandwidth / 1000
                                                ).toFixed(0)} kbps)</span>`;

                                                let processedSegments = [
                                                    ...segments,
                                                ];

                                                if (
                                                    segmentExplorerTimeFilter.start ||
                                                    segmentExplorerTimeFilter.end
                                                ) {
                                                    processedSegments =
                                                        processedSegments.filter(
                                                            (seg) => {
                                                                if (
                                                                    !seg.startTimeUTC ||
                                                                    seg.type ===
                                                                        'Init'
                                                                )
                                                                    return true; // Always include Init segments
                                                                const segStartTime =
                                                                    new Date(
                                                                        seg.startTimeUTC
                                                                    );
                                                                const segEndTime =
                                                                    seg.endTimeUTC
                                                                        ? new Date(
                                                                              seg.endTimeUTC
                                                                          )
                                                                        : segStartTime;
                                                                const filterStart =
                                                                    segmentExplorerTimeFilter.start;
                                                                const filterEnd =
                                                                    segmentExplorerTimeFilter.end;

                                                                const startsAfterFilterStart =
                                                                    !filterStart ||
                                                                    segEndTime >=
                                                                        filterStart;
                                                                const endsBeforeFilterEnd =
                                                                    !filterEnd ||
                                                                    segStartTime <=
                                                                        filterEnd;

                                                                return (
                                                                    startsAfterFilterStart &&
                                                                    endsBeforeFilterEnd
                                                                );
                                                            }
                                                        );
                                                }

                                                processedSegments.sort(
                                                    (a, b) => {
                                                        const order =
                                                            segmentExplorerSortOrder ===
                                                            'asc'
                                                                ? 1
                                                                : -1;
                                                        if (a.type === 'Init')
                                                            return -1;
                                                        if (b.type === 'Init')
                                                            return 1;
                                                        return (
                                                            (a.number -
                                                                b.number) *
                                                            order
                                                        );
                                                    }
                                                );

                                                return html`
                                                    ${isDebugMode &&
                                                    stream.manifest.type ===
                                                        'dynamic'
                                                        ? diagnosticsTemplate(
                                                              diagnostics
                                                          )
                                                        : ''}
                                                    ${segmentTableTemplate({
                                                        id: compositeKey,
                                                        title: title,
                                                        segments:
                                                            processedSegments,
                                                        stream: stream,
                                                        freshSegmentUrls:
                                                            freshSegmentUrls,
                                                        segmentFormat:
                                                            stream.manifest
                                                                .segmentFormat,
                                                    })}
                                                `;
                                            })}
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