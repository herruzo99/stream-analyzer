import { html } from 'lit-html';
import { usePlayerStore } from '@/state/playerStore';
import { formatBitrate } from '@/ui/shared/format';
import * as icons from '@/ui/icons';

const statusCard = (label, value, icon = null, color = 'text-white') => {
    if (value === null || value === undefined) return '';
    return html`
        <div class="flex items-center gap-3">
            <div class="text-gray-400">${icon || ''}</div>
            <div>
                <div class="text-xs text-gray-500 font-semibold">${label}</div>
                <div class="font-mono text-sm font-bold ${color}">${value}</div>
            </div>
        </div>
    `;
};

export const playerStatusDisplayTemplate = () => {
    const {
        playbackState,
        activeVideoTrack,
        activeAudioTrack,
        activeTextTrack,
    } = usePlayerStore.getState();

    const stateColors = {
        PLAYING: 'text-green-400',
        PAUSED: 'text-yellow-400',
        BUFFERING: 'text-blue-400 animate-pulse',
        ENDED: 'text-gray-500',
        IDLE: 'text-gray-500',
    };

    const stateIcons = {
        PLAYING: icons.play,
        PAUSED: icons.pause,
        BUFFERING: icons.spinner,
        ENDED: html`<span>&#9724;</span>`,
        IDLE: html`<span>-</span>`,
    };

    const videoInfo = activeVideoTrack
        ? `${activeVideoTrack.height}p @ ${formatBitrate(activeVideoTrack.bitrate)}`
        : 'N/A';
    const audioInfo = activeAudioTrack?.language || 'N/A';
    const textInfo = activeTextTrack?.language || 'Off';

    return html`
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-4">
            <div
                class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 items-center"
            >
                ${statusCard(
                    'State',
                    playbackState,
                    stateIcons[playbackState] || null,
                    stateColors[playbackState] || 'text-white'
                )}
                ${statusCard('Video Track', videoInfo)}
                ${statusCard('Audio Track', audioInfo)}
                ${statusCard('Text Track', textInfo)}
            </div>
        </div>
    `;
};
