import { createInfoTooltip } from '../ui.js';
import { analysisState } from '../state.js';
import { getDrmSystemName } from '../helpers/drm-helper.js';

const createRow = (label, value, tooltipText, isoRef) => {
    if (value === null || value === undefined || value === '') return '';
    return `<div class="py-2 flex justify-between border-b border-gray-700 items-center flex-wrap">
                <dt class="text-sm font-medium text-gray-400">${label}${createInfoTooltip(tooltipText, isoRef)}</dt>
                <dd class="text-sm text-right font-mono text-white">${value}</dd>
            </div>`;
};

const formatBitrate = (bps) => {
    if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
    return `${(bps / 1000).toFixed(0)} kbps`;
};

export function getGlobalSummaryHTML(mpd, isComparison = false) {
    if (isComparison) {
        const streams = analysisState.streams;
        const headers = streams.map((s) => `<th data-label="Stream">${s.name}</th>`).join('');
        const getRow = (label, accessor) => {
            let cells = streams.map((s) => `<td data-label="${s.name}">${accessor(s.mpd)}</td>`).join('');
            return `<tr><td data-label="Property" class="prop-col">${label}</td>${cells}</tr>`;
        };

        const getDrmSystems = (m) => {
            const schemes = [...new Set(Array.from(m.querySelectorAll('ContentProtection')).map(cp => getDrmSystemName(cp.getAttribute('schemeIdUri'))))];
            return schemes.length > 0 ? `Yes (${schemes.join(', ')})` : 'No';
        };

        return `<h3 class="text-xl font-bold mb-4">Global Summary Comparison</h3>
                <div class="overflow-x-auto">
                   <table class="comparison-table w-full">
                        <thead><tr><th class="prop-col">Property</th>${headers}</tr></thead>
                        <tbody>
                            ${getRow('Presentation Type', (m) => m.getAttribute('type'))}
                            ${getRow('Profiles', (m) => (m.getAttribute('profiles') || '').replace(/urn:mpeg:dash:profile:/g, ' ').trim())}
                            ${getRow('Live Window', (m) => (m.getAttribute('type') === 'dynamic' ? m.getAttribute('timeShiftBufferDepth') || 'N/A' : 'N/A'))}
                            ${getRow('# of Periods', (m) => m.querySelectorAll('Period').length)}
                            ${getRow('Content Protection', getDrmSystems)}
                        </tbody>
                   </table>
                </div>`;
    }

    if (!mpd) return '<p>No MPD data to display.</p>';

    let html = '<h3 class="text-xl font-bold mb-4">Manifest Properties</h3><dl>';
    const getAttr = (el, attr, defaultVal = 'N/A') => el.getAttribute(attr) || defaultVal;
    
    html += createRow('Presentation Type', getAttr(mpd, 'type'), 'Defines if the stream is live (`dynamic`) or on-demand (`static`).', 'Clause 5.3.1.2, Table 3');
    html += createRow('Profiles', getAttr(mpd, 'profiles').replace(/urn:mpeg:dash:profile:/g, ' '), 'Indicates the set of features used in the manifest.', 'Clause 8.1');
    html += createRow('Min Buffer Time', getAttr(mpd, 'minBufferTime'), 'The minimum buffer time a client should maintain to ensure smooth playback.', 'Clause 5.3.1.2, Table 3');

    if (getAttr(mpd, 'type') === 'dynamic') {
        html += createRow('Publish Time', new Date(getAttr(mpd, 'publishTime')).toLocaleString(), 'The time this version of the MPD was generated on the server.', 'Clause 5.3.1.2, Table 3');
        html += createRow('Availability Start Time', new Date(getAttr(mpd, 'availabilityStartTime')).toLocaleString(), 'The anchor time for all media segments in the presentation.', 'Clause 5.3.1.2, Table 3');
        html += createRow('Update Period', getAttr(mpd, 'minimumUpdatePeriod'), 'How often a client should check for a new version of the MPD.', 'Clause 5.3.1.2, Table 3');
        html += createRow('Time Shift Buffer Depth', getAttr(mpd, 'timeShiftBufferDepth'), 'The duration of the seekable live window available to the client.', 'Clause 5.3.1.2, Table 3');
        html += createRow('Suggested Presentation Delay', getAttr(mpd, 'suggestedPresentationDelay'), 'A suggested delay from the live edge for players to begin presentation.', 'Clause 5.3.1.2, Table 3');
    } else {
        html += createRow('Media Duration', getAttr(mpd, 'mediaPresentationDuration'), 'The total duration of the on-demand content.', 'Clause 5.3.1.2, Table 3');
    }
    html += '</dl>';

    html += '<h3 class="text-xl font-bold mt-6 mb-4">Content Overview</h3>';
    
    const videoSets = Array.from(mpd.querySelectorAll('AdaptationSet[contentType="video"], AdaptationSet[mimeType^="video"]'));
    const audioSets = Array.from(mpd.querySelectorAll('AdaptationSet[contentType="audio"], AdaptationSet[mimeType^="audio"]'));
    const textSets = Array.from(mpd.querySelectorAll('AdaptationSet[contentType="text"], AdaptationSet[contentType="application"], AdaptationSet[mimeType^="text"], AdaptationSet[mimeType^="application"]'));
    const protectionSchemes = [...new Set(Array.from(mpd.querySelectorAll('ContentProtection')).map(cp => getDrmSystemName(cp.getAttribute('schemeIdUri'))))];
    const protectionText = protectionSchemes.length > 0 ? `Yes (${protectionSchemes.join(', ')})` : 'No';
    const protectionTooltip = protectionSchemes.length > 0 ? `DRM Systems Detected: ${protectionSchemes.join(', ')}` : 'No encryption descriptors were found.';

    html += '<dl>';
    html += createRow('Periods', mpd.querySelectorAll('Period').length, 'A Period represents a segment of content.', 'Clause 5.3.2');
    html += createRow('Video Tracks', videoSets.length, 'Number of distinct video Adaptation Sets.', 'Clause 5.3.3');
    html += createRow('Audio Tracks', audioSets.length, 'Number of distinct audio Adaptation Sets.', 'Clause 5.3.3');
    html += createRow('Subtitle/Text Tracks', textSets.length, 'Number of distinct subtitle or text Adaptation Sets.', 'Clause 5.3.3');
    html += createRow('Content Protection', protectionText, protectionTooltip, 'Clause 5.8.4.1');
    html += '</dl>';
    
    if (videoSets.length > 0) {
        html += '<h3 class="text-xl font-bold mt-6 mb-4">Video Details</h3><dl>';
        const allVideoReps = videoSets.flatMap(as => Array.from(as.querySelectorAll('Representation')));
        const bandwidths = allVideoReps.map(r => parseInt(r.getAttribute('bandwidth'))).filter(Boolean);
        
        // ** RESOLUTION FIX IS HERE **
        const resolutions = [...new Set(allVideoReps.map(r => {
            const as = r.closest('AdaptationSet');
            const width = r.getAttribute('width') || as.getAttribute('width');
            const height = r.getAttribute('height') || as.getAttribute('height');
            return `${width}x${height}`;
        }))];

        const codecs = [...new Set(allVideoReps.map(r => r.getAttribute('codecs') || r.closest('AdaptationSet').getAttribute('codecs')))].filter(Boolean);
        
        if (bandwidths.length > 0) {
             html += createRow('Bitrate Range', `${formatBitrate(Math.min(...bandwidths))} - ${formatBitrate(Math.max(...bandwidths))}`, 'The minimum and maximum bitrates available for video.', 'Clause 5.3.5.2, Table 9');
        }
        html += createRow('Resolutions', resolutions.join(', '), 'Unique video resolutions available.', 'Clause 5.3.7.2, Table 14');
        html += createRow('Video Codecs', codecs.join(', '), 'Unique video codecs declared in the manifest.', 'Clause 5.3.7.2, Table 14');
        html += '</dl>';
    }

    if (audioSets.length > 0) {
        html += '<h3 class="text-xl font-bold mt-6 mb-4">Audio Details</h3><dl>';
        const languages = [...new Set(audioSets.map(as => as.getAttribute('lang')))].filter(Boolean);
        const allAudioReps = audioSets.flatMap(as => Array.from(as.querySelectorAll('Representation')));
        const codecs = [...new Set(allAudioReps.map(r => r.getAttribute('codecs') || r.closest('AdaptationSet').getAttribute('codecs')))].filter(Boolean);
        const channelConfigs = [...new Set(audioSets.map(as => as.querySelector('AudioChannelConfiguration')?.getAttribute('value')))].filter(Boolean);
        
        html += createRow('Languages', languages.join(', ') || 'Not Specified', 'Languages declared for audio tracks.', 'Clause 5.3.3.2, Table 5');
        html += createRow('Audio Codecs', codecs.join(', '), 'Unique audio codecs declared in the manifest.', 'Clause 5.3.7.2, Table 14');
        if (channelConfigs.length > 0) {
            html += createRow('Channel Configurations', channelConfigs.map(c => `${c} channels`).join(', '), 'Audio channel layouts (e.g., 2 for stereo, 6 for 5.1).', 'Clause 5.8.5.4');
        }
        html += '</dl>';
    }

    html += `<div class="dev-watermark">Summary v2.1</div>`;
    return html;
}