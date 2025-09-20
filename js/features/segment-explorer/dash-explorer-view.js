import { html, render } from 'lit-html';
import { segmentRowTemplate } from './segment-row.js';

const parseDuration = (durationStr) => {
    if (!durationStr) return 0;
    const match = durationStr.match(/PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/);
    if (!match) return 0;
    const hours = parseFloat(match[1] || '0');
    const minutes = parseFloat(match[2] || '0');
    const seconds = parseFloat(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
};

const getDashSegmentLivenessState = (segment, manifestElement) => {
    if (manifestElement.getAttribute('type') !== 'dynamic') {
        return 'default';
    }
    const publishTime = new Date(manifestElement.getAttribute('publishTime')).getTime();
    const suggestedPresentationDelay = parseDuration(manifestElement.getAttribute('suggestedPresentationDelay') || 'PT0S');
    if (!publishTime) {
        return 'default';
    }

    // This is a simplified calculation. A full implementation would need to factor in availabilityStartTime.
    const liveEdgeSeconds = (publishTime / 1000) - suggestedPresentationDelay;
    const segmentStartSeconds = segment.time / segment.timescale;
    const segmentEndSeconds = (segment.time + segment.duration) / segment.timescale;

    if (liveEdgeSeconds >= segmentStartSeconds && liveEdgeSeconds < segmentEndSeconds) {
        return 'live';
    }
    return 'default';
};

const dashSegmentTableTemplate = (rep, segmentsToRender, manifestElement) => {
    const repId = rep.getAttribute('id');
    const bandwidth = parseInt(rep.getAttribute('bandwidth'));
    return html`<div class="bg-gray-800 rounded-lg border border-gray-700">
        <div class="flex items-center p-2 bg-gray-900/50 border-b border-gray-700">
             <div class="flex-grow flex items-center">
                <span class="font-semibold text-gray-200">Representation: ${repId}</span>
                <span class="ml-3 text-xs text-gray-400 font-mono">(${(bandwidth / 1000).toFixed(0)} kbps)</span>
             </div>
        </div>
        <div class="overflow-y-auto" style="max-height: calc(2.5rem * 15);">
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
                    ${segmentsToRender.map(seg => segmentRowTemplate(seg, true, getDashSegmentLivenessState(seg, manifestElement)))}
                </tbody>
            </table>
        </div>
    </div>`;
};

export function renderDashExplorer(stream, allSegmentsByRep, pageSize, mode) {
    const contentArea = document.getElementById('segment-explorer-content');
    if (!contentArea) return;

    const segmentsToRenderByRep = {};
    Object.keys(allSegmentsByRep).forEach((repId) => {
        const segments = allSegmentsByRep[repId];
        segmentsToRenderByRep[repId] = mode === 'first' ? segments.slice(0, pageSize) : segments.slice(-pageSize);
    });

    const tables = Array.from(/** @type {Element} */ (stream.manifest.rawElement).querySelectorAll('Representation')).map((rep) => {
        const repId = rep.getAttribute('id');
        return dashSegmentTableTemplate(rep, segmentsToRenderByRep[repId] || [], stream.manifest.rawElement);
    });

    render(html`<div class="space-y-4">${tables}</div>`, contentArea);
}