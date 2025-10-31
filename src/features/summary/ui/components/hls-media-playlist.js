import { html } from 'lit-html';
import { statCardTemplate } from './shared.js';

export const hlsMediaPlaylistTemplate = (summary) => {
    const mediaPlaylistDetails = summary.hls?.mediaPlaylistDetails;

    if (!mediaPlaylistDetails) {
        return '';
    }

    return html`
        <div>
            <h3 class="text-xl font-bold mb-4 text-slate-100">Media Playlist Details</h3>
            <dl
                class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
            >
                ${statCardTemplate({
                    label: 'Segment Count',
                    value: mediaPlaylistDetails.segmentCount,
                    tooltip: 'Total number of media segments in this playlist.',
                    isoRef: 'HLS: 4.3.2.1',
                })}
                ${statCardTemplate({
                    label: 'Avg. Segment Duration',
                    value: mediaPlaylistDetails.averageSegmentDuration?.toFixed(2) +
                        's',
                    tooltip: 'The average duration of all segments.',
                    isoRef: 'HLS: 4.3.2.1',
                })}
                ${statCardTemplate({
                    label: 'Discontinuities Present',
                    value: mediaPlaylistDetails.hasDiscontinuity ? 'Yes' : 'No',
                    tooltip: 'Indicates if the playlist contains discontinuity tags, often used for ad insertion.',
                    isoRef: 'HLS: 4.3.2.3',
                })}
                ${statCardTemplate({
                    label: 'I-Frame Only',
                    value: mediaPlaylistDetails.isIFrameOnly ? 'Yes' : 'No',
                    tooltip: 'Indicates if all segments in this playlist are I-Frame only.',
                    isoRef: 'HLS: 4.3.3.6',
                })}
            </dl>
        </div>
    `;
};