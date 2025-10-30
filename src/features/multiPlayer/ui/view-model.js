import { formatBitrate } from '@/ui/shared/format';
import { multiPlayerService } from '../application/multiPlayerService';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';

/**
 * Creates the view model for the new multi-player grid view.
 * @param {Map<number, import('@/state/multiPlayerStore').PlayerInstance>} playersMap
 * @returns {{
 *   cards: Array<object>,
 *   averagePlayheadTime: number,
 *   maxDuration: number
 * }} An object containing card view models and aggregate data.
 */
export function createMultiPlayerGridViewModel(playersMap) {
    const players = Array.from(playersMap.values());
    const { hoveredStreamId } = useMultiPlayerStore.getState();

    if (players.length === 0) {
        return { cards: [], averagePlayheadTime: 0, maxDuration: 0 };
    }

    const playingPlayers = players.filter(
        (p) => p.state === 'playing' && p.stats?.playheadTime
    );
    const averagePlayheadTime =
        playingPlayers.length > 0
            ? playingPlayers.reduce((sum, p) => sum + p.stats.playheadTime, 0) /
              playingPlayers.length
            : players[0]?.stats?.playheadTime || 0;

    const maxDuration = Math.max(
        ...players.map((p) => p.stats?.manifestTime || 1),
        1
    );

    const cards = players.map((player) => {
        const {
            stats,
            streamName,
            state,
            error,
            playbackHistory,
            streamType,
            health,
        } = player;

        let syncDrift = 0;
        if (
            averagePlayheadTime > 0 &&
            stats?.playheadTime &&
            isFinite(maxDuration) &&
            maxDuration > 0
        ) {
            const driftSeconds = stats.playheadTime - averagePlayheadTime;
            // Calculate drift as a percentage of a smaller, more relevant window (e.g., 60s)
            // to make the visualization more sensitive.
            const syncWindow = 60;
            syncDrift = (driftSeconds / syncWindow) * 100 * 2; // Scale by 2 for visibility
            syncDrift = Math.max(-50, Math.min(50, syncDrift)); // Clamp to [-50, 50]
        }

        const bufferHistory = playbackHistory
            .map((h) => h.buffer)
            .filter((b) => isFinite(b));
        const maxBuffer =
            bufferHistory.length > 0 ? Math.max(...bufferHistory, 1) : 1;
        const bufferSparklinePoints =
            bufferHistory.length > 1
                ? bufferHistory
                      .map(
                          (val, i) =>
                              `${i * (100 / (bufferHistory.length - 1))},${100 - (val / maxBuffer) * 100}`
                      )
                      .join(' ')
                : '0,50 100,50';

        return {
            streamId: player.streamId,
            isHovered: player.streamId === hoveredStreamId,
            streamName,
            state,
            error,
            streamType,
            health,
            resolution: stats?.playbackQuality?.resolution || 'N/A',
            videoBitrate: formatBitrate(stats?.abr?.currentVideoBitrate),
            forwardBuffer: (stats?.buffer?.bufferHealth ?? 0).toFixed(2),
            syncDrift,
            bufferSparklinePoints,
            maxBuffer: maxBuffer.toFixed(2),
            estBandwidth: formatBitrate(stats?.abr?.estimatedBandwidth),
            liveLatency:
                stats?.buffer?.liveLatency > 0
                    ? stats.buffer.liveLatency.toFixed(2)
                    : 'N/A',
            droppedFrames: stats?.playbackQuality?.droppedFrames ?? 'N/A',
            totalStalls: stats?.playbackQuality?.totalStalls ?? 'N/A',
            stallDuration: (
                stats?.playbackQuality?.totalStallDuration ?? 0
            ).toFixed(2),
            videoElement: multiPlayerService.videoElements.get(player.streamId),
        };
    });

    return { cards, averagePlayheadTime, maxDuration };
}
