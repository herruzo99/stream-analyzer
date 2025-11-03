import { html } from 'lit-html';
import { segmentTableTemplate } from '../../components/segment-table.js';
import { useUiStore } from '@/state/uiStore';
import { findBoxRecursive } from '@/ui/shared/isobmff-renderer.js';

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

    const { segments, currentSegmentUrls, newlyAddedSegmentUrls } = repState;
    const title = 'Uploaded Segments';

    const adaptedSegments = segments.map((s) => {
        const typedSegment = /** @type {import('@/types.ts').MediaSegment} */ (
            s
        );
        return {
            ...typedSegment,
            resolvedUrl: typedSegment.template,
            format: typedSegment.parsedData.format,
        };
    });

    let contentType = 'unknown';
    const firstSegment = adaptedSegments[0];
    if (firstSegment?.parsedData) {
        const { data, format } = firstSegment.parsedData;
        if (format === 'isobmff') {
            if (findBoxRecursive(data.boxes, (b) => b.type === 'vmhd')) {
                contentType = 'video';
            } else if (findBoxRecursive(data.boxes, (b) => b.type === 'smhd')) {
                contentType = 'audio';
            } else if (findBoxRecursive(data.boxes, (b) => b.type === 'stpp')) {
                contentType = 'text';
            }
        } else if (format === 'ts') {
            const pmtPid = [...(data.summary.pmtPids || [])][0];
            const program = data.summary.programMap[pmtPid];
            if (program && program.streams) {
                const streamTypeHex = Object.values(program.streams)[0];
                const typeNum = parseInt(streamTypeHex, 16);
                const videoTypes = [0x01, 0x02, 0x1b, 0x24, 0x80];
                const audioTypes = [0x03, 0x04, 0x0f, 0x11, 0x81];
                if (videoTypes.includes(typeNum)) {
                    contentType = 'video';
                } else if (audioTypes.includes(typeNum)) {
                    contentType = 'audio';
                }
            }
        }
    }

    adaptedSegments.sort((a, b) => {
        const order = segmentExplorerSortOrder === 'asc' ? 1 : -1;
        return (a.number - b.number) * order;
    });

    return html`
        <div class="space-y-6">
            ${segmentTableTemplate({
                id: 'local-segments',
                rawId: 'local-segments',
                title: title,
                contentType: contentType,
                segments: adaptedSegments,
                stream: stream,
                currentSegmentUrls: currentSegmentUrls,
                newlyAddedSegmentUrls: newlyAddedSegmentUrls,
                segmentFormat: stream.manifest.segmentFormat,
            })}
        </div>
    `;
}
