import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

const formatTooltip = (tooltip) => {
    if (!tooltip || !tooltip.text) return '';
    return `
        <div class="text-left">
            <p class="font-bold text-slate-100">${tooltip.text}</p>
            ${
                tooltip.details
                    ? `<p class="text-xs text-slate-400 mt-1">${tooltip.details}</p>`
                    : ''
            }
        </div>
    `;
};

const statCard = ({
    title,
    value,
    unit = '',
    colorClass = 'text-white',
    tooltip,
}) => {
    if (value === null || value === undefined) return '';

    const tooltipContent = formatTooltip(tooltip);

    return html`
        <div class="bg-slate-800 p-3 rounded-lg">
            <h5
                class="text-xs font-semibold text-slate-400 truncate flex items-center gap-1.5"
            >
                <span>${title}</span>
                ${tooltipContent
                    ? html`<span
                          class="${tooltipTriggerClasses}"
                          data-tooltip-html-b64="${btoa(tooltipContent)}"
                          >${icons.informationCircle}</span
                      >`
                    : ''}
            </h5>
            <p class="text-xl lg:text-2xl font-bold font-mono ${colorClass}">
                ${value}
                <span class="text-base text-slate-400">${unit}</span>
            </p>
        </div>
    `;
};

const statSection = (title, content) => html`
    <section>
        <h4
            class="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2"
        >
            ${title}
        </h4>
        <div class="grid grid-cols-2 gap-3">${content}</div>
    </section>
`;

export const statsCardsTemplate = (stats) => {
    if (!stats) {
        return html`<div class="text-sm text-slate-500">
            Awaiting player statistics...
        </div>`;
    }

    const { playbackQuality, abr, buffer, session, manifestTime } = stats;

    const sessionContent = html`
        ${statCard({
            title: 'Playhead Time',
            value: stats.playheadTime.toFixed(2),
            unit: 's',
            tooltip: {
                text: 'Current Playback Position',
                details:
                    'The current time of the playhead on the media timeline.',
            },
        })}
        ${statCard({
            title: 'Total Play Time',
            value: session.totalPlayTime.toFixed(2),
            unit: 's',
            tooltip: {
                text: 'Total Accumulated Playback Time',
                details:
                    'The total time spent in a playing state, excluding time spent paused or buffering. Useful for user engagement metrics.',
            },
        })}
        ${statCard({
            title: 'Total Buffering',
            value: session.totalBufferingTime.toFixed(2),
            unit: 's',
            tooltip: {
                text: 'Total Accumulated Buffering Time',
                details:
                    'The total time the player has spent in a buffering state after playback has started. A key indicator of Quality of Experience (QoE).',
            },
        })}
        ${statCard({
            title: 'Manifest Duration',
            value: manifestTime.toFixed(2),
            unit: 's',
            tooltip: {
                text: 'Total Duration of the Media',
                details:
                    'For VOD, this is the total content duration. For Live, this represents the size of the current DVR window.',
            },
        })}
    `;

    const playbackQualityContent = html`
        ${statCard({
            title: 'Resolution',
            value: playbackQuality.resolution,
            tooltip: {
                text: 'Current Video Resolution',
                details:
                    'The width and height of the video frames currently being rendered.',
            },
        })}
        ${statCard({
            title: 'Decoded Frames',
            value: playbackQuality.decodedFrames,
            tooltip: {
                text: 'Total Decoded Frames',
                details:
                    'The total number of video frames decoded by the browser. Use this to monitor decoding performance.',
            },
        })}
        ${statCard({
            title: 'Corrupted Frames',
            value: playbackQuality.corruptedFrames,
            colorClass:
                playbackQuality.corruptedFrames > 0
                    ? 'text-red-400'
                    : 'text-white',
            tooltip: {
                text: 'Frames That Failed to Decode',
                details:
                    'The number of frames that could not be decoded correctly, often indicating issues with the encoded content itself.',
            },
        })}
        ${statCard({
            title: 'TTFF',
            value: playbackQuality.timeToFirstFrame.toFixed(0),
            unit: 'ms',
            tooltip: {
                text: 'Time To First Frame',
                details:
                    'The time elapsed from when the player started loading the media to when the very first frame was rendered. A critical startup performance metric.',
            },
        })}
        ${statCard({
            title: 'Stalls',
            value: playbackQuality.totalStalls,
            colorClass:
                playbackQuality.totalStalls > 0 ? 'text-red-400' : 'text-white',
            tooltip: {
                text: 'Total Rebuffering Events',
                details:
                    'The total number of times playback stopped to buffer more content after the initial startup. A critical QoE metric.',
            },
        })}
        ${statCard({
            title: 'Stall Duration',
            value: playbackQuality.totalStallDuration.toFixed(2),
            unit: 's',
            colorClass:
                playbackQuality.totalStallDuration > 0
                    ? 'text-red-400'
                    : 'text-white',
            tooltip: {
                text: 'Total Rebuffering Duration',
                details:
                    'The total cumulative time, in seconds, that the player has spent in a stalled (rebuffering) state.',
            },
        })}
    `;

    const abrContent = html`
        ${statCard({
            title: 'Video Bitrate',
            value: formatBitrate(abr.currentVideoBitrate),
            tooltip: {
                text: 'Current Video Representation Bitrate',
                details:
                    "The bitrate of the video track currently being played, as defined in the manifest. This reflects the player's ABR selection.",
            },
        })}
        ${statCard({
            title: 'Est. Bandwidth',
            value: formatBitrate(abr.estimatedBandwidth),
            tooltip: {
                text: 'Player-Estimated Network Bandwidth',
                details:
                    "The player's real-time estimate of the available network bandwidth. This is the primary input for ABR decision-making.",
            },
        })}
        ${statCard({
            title: 'Load Latency',
            value: (abr.loadLatency * 1000).toFixed(0),
            unit: 'ms',
            tooltip: {
                text: 'Segment Load Latency',
                details:
                    'The time taken to download the most recent segment. High load latency compared to segment duration can lead to buffering.',
            },
        })}
        ${statCard({
            title: 'Switches (Up/Down)',
            value: `${abr.switchesUp} / ${abr.switchesDown}`,
            tooltip: {
                text: 'Adaptive Bitrate Switches',
                details:
                    'The count of quality upgrades (Up) and downgrades (Down) performed by the ABR algorithm.',
            },
        })}
    `;

    const isLive = buffer.label === 'Live Latency';
    const forwardBufferColorClass =
        buffer.forwardBuffer < 5
            ? 'text-red-400'
            : buffer.forwardBuffer < 15
              ? 'text-yellow-400'
              : 'text-green-400';
    const latencyColorClass =
        buffer.seconds < 5
            ? 'text-red-400'
            : buffer.seconds < 15
              ? 'text-yellow-400'
              : 'text-green-400';

    const bufferContent = html`
        ${isLive
            ? statCard({
                  title: 'Live Latency',
                  value: buffer.seconds.toFixed(2),
                  unit: 's',
                  colorClass: latencyColorClass,
                  tooltip: {
                      text: 'Latency from Live Edge',
                      details:
                          'The time difference between the playhead and the live edge of the broadcast. Lower values are better for low-latency streaming.',
                  },
              })
            : ''}
        ${statCard({
            title: 'Forward Buffer',
            value: buffer.forwardBuffer.toFixed(2),
            unit: 's',
            colorClass: forwardBufferColorClass,
            tooltip: {
                text: 'Forward Buffer Duration',
                details:
                    'The amount of playable media, in seconds, currently buffered ahead of the playhead. A healthy buffer prevents stalls.',
            },
        })}
        ${statCard({
            title: 'Buffer Gaps',
            value: buffer.totalGaps,
            colorClass: buffer.totalGaps > 0 ? 'text-yellow-400' : 'text-white',
            tooltip: {
                text: 'Gaps Detected in Buffer',
                details:
                    'The number of times the player has detected a gap (missing time range) in the media buffer. This can indicate issues with segment alignment or manifest generation.',
            },
        })}
    `;

    return html`
        <div class="space-y-6">
            ${statSection('Session & Timing', sessionContent)}
            ${statSection('Playback Quality', playbackQualityContent)}
            ${statSection('ABR & Network', abrContent)}
            ${statSection('Buffer & Latency', bufferContent)}
        </div>
    `;
};
