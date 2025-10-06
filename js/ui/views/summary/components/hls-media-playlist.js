import { html } from 'lit-html';
import { statCardTemplate } from './shared.js';

export const hlsMediaPlaylistTemplate = (summary) => {
    const mediaPlaylistDetails = summary.hls?.mediaPlaylistDetails;

    if (!mediaPlaylistDetails) {
        return '';
    }

    return html`
        <div>
            <h3 class="text-xl font-bold mb-4">Media Playlist Details</h3>
            <dl
                class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
            >
                ${statCardTemplate(
                    'Segment Count',
                    mediaPlaylistDetails.segmentCount,
                    'Total number of media segments in this playlist.',
                    'HLS: 4.3.2.1'
                )}
                ${statCardTemplate(
                    'Avg. Segment Duration',
                    mediaPlaylistDetails.averageSegmentDuration?.toFixed(2) +
                        's',
                    'The average duration of all segments.',
                    'HLS: 4.3.2.1'
                )}
                ${statCardTemplate(
                    'Discontinuities Present',
                    mediaPlaylistDetails.hasDiscontinuity ? 'Yes' : 'No',
                    'Indicates if the playlist contains discontinuity tags, often used for ad insertion.',
                    'HLS: 4.3.2.3'
                )}
                ${statCardTemplate(
                    'I-Frame Only',
                    mediaPlaylistDetails.isIFrameOnly ? 'Yes' : 'No',
                    'Indicates if all segments in this playlist are I-Frame only.',
                    'HLS: 4.3.3.6'
                )}
            </dl>
        </div>
    `;
};