import { eventBus } from '@/application/event-bus';
import { playerActions, usePlayerStore } from '@/state/playerStore';
import { analysisActions } from '@/state/analysisStore';
import { playerService } from './playerService.js';

function onStatsChanged({ stats: shakaStats }) {
    const abrHistory = usePlayerStore.getState().abrHistory;
    const lastBitrate = abrHistory[0]?.bitrate;

    // --- Start of Correction ---
    // The `streamBandwidth` stat includes audio. For accurate video ABR tracking,
    // we must get the active variant and look up the video-specific bandwidth.
    const player = playerService.getPlayer();
    let videoOnlyBitrate = shakaStats.streamBandwidth || 0;

    if (player) {
        const activeVariantTrack = player.getVariantTracks().find((t) => t.active);
        const manifest = player.getManifest();

        if (activeVariantTrack && manifest && manifest.variants) {
            const activeVariant = manifest.variants.find(
                (v) => v.id === activeVariantTrack.id
            );
            if (activeVariant && activeVariant.video) {
                videoOnlyBitrate =
                    activeVariant.video.bandwidth || videoOnlyBitrate;
            }
        }
    }
    // --- End of Correction ---

    if (videoOnlyBitrate && videoOnlyBitrate !== lastBitrate) {
        playerActions.logAbrSwitch({
            time: shakaStats.displayTime || 0,
            bitrate: videoOnlyBitrate, // Use corrected bitrate
            width: shakaStats.width || 0,
            height: shakaStats.height || 0,
        });
    }

    // --- Derive advanced stats from history ---
    let totalStalls = 0;
    if (shakaStats.stateHistory) {
        for (let i = 1; i < shakaStats.stateHistory.length; i++) {
            const currentState = shakaStats.stateHistory[i];
            const prevState = shakaStats.stateHistory[i - 1];
            // A stall is a transition into the buffering state from a non-buffering state
            if (
                currentState.state === 'buffering' &&
                prevState.state !== 'buffering'
            ) {
                totalStalls++;
            }
        }
    }

    let switchesUp = 0;
    let switchesDown = 0;
    if (shakaStats.switchHistory) {
        for (let i = 1; i < shakaStats.switchHistory.length; i++) {
            const currentSwitch = shakaStats.switchHistory[i];
            const prevSwitch = shakaStats.switchHistory[i - 1];
            // Consider only variant switches for video tracks
            if (
                currentSwitch.type === 'variant' &&
                prevSwitch.type === 'variant' &&
                currentSwitch.stream?.type === 'video'
            ) {
                if (currentSwitch.bandwidth > prevSwitch.bandwidth) {
                    switchesUp++;
                } else if (currentSwitch.bandwidth < prevSwitch.bandwidth) {
                    switchesDown++;
                }
            }
        }
    }

    /** @type {import('@/types').PlayerStats} */
    const newStats = {
        playheadTime: shakaStats.displayTime || 0,
        playbackQuality: {
            resolution: `${shakaStats.width || 0}x${shakaStats.height || 0}`,
            droppedFrames: shakaStats.droppedFrames || 0,
            totalStalls: totalStalls,
        },
        abr: {
            currentVideoBitrate: videoOnlyBitrate, // Use corrected bitrate
            estimatedBandwidth: shakaStats.estimatedBandwidth || 0,
            switchesUp: switchesUp,
            switchesDown: switchesDown,
        },
        buffer: {
            bufferHealth: shakaStats.bufferHealth || 0,
            liveLatency: shakaStats.liveLatency || 0,
            totalGaps: shakaStats.gapCount || 0,
        },
        session: {
            totalPlayTime: shakaStats.playTime || 0,
            totalBufferingTime: shakaStats.bufferingTime || 0,
        },
    };

    playerActions.updateStats(newStats);
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