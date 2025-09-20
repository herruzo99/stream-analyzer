import { html } from 'lit-html';
import { analysisState } from '../../core/state.js';
import { getInteractiveIsobmffTemplate } from './isobmff-view.js';
import { getInteractiveTsTemplate } from './ts-view.js';

function getSegmentMimeType(activeStream, segmentUrl) {
    if (!activeStream) return 'video/mp4'; // Default guess

    if (activeStream.protocol === 'hls') {
        return activeStream.manifest.rawElement.map ? 'video/mp4' : 'video/mp2t';
    } else {
        // Find the representation for this segment
        for (const p of activeStream.manifest.periods) {
            for (const as of p.adaptationSets) {
                for (const rep of as.representations) {
                    // This is a simplification; a real implementation would need to
                    // parse segment templates to map URL back to a rep.
                    // For now, we assume the first rep's mimeType is representative.
                    return as.mimeType;
                }
            }
        }
    }
    return 'video/mp4';
}


export function getInteractiveSegmentTemplate() {
    const { activeSegmentUrl, segmentCache, activeStreamId, streams } =
        analysisState;

    if (!activeSegmentUrl) {
        return html`
            <div class="text-center py-12">
                <div class="text-gray-400 text-lg mb-4">
                    📄 Interactive Segment View
                </div>
                <p class="text-gray-500">
                    Select a segment from the "Segment Explorer" tab and click
                    "View Raw" to inspect its content here.
                </p>
            </div>
        `;
    }

    const cachedSegment = segmentCache.get(activeSegmentUrl);

    if (!cachedSegment || cachedSegment.status === -1) {
        return html`
            <div class="text-center py-12">
                <div
                    class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
                ></div>
                <p class="text-gray-400">Loading and parsing segment data...</p>
            </div>
        `;
    }

    if (cachedSegment.status !== 200 || !cachedSegment.data) {
        return html`
            <div class="text-center py-12">
                <div class="text-red-400 text-lg mb-2">❌ Failed to Load</div>
                <p class="text-gray-400">
                    Failed to fetch segment. Status:
                    ${cachedSegment.status || 'Network Error'}.
                </p>
            </div>
        `;
    }

    const activeStream = streams.find(s => s.id === activeStreamId);
    const mimeType = getSegmentMimeType(activeStream, activeSegmentUrl);

    let contentTemplate;
    if (mimeType === 'video/mp2t') {
        contentTemplate = getInteractiveTsTemplate();
    } else {
        // Default to ISOBMFF view for video/mp4, audio/mp4, etc.
        contentTemplate = getInteractiveIsobmffTemplate();
    }

    return html`
        <div class="mb-6">
            <h3 class="text-xl font-bold mb-2 text-white">
                🔍 Interactive Segment View
            </h3>
            <p
                class="text-sm text-gray-400 mb-4 font-mono break-all bg-gray-800 p-2 rounded"
            >
                ${activeSegmentUrl}
            </p>
        </div>
        ${contentTemplate}
    `;
}