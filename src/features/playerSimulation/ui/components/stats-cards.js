import { html } from 'lit-html';
import { formatBitrate } from '@/ui/shared/format';

const cardTemplate = (title, value, unit = '', colorClass = 'text-white') => {
    return html`
        <div class="bg-gray-800 p-3 rounded-lg">
            <h5 class="text-sm font-semibold text-gray-400">${title}</h5>
            <p class="text-2xl font-bold ${colorClass}">
                ${value}
                <span class="text-lg text-gray-400">${unit}</span>
            </p>
        </div>
    `;
};

export const statsCardsTemplate = (stats) => {
    if (!stats) {
        return html`<div class="text-sm text-gray-500">
            Awaiting player statistics...
        </div>`;
    }

    const bufferColor =
        stats.bufferHealth < 5
            ? 'text-red-400'
            : stats.bufferHealth < 15
              ? 'text-yellow-400'
              : 'text-green-400';

    const latencyColor =
        stats.latency > 5
            ? 'text-red-400'
            : stats.latency > 3
              ? 'text-yellow-400'
              : 'text-green-400';

    return html`
        <div
            class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4"
        >
            ${cardTemplate(
                'Playhead Time',
                stats.playheadTime.toFixed(2),
                ' s'
            )}
            ${cardTemplate(
                'Buffer Health',
                stats.bufferHealth.toFixed(2),
                ' s',
                bufferColor
            )}
            ${cardTemplate(
                'Live Latency',
                stats.latency.toFixed(2),
                ' s',
                latencyColor
            )}
            ${cardTemplate(
                'Bandwidth',
                formatBitrate(stats.estimatedBandwidth)
            )}
            ${cardTemplate(
                'Current Bitrate',
                formatBitrate(stats.currentBitrate)
            )}
            ${cardTemplate(
                'Resolution',
                `${stats.width}x${stats.height}`,
                ' p'
            )}
            ${cardTemplate(
                'Dropped Frames',
                stats.droppedFrames,
                '',
                stats.droppedFrames > 0 ? 'text-yellow-400' : 'text-white'
            )}
            ${cardTemplate(
                'Buffer Gaps',
                stats.gaps,
                '',
                stats.gaps > 0 ? 'text-yellow-400' : 'text-white'
            )}
        </div>
    `;
};