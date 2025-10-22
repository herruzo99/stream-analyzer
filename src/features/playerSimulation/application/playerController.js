import { eventBus } from '@/application/event-bus';
import { playerActions, usePlayerStore } from '@/state/playerStore';
import { analysisActions } from '@/state/analysisStore';

function onStatsChanged({ stats }) {
    const abrHistory = usePlayerStore.getState().abrHistory;
    const lastBitrate = abrHistory[0]?.bitrate;

    if (stats.streamBandwidth && stats.streamBandwidth !== lastBitrate) {
        playerActions.logAbrSwitch({
            time: stats.displayTime || 0,
            bitrate: stats.streamBandwidth,
            width: stats.width || 0,
            height: stats.height || 0,
        });
    }

    playerActions.updateStats({
        bufferHealth: stats.bufferHealth || 0,
        latency: stats.liveLatency || 0,
        currentBitrate: stats.streamBandwidth || 0,
        droppedFrames: stats.droppedFrames || 0,
        width: stats.width || 0,
        height: stats.height || 0,
        playheadTime: stats.displayTime || 0,
        estimatedBandwidth: stats.estimatedBandwidth || 0,
        gaps: stats.gapCount || 0,
    });
}

function onAdaptation({ oldTrack, newTrack }) {
    const time = new Date().toLocaleTimeString();
    const details = `Bitrate: ${(oldTrack.bandwidth / 1000).toFixed(
        0
    )}k → ${(newTrack.bandwidth / 1000).toFixed(
        0
    )}k | Resolution: ${oldTrack.height}p → ${newTrack.height}p`;
    playerActions.logEvent({ timestamp: time, type: 'adaptation', details });

    // Also log this to the main stream object for the timeline view
    analysisActions.updateStream(newTrack.streamId, {
        adaptationEvents: [
            ...(newTrack.stream?.adaptationEvents || []),
            {
                time: newTrack.playheadTime,
                oldWidth: oldTrack.width,
                oldHeight: oldTrack.height,
                newWidth: newTrack.width,
                newHeight: newTrack.height,
            },
        ],
    });
}

function onBuffering({ buffering }) {
    const time = new Date().toLocaleTimeString();
    const type = 'buffering';
    const details = buffering ? 'Buffering started...' : 'Buffering ended.';
    playerActions.logEvent({ timestamp: time, type, details });
}

function onPlayerError({ error }) {
    const time = new Date().toLocaleTimeString();
    const type = 'error';
    const details = `Error code ${error.code}: ${error.message}`;
    playerActions.logEvent({ timestamp: time, type, details });
}

export function initializePlayerController() {
    eventBus.subscribe('player:stats-changed', onStatsChanged);
    eventBus.subscribe('player:adaptation-internal', onAdaptation);
    eventBus.subscribe('player:buffering', onBuffering);
    eventBus.subscribe('player:error', onPlayerError);

    // Reset store when a new analysis starts
    eventBus.subscribe('analysis:started', playerActions.reset);
}