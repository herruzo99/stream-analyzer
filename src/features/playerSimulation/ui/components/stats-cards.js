import { html } from 'lit-html';
import { formatBitrate } from '@/ui/shared/format';

const statCard = (
    title,
    value,
    unit = '',
    colorClass = 'text-white',
    tooltip = ''
) => {
    return html`
        <div class="bg-gray-800 p-3 rounded-lg" title=${tooltip}>
            <h5 class="text-xs font-semibold text-gray-400 truncate">
                ${title}
            </h5>
            <p class="text-xl lg:text-2xl font-bold font-mono ${colorClass}">
                ${value}
                <span class="text-base text-gray-400">${unit}</span>
            </p>
        </div>
    `;
};

const statSection = (title, content) => html`
    <section>
        <h4
            class="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2"
        >
            ${title}
        </h4>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            ${content}
        </div>
    </section>
`;

export const statsCardsTemplate = (stats) => {
    if (!stats) {
        return html`<div class="text-sm text-gray-500">
            Awaiting player statistics...
        </div>`;
    }

    const { playbackQuality, abr, buffer, session, manifestTime } = stats;

    const sessionContent = html`
        ${statCard('Playhead Time', stats.playheadTime.toFixed(2), 's')}
        ${statCard('Total Play Time', session.totalPlayTime.toFixed(2), 's')}
        ${statCard(
            'Total Buffering',
            session.totalBufferingTime.toFixed(2),
            's'
        )}
        ${statCard('Manifest Duration', manifestTime.toFixed(2), 's')}
    `;

    const playbackQualityContent = html`
        ${statCard('Resolution', playbackQuality.resolution)}
        ${statCard(
            'Dropped Frames',
            playbackQuality.droppedFrames,
            '',
            playbackQuality.droppedFrames > 0 ? 'text-yellow-400' : 'text-white'
        )}
        ${statCard(
            'Corrupted Frames',
            playbackQuality.corruptedFrames,
            '',
            playbackQuality.corruptedFrames > 0 ? 'text-red-400' : 'text-white'
        )}
        ${statCard(
            'TTFF',
            (playbackQuality.timeToFirstFrame * 1000).toFixed(0),
            'ms',
            'text-white',
            'Time To First Frame: From load start to first frame rendered.'
        )}
        ${statCard(
            'Stalls',
            playbackQuality.totalStalls,
            '',
            playbackQuality.totalStalls > 0 ? 'text-red-400' : 'text-white',
            'Total number of rebuffering events after initial playback.'
        )}
        ${statCard(
            'Stall Duration',
            playbackQuality.totalStallDuration.toFixed(2),
            's',
            playbackQuality.totalStallDuration > 0
                ? 'text-red-400'
                : 'text-white',
            'Total cumulative time spent in a stalled/rebuffering state.'
        )}
    `;

    const abrContent = html`
        ${statCard('Video Bitrate', formatBitrate(abr.currentVideoBitrate))}
        ${statCard('Est. Bandwidth', formatBitrate(abr.estimatedBandwidth))}
        ${statCard('Switches (Up)', abr.switchesUp, '', 'text-green-400')}
        ${statCard('Switches (Down)', abr.switchesDown, '', 'text-yellow-400')}
    `;

    const bufferContent = html`
        ${statCard(
            'Buffer Health',
            buffer.bufferHealth.toFixed(2),
            's',
            buffer.bufferHealth < 5
                ? 'text-red-400'
                : buffer.bufferHealth < 15
                  ? 'text-yellow-400'
                  : 'text-green-400'
        )}
        ${statCard(
            'Live Latency',
            buffer.liveLatency.toFixed(2),
            's',
            buffer.liveLatency > 5
                ? 'text-red-400'
                : buffer.liveLatency > 3
                  ? 'text-yellow-400'
                  : 'text-green-400'
        )}
        ${statCard(
            'Buffer Gaps',
            buffer.totalGaps,
            '',
            buffer.totalGaps > 0 ? 'text-yellow-400' : 'text-white'
        )}
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
