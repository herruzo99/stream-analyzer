import { formatBitrate } from '@/ui/shared/format';
import { multiPlayerService } from '../application/multiPlayerService';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import * as icons from '@/ui/icons';

/**
 * Creates the view model for the new multi-player grid view.
 * @param {Map<number, import('@/state/multiPlayerStore').PlayerInstance>} playersMap
 * @returns {{
 *   cards: Array<object>
 * }} An object containing card view models.
 */
export function createMultiPlayerGridViewModel(playersMap) {
    const players = Array.from(playersMap.values());
    const { hoveredStreamId } = useMultiPlayerStore.getState();

    if (players.length === 0) {
        return {
            cards: [],
        };
    }

    const cards = players.map((player) => {
        const {
            stats,
            streamName,
            state,
            error,
            streamType,
            health,
        } = player;

        const bufferStat = {
            label: stats.buffer.label || 'Buffer',
            value: stats.buffer.seconds
                ? `${stats.buffer.seconds.toFixed(2)}s`
                : 'N/A',
            icon: icons.history,
            tooltip:
                stats.buffer.label === 'Live Latency'
                    ? 'Time difference between the playhead and the live edge.'
                    : 'Amount of playable media ahead of the playhead.',
        };

        const bitrateStat = {
            label: 'Bitrate',
            value: formatBitrate(stats.abr.currentVideoBitrate),
            icon: icons.gauge,
            tooltip: 'The bitrate of the current video representation.',
        };

        const resolutionStat = {
            label: 'Resolution',
            value: stats.playbackQuality.resolution || 'N/A',
            icon: icons.clapperboard,
            tooltip: 'The resolution of the video frames being rendered.',
        };

        const stallsStat = {
            label: 'Stalls / Duration',
            value: `${stats.playbackQuality.totalStalls || 0} / ${(
                stats.playbackQuality.totalStallDuration || 0
            ).toFixed(2)}s`,
            icon: icons.pause,
            tooltip:
                'Total number of rebuffering events and the total time spent stalled.',
        };

        const droppedFramesStat = {
            label: 'Dropped Frames',
            value: stats.playbackQuality.droppedFrames || 0,
            icon: icons.film,
            tooltip: 'Frames decoded but not displayed due to performance.',
        };

        const bandwidthStat = {
            label: 'Est. Bandwidth',
            value: formatBitrate(stats.abr.estimatedBandwidth),
            icon: icons.network,
            tooltip:
                "The player's real-time estimate of available network bandwidth.",
        };

        return {
            streamId: player.streamId,
            isHovered: player.streamId === hoveredStreamId,
            streamName,
            state,
            error,
            streamType,
            health,
            videoElement: multiPlayerService.videoElements.get(player.streamId),
            stats: {
                buffer: bufferStat,
                bitrate: bitrateStat,
                resolution: resolutionStat,
                stalls: stallsStat,
                droppedFrames: droppedFramesStat,
                bandwidth: bandwidthStat,
            },
        };
    });

    return { cards };
}