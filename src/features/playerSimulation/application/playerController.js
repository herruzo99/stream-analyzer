import { eventBus } from '@/application/event-bus';
import { playerActions, usePlayerStore } from '@/state/playerStore';
import { analysisActions } from '@/state/analysisStore';
import { playerService } from './playerService.js';
import { useUiStore } from '@/state/uiStore';

function onStatsChanged({ stats: shakaStats }) {
    const { abrHistory, currentStats } = usePlayerStore.getState();
    const lastBitrate = abrHistory[0]?.bitrate;

    const player = playerService.getPlayer();
    let videoOnlyBitrate = shakaStats.streamBandwidth || 0;

    if (player) {
        const activeVariantTrack = player
            .getVariantTracks()
            .find((t) => t.active);

        // ARCHITECTURAL FIX: Use cached variants instead of getManifest()
        const variants = playerService.getActiveManifestVariants();

        if (activeVariantTrack && variants) {
            const activeVariant = variants.find(
                (v) => v.id === activeVariantTrack.id
            );
            if (activeVariant && activeVariant.video) {
                videoOnlyBitrate =
                    activeVariant.video.bandwidth || videoOnlyBitrate;
            }
        }
    }

    if (videoOnlyBitrate && videoOnlyBitrate !== lastBitrate) {
        playerActions.logAbrSwitch({
            time: shakaStats.displayTime || 0,
            bitrate: videoOnlyBitrate,
            width: shakaStats.width || 0,
            height: shakaStats.height || 0,
        });
    }

    let totalStalls = 0;
    let totalStallDuration = 0;
    let timeToFirstFrame = currentStats?.playbackQuality.timeToFirstFrame || 0;

    if (shakaStats.stateHistory && shakaStats.stateHistory.length > 1) {
        const firstPlayIndex = shakaStats.stateHistory.findIndex(
            (s) => s.state === 'playing'
        );

        if (firstPlayIndex > -1) {
            // Calculate TTFF only once
            if (timeToFirstFrame === 0) {
                const loadingState = shakaStats.stateHistory.find(
                    (s) => s.state === 'loading'
                );
                if (loadingState) {
                    timeToFirstFrame =
                        shakaStats.stateHistory[firstPlayIndex].timestamp -
                        loadingState.timestamp;
                }
            }

            // Calculate stalls and stall duration that happen *after* initial playback starts
            for (
                let i = firstPlayIndex + 1;
                i < shakaStats.stateHistory.length;
                i++
            ) {
                const currentState = shakaStats.stateHistory[i];
                const prevState = shakaStats.stateHistory[i - 1];
                if (
                    currentState.state === 'buffering' &&
                    prevState.state !== 'buffering'
                ) {
                    totalStalls++;
                }
                if (prevState.state === 'buffering') {
                    totalStallDuration +=
                        currentState.timestamp - prevState.timestamp;
                }
            }
        }
    }

    let switchesUp = 0;
    let switchesDown = 0;
    if (shakaStats.switchHistory) {
        const variantSwitches = shakaStats.switchHistory.filter(
            (s) => s.type === 'variant' && s.bandwidth
        );
        for (let i = 1; i < variantSwitches.length; i++) {
            if (
                variantSwitches[i].bandwidth > variantSwitches[i - 1].bandwidth
            ) {
                switchesUp++;
            } else if (
                variantSwitches[i].bandwidth < variantSwitches[i - 1].bandwidth
            ) {
                switchesDown++;
            }
        }
    }

    const seekRange = player ? player.seekRange() : { start: 0, end: 0 };
    const manifestTime = seekRange.end - seekRange.start;

    /** @type {import('@/types').PlayerStats} */
    const newStats = {
        playheadTime: shakaStats.displayTime || 0,
        manifestTime: manifestTime,
        playbackQuality: {
            resolution: `${shakaStats.width || 0}x${shakaStats.height || 0}`,
            droppedFrames: shakaStats.droppedFrames || 0,
            corruptedFrames: shakaStats.corruptedFrames || 0,
            totalStalls: totalStalls,
            totalStallDuration: totalStallDuration,
            timeToFirstFrame: timeToFirstFrame,
        },
        abr: {
            currentVideoBitrate: videoOnlyBitrate,
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
    const details = `Bitrate: ${(oldTrack.bandwidth / 1000).toFixed(0)}k → ${(
        newTrack.bandwidth / 1000
    ).toFixed(0)}k | Resolution: ${oldTrack.height}p → ${newTrack.height}p`;
    playerActions.logEvent({ timestamp: time, type: 'adaptation', details });

    // The stream object is now passed directly with the event, no need for a global lookup.
    if (newTrack.stream) {
        analysisActions.updateStream(newTrack.streamId, {
            adaptationEvents: [
                ...(newTrack.stream.adaptationEvents || []),
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

function onPipChanged({ isInPiP }) {
    playerActions.setPictureInPicture(isInPiP);

    if (!isInPiP) {
        // This is a user-initiated action to close PiP.
        // If we are not on the player tab, the player instance is now "orphaned"
        // and should be destroyed to free up resources.
        const { activeTab } = useUiStore.getState();
        if (activeTab !== 'player-simulation') {
            playerService.destroy();
        }
    }
}

export function initializePlayerController() {
    eventBus.subscribe('player:stats-changed', onStatsChanged);
    eventBus.subscribe('player:adaptation-internal', onAdaptation);
    eventBus.subscribe('player:buffering', onBuffering);
    eventBus.subscribe('player:error', onPlayerError);
    eventBus.subscribe('player:pip-changed', onPipChanged);

    // Reset store when a new analysis starts
    eventBus.subscribe('analysis:started', playerActions.reset);
}
