import { dom, analysisState } from '../state.js';
import { createInfoTooltip } from '../ui.js';
import { getDrmSystemName } from '../helpers/drm-helper.js';

const formatBitrate = (bps) => {
    if (!bps || isNaN(bps)) return 'N/A';
    if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
    return `${(bps / 1000).toFixed(0)} kbps`;
};

/**
 * Renders the new, detailed comparison view.
 */
export function renderComparisonTab() {
    const streams = analysisState.streams;
    if (streams.length < 2) {
        dom.tabContents.comparison.innerHTML = '';
        return;
    }

    // Define the structure of our comparison view
    const sections = {
        "Manifest Properties": [
            { label: "Type", tooltip: "static vs dynamic", iso: "Clause 5.3.1.2", accessor: (mpd) => mpd.getAttribute('type') },
            { label: "Profiles", tooltip: "Declared feature sets", iso: "Clause 8.1", accessor: (mpd) => (mpd.getAttribute('profiles') || '').replace(/urn:mpeg:dash:profile:/g, ' ').trim() },
            { label: "Min Buffer Time", tooltip: "Minimum client buffer time.", iso: "Clause 5.3.1.2", accessor: (mpd) => mpd.getAttribute('minBufferTime') || 'N/A' },
            { label: "Live Window", tooltip: "DVR window for live streams.", iso: "Clause 5.3.1.2", accessor: (mpd) => mpd.getAttribute('timeShiftBufferDepth') || 'N/A' }
        ],
        "Content Overview": [
            { label: "# of Periods", tooltip: "Number of content periods.", iso: "Clause 5.3.2", accessor: (mpd) => mpd.querySelectorAll('Period').length },
            { label: "Content Protection", tooltip: "Detected DRM systems.", iso: "Clause 5.8.4.1", accessor: (mpd) => {
                const schemes = [...new Set(Array.from(mpd.querySelectorAll('ContentProtection')).map(cp => getDrmSystemName(cp.getAttribute('schemeIdUri'))))];
                return schemes.length > 0 ? schemes.join(', ') : 'No';
            }}
        ],
        "Video Details": [
            { label: "# Video Reps", tooltip: "Total number of video quality levels.", iso: "Clause 5.3.5", accessor: (mpd) => mpd.querySelectorAll('AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation').length },
            { label: "Video Bitrates", tooltip: "Min and Max bandwidth values for video.", iso: "Table 9", accessor: (mpd) => {
                const b = Array.from(mpd.querySelectorAll('AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation')).map((r) => parseInt(r.getAttribute('bandwidth')));
                return b.length ? `${formatBitrate(Math.min(...b))} - ${formatBitrate(Math.max(...b))}` : 'N/A';
            }},
            { label: "Video Resolutions", tooltip: "List of unique video resolutions.", iso: "Table 14", accessor: (mpd) => {
                const res = [...new Set(Array.from(mpd.querySelectorAll('AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation')).map((r) => {
                    const as = r.closest('AdaptationSet');
                    const width = r.getAttribute('width') || as.getAttribute('width');
                    const height = r.getAttribute('height') || as.getAttribute('height');
                    return `${width}x${height}`;
                }))];
                return res.join('<br>') || 'N/A';
            }},
            { label: "Video Codecs", tooltip: "Unique video codecs.", iso: "Table 14", accessor: (mpd) => {
                const codecs = [...new Set(Array.from(mpd.querySelectorAll('AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation')).map(r => r.getAttribute('codecs') || r.closest('AdaptationSet').getAttribute('codecs')))];
                return codecs.filter(Boolean).join('<br>') || 'N/A';
            }}
        ],
        "Audio Details": [
            { label: "# Audio Tracks", tooltip: "Groups of audio tracks, often by language.", iso: "Clause 5.3.3", accessor: (mpd) => mpd.querySelectorAll('AdaptationSet[contentType="audio"], AdaptationSet[mimeType^="audio"]').length },
            { label: "Audio Languages", tooltip: "Declared languages for audio tracks.", iso: "Table 5", accessor: (mpd) => {
                const langs = [...new Set(Array.from(mpd.querySelectorAll('AdaptationSet[contentType="audio"], AdaptationSet[mimeType^="audio"]')).map((as) => as.getAttribute('lang')))];
                return langs.filter(Boolean).join(', ') || 'N/A';
            }},
             { label: "Audio Codecs", tooltip: "Unique audio codecs.", iso: "Table 14", accessor: (mpd) => {
                const codecs = [...new Set(Array.from(mpd.querySelectorAll('AdaptationSet[contentType="audio"] Representation, AdaptationSet[mimeType^="audio"] Representation')).map(r => r.getAttribute('codecs') || r.closest('AdaptationSet').getAttribute('codecs')))];
                return codecs.filter(Boolean).join('<br>') || 'N/A';
            }}
        ]
    };

    let html = '';
    for (const sectionTitle in sections) {
        html += `<h3 class="text-xl font-bold mt-6 mb-2">${sectionTitle}</h3><div class="grid comparison-grid-container" style="grid-template-columns: 200px repeat(${streams.length}, 1fr);">`;
        
        // Header row for this section
        html += `<div class="font-semibold text-gray-400 p-2 border-b border-gray-700">Property</div>`;
        streams.forEach(stream => {
            html += `<div class="font-semibold text-gray-400 p-2 border-b border-gray-700">${stream.name}</div>`;
        });

        // Data rows for this section
        sections[sectionTitle].forEach(item => {
            // Label column
            html += `<div class="prop-col p-2 border-b border-gray-700">${item.label}${createInfoTooltip(item.tooltip, item.iso)}</div>`;
            // Data columns
            streams.forEach(stream => {
                html += `<div class="p-2 border-b border-gray-700 font-mono text-sm">${item.accessor(stream.mpd)}</div>`;
            });
        });
        html += '</div>';
    }

    html += `<div class="dev-watermark">Comparison v4.0</div>`;
    dom.tabContents.comparison.innerHTML = html;
}