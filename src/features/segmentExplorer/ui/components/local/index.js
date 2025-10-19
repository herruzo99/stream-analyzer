import { html } from 'lit-html';
import { segmentTableTemplate } from '../../components/segment-table.js';
import { useUiStore } from '@/state/uiStore';

/**
 * Renders the segment explorer view for locally uploaded files.
 * @param {import('@/types.ts').Stream} stream
 * @returns {import('lit-html').TemplateResult}
 */
export function getLocalExplorerForType(stream) {
    const { segmentExplorerSortOrder } = useUiStore.getState();
    const repState = stream.dashRepresentationState.get('0-local-rep');

    if (!repState || !repState.segments || repState.segments.length === 0) {
        return html`<p class="text-gray-400">No segments were parsed.</p>`;
    }

    const { segments, freshSegmentUrls } = repState;
    const title = 'Uploaded Segments';

    // The segment objects have been adapted to fit the segmentTableTemplate's expectations
    const adaptedSegments = segments.map((s) => {
        /** @type {import('@/types.ts').MediaSegment} */
        const typedSegment = s;
        return {
            ...typedSegment,
            // The parsed data is now nested, so we need to check its format
            resolvedUrl: typedSegment.template, // Use original filename as URL
            format: typedSegment.parsedData.format,
        };
    });

    adaptedSegments.sort((a, b) => {
        const order = segmentExplorerSortOrder === 'asc' ? 1 : -1;
        return (a.number - b.number) * order;
    });

    return html`
        <div class="space-y-6">
            ${segmentTableTemplate({
                id: 'local-segments',
                title: title,
                segments: adaptedSegments,
                stream: stream,
                freshSegmentUrls: freshSegmentUrls,
                segmentFormat: stream.manifest.segmentFormat,
            })}
        </div>
    `;
}