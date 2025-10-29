import { formatBitrate } from '@/ui/shared/format';

/**
 * Creates the view model for the new multi-player grid view.
 * @param {Map<number, import('@/state/multiPlayerStore').PlayerInstance>} playersMap
 * @returns {Array<object>} An array of view model objects, one for each player card.
 */
export function createMultiPlayerGridViewModel(playersMap) {
    const players = Array.from(playersMap.values());
    if (players.length === 0) {
        return [];
    }

    const playingPlayers = players.filter(
        (p) => p.state === 'playing' && p.stats?.playheadTime
    );
    const averagePlayheadTime =
        playingPlayers.length > 0
            ? playingPlayers.reduce((sum, p) => sum + p.stats.playheadTime, 0) /
              playingPlayers.length
            : 0;

    const maxDuration = Math.max(
        ...players.map((p) => p.stats?.manifestTime || 1),
        1
    );

    return players.map((player) => {
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
            syncDrift = (driftSeconds / maxDuration) * 100;
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
        };
    });
}
