import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { appLog } from '@/shared/utils/debug';
import { getShaka } from '@/infrastructure/player/shaka';
import { showToast } from '@/ui/components/toast';
import { eventBus } from '@/application/event-bus';
import { StallCalculator } from '../domain/stall-calculator.js';
import { parseShakaError } from '@/infrastructure/player/shaka-error';
import { playerConfigService } from './playerConfigService.js';

const FRAME_DURATION = 1 / 30; // Assume 30fps for frame-stepping
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;
const JITTER_FACTOR = 0.3;

class MultiPlayerService {
    #loadQueue = Promise.resolve();

    constructor() {
        /** @type {Map<number, any>} */
        this.players = new Map();
        /** @type {Map<number, HTMLVideoElement>} */
        this.videoElements = new Map();
        /** @type {Map<number, StallCalculator>} */
        this.stallCalculators = new Map();
        this.tickerSubscription = null;
    }

    initialize() {
        appLog('MultiPlayerService.initialize', 'info', 'Service initialized.');
    }

    createVideoElement(streamId) {
        if (this.videoElements.has(streamId)) {
            return this.videoElements.get(streamId);
        }
        const videoElement = document.createElement('video');
        videoElement.className = 'w-full h-full';
        videoElement.muted = useMultiPlayerStore.getState().isMutedAll;
        videoElement.disablePictureInPicture = true;
        this.videoElements.set(streamId, videoElement);
        return videoElement;
    }

    async createAndLoadPlayer(playerState) {
        const serializedOperation = async () => {
            const { streamId } = playerState;
            appLog(
                'MultiPlayerService.createAndLoadPlayer',
                'info',
                `[START QUEUED] for stream ${streamId}`
            );

            if (!playerState || this.players.has(streamId)) {
                appLog(
                    'MultiPlayerService.createAndLoadPlayer',
                    'warn',
                    `[ABORT QUEUED] Player for stream ${streamId} already exists or state is invalid.`
                );
                return;
            }

            const shaka = await getShaka();
            const player = new shaka.Player();
            this.players.set(streamId, player);
            this.stallCalculators.set(streamId, new StallCalculator());
            appLog(
                'MultiPlayerService.createAndLoadPlayer',
                'info',
                `Created new Shaka player and StallCalculator for stream ${streamId}`
            );

            player.addEventListener('error', (e) =>
                this._handlePlayerError(streamId, /** @type {any} */ (e).detail)
            );

            player.addEventListener('emsg', (e) => {
                const { streams } = useAnalysisStore.getState();
                const streamDef = streams.find(
                    (s) => s.id === playerState.sourceStreamId
                );
                if (streamDef) {
                    eventBus.dispatch('player:emsg', {
                        ...e.detail,
                        stream: streamDef,
                    });
                }
            });

            const { streams } = useAnalysisStore.getState();
            const streamDef = streams.find(
                (s) => s.id === playerState.sourceStreamId
            );

            if (streamDef) {
                player.streamAnalyzerStreamId = streamDef.id;
                player.getNetworkingEngine().streamAnalyzerStreamId =
                    streamDef.id;

                const videoElement = this.videoElements.get(streamId);
                if (videoElement) {
                    await player.attach(videoElement);
                    this.addVideoElementListeners(videoElement, streamId);
                    await this.loadStreamIntoPlayer(
                        streamDef,
                        player,
                        streamId,
                        playerState.initialState
                    );
                } else {
                    appLog(
                        'MultiPlayerService.createAndLoadPlayer',
                        'warn',
                        `Video element for stream ${streamId} not found.`
                    );
                }
            }
            appLog(
                'MultiPlayerService.createAndLoadPlayer',
                'info',
                `[END QUEUED] for stream ${streamId}`
            );
        };

        this.#loadQueue = this.#loadQueue.then(() => serializedOperation());
        return this.#loadQueue;
    }

    async loadStreamIntoPlayer(
        streamDef,
        player,
        uniqueStreamId,
        initialState
    ) {
        try {
            appLog(
                'MultiPlayerService.loadStreamIntoPlayer',
                'info',
                `[START LOAD] for stream ${uniqueStreamId}`
            );

            const drmConfig =
                await playerConfigService.buildDrmConfig(streamDef);
            player.configure({ drm: drmConfig });
            this.applyStreamConfig(uniqueStreamId);

            let startTime = 0;
            if (streamDef.manifest?.type === 'dynamic') {
                const liveLatency = player.seekRange().end;

                if (streamDef.protocol === 'dash') {
                    const delay =
                        streamDef.manifest.suggestedPresentationDelay;
                    if (delay) {
                        startTime = liveLatency - delay;
                        appLog(
                            'MultiPlayerService',
                            'info',
                            `DASH live stream: Applying suggestedPresentationDelay of ${delay}s. Starting at ${startTime}.`
                        );
                    }
                } else if (streamDef.protocol === 'hls') {
                    const targetDuration =
                        streamDef.manifest.summary?.hls?.targetDuration || 2;
                    const safeOffset = targetDuration * 3;
                    startTime = liveLatency - safeOffset;
                    appLog(
                        'MultiPlayerService',
                        'info',
                        `HLS live stream: Applying safe offset of 3*targetDuration (${safeOffset}s). Starting at ${startTime}.`
                    );
                }
            }

            await player.load(streamDef.originalUrl, startTime);

            appLog(
                'MultiPlayerService.loadStreamIntoPlayer',
                'info',
                `[END LOAD] SUCCESS for stream ${uniqueStreamId}`
            );

            const videoTracks = player.getVariantTracks();
            const activeVideoTrack = videoTracks.find((t) => t.active) || null;

            const videoEl = this.videoElements.get(uniqueStreamId);
            let finalState = 'paused';
            if (initialState && videoEl) {
                videoEl.currentTime = initialState.currentTime;
                if (!initialState.paused) {
                    finalState = 'playing';
                }
            }

            useMultiPlayerStore.getState().updatePlayerState(uniqueStreamId, {
                state: finalState,
                error: null,
                variantTracks: videoTracks,
                activeVideoTrack: activeVideoTrack,
                audioTracks: player.getAudioLanguagesAndRoles(),
                textTracks: player.getTextTracks(),
                retryCount: 0,
            });

            if (finalState === 'playing' && videoEl) {
                videoEl.play();
            }
        } catch (error) {
            this._handlePlayerError(uniqueStreamId, error);
        }
    }

    addVideoElementListeners(videoElement, streamId) {
        videoElement.addEventListener('play', () =>
            useMultiPlayerStore
                .getState()
                .updatePlayerState(streamId, { state: 'playing' })
        );
        videoElement.addEventListener('playing', () =>
            useMultiPlayerStore
                .getState()
                .updatePlayerState(streamId, { state: 'playing' })
        );
        videoElement.addEventListener('pause', () =>
            useMultiPlayerStore
                .getState()
                .updatePlayerState(streamId, { state: 'paused' })
        );
        videoElement.addEventListener('ended', () =>
            useMultiPlayerStore
                .getState()
                .updatePlayerState(streamId, { state: 'ended' })
        );
        videoElement.addEventListener('waiting', () =>
            useMultiPlayerStore
                .getState()
                .updatePlayerState(streamId, { state: 'buffering' })
        );
    }

    _handlePlayerError(streamId, error) {
        if (error.code === 7000 || error.code === 7002) {
            appLog(
                'MultiPlayerService',
                'info',
                `Load interrupted for stream ${streamId}. Ignoring.`
            );
            return;
        }

        appLog(
            'MultiPlayerService._handlePlayerError',
            'warn',
            `Player error for stream ${streamId}:`,
            error
        );

        const playerState = useMultiPlayerStore.getState().players.get(streamId);
        const originalMessage = parseShakaError(error);

        useMultiPlayerStore.getState().logEvent({
            streamId,
            streamName: playerState?.streamName || 'Unknown',
            type: 'error',
            details: originalMessage,
            severity: 'critical',
        });

        const { isAutoResetEnabled } = useMultiPlayerStore.getState();
        if (!isAutoResetEnabled || !playerState) {
            useMultiPlayerStore.getState().updatePlayerState(streamId, {
                state: 'error',
                health: 'critical',
                error: originalMessage,
            });
            return;
        }

        const currentRetries = playerState.retryCount || 0;
        if (currentRetries >= MAX_RETRIES) {
            useMultiPlayerStore.getState().updatePlayerState(streamId, {
                state: 'error',
                health: 'critical',
                error: `Permanent Failure: ${originalMessage}`,
            });
            return;
        }

        const newRetryCount = currentRetries + 1;
        const backoff =
            INITIAL_RETRY_DELAY_MS *
            Math.pow(2, currentRetries) *
            (1 + Math.random() * JITTER_FACTOR);
        const delay = Math.min(backoff, 30000);

        useMultiPlayerStore.getState().updatePlayerState(streamId, {
            state: 'loading',
            health: 'critical',
            error: `Retrying (${newRetryCount}/${MAX_RETRIES})...`,
            retryCount: newRetryCount,
        });

        setTimeout(() => this.resetSinglePlayer(streamId), delay);
    }

    startStatsCollection() {
        this.stopStatsCollection();
        this.tickerSubscription = eventBus.subscribe(
            'ticker:two-second-tick',
            () => {
                const { players, batchUpdatePlayerState, logEvent } =
                    useMultiPlayerStore.getState();
                const updates = [];

                for (const [streamId, shakaPlayer] of this.players.entries()) {
                    const videoEl = this.videoElements.get(streamId);
                    const isLive = shakaPlayer.isLive();

                    if (
                        !videoEl ||
                        videoEl.readyState === 0 ||
                        (!isLive && !isFinite(videoEl.duration))
                    ) {
                        continue;
                    }

                    const shakaStats = shakaPlayer.getStats();
                    const currentPlayerState = players.get(streamId);
                    const stallCalculator = this.stallCalculators.get(streamId);
                    if (!currentPlayerState || !stallCalculator) continue;

                    const seekable = shakaPlayer.seekRange();
                    const seekableRange =
                        seekable.end - seekable.start > 0
                            ? { start: seekable.start, end: seekable.end }
                            : { start: 0, end: videoEl.duration || 0 };

                    const seekableDuration =
                        seekableRange.end - seekableRange.start;
                    const normalizedPlayheadTime =
                        seekableDuration > 0
                            ? Math.max(
                                  0,
                                  (videoEl.currentTime - seekableRange.start) /
                                      seekableDuration
                              )
                            : 0;

                    const videoTracks = shakaPlayer.getVariantTracks();
                    const activeVideoTrack =
                        videoTracks.find((track) => track.active) || null;

                    const { totalStalls, totalStallDuration } =
                        stallCalculator.update(shakaStats.stateHistory);

                    let bufferEnd = 0;
                    const buffered = videoEl.buffered;
                    if (buffered) {
                        for (let i = 0; i < buffered.length; i++) {
                            if (
                                buffered.start(i) <= videoEl.currentTime &&
                                buffered.end(i) >= videoEl.currentTime
                            ) {
                                bufferEnd = buffered.end(i);
                                break;
                            }
                        }
                        if (bufferEnd === 0 && buffered.length > 0) {
                            bufferEnd = buffered.end(buffered.length - 1);
                        }
                    }

                    const bufferInfo = {
                        label: /** @type {'Live Latency' | 'Buffer Health'} */ (
                            isLive ? 'Live Latency' : 'Buffer Health'
                        ),
                        seconds: isLive
                            ? shakaStats.liveLatency || 0
                            : Math.max(0, bufferEnd - videoEl.currentTime),
                    };

                    const newHistoryEntry = {
                        time: Date.now(),
                        buffer: isNaN(bufferInfo.seconds)
                            ? 0
                            : bufferInfo.seconds,
                    };

                    const newPlaybackHistory = [
                        ...(currentPlayerState.playbackHistory || []),
                        newHistoryEntry,
                    ].slice(-50);

                    const newStats = {
                        playheadTime: videoEl.currentTime,
                        manifestTime: videoEl.duration,
                        playbackQuality: {
                            resolution: `${shakaStats.width}x${shakaStats.height}`,
                            corruptedFrames: shakaStats.corruptedFrames,
                            totalStalls,
                            totalStallDuration,
                            timeToFirstFrame: 0,
                        },
                        abr: {
                            currentVideoBitrate:
                                activeVideoTrack?.videoBandwidth || 0,
                            estimatedBandwidth: shakaStats.estimatedBandwidth,
                            switchesUp: 0,
                            switchesDown: 0,
                        },
                        buffer: {
                            label: bufferInfo.label,
                            seconds: bufferInfo.seconds,
                            totalGaps: 0,
                        },
                        session: {
                            totalPlayTime: shakaStats.playTime,
                            totalBufferingTime: shakaStats.bufferingTime,
                        },
                    };

                    let health = 'healthy';
                    const lastStats = currentPlayerState.stats;
                    if (lastStats) {
                        if (
                            newStats.playbackQuality.totalStalls >
                            lastStats.playbackQuality.totalStalls
                        ) {
                            health = 'critical';
                            logEvent({
                                streamId,
                                streamName: currentPlayerState.streamName,
                                type: 'stall',
                                details: `Stall detected at playhead time ${newStats.playheadTime.toFixed(
                                    2
                                )}s`,
                                severity: 'critical',
                            });
                        }
                    }

                    updates.push({
                        streamId,
                        updates: {
                            stats: newStats,
                            playbackHistory: newPlaybackHistory,
                            health,
                            variantTracks: videoTracks,
                            activeVideoTrack: activeVideoTrack,
                            audioTracks:
                                shakaPlayer.getAudioLanguagesAndRoles(),
                            textTracks: shakaPlayer.getTextTracks(),
                            seekableRange: seekableRange,
                            normalizedPlayheadTime: normalizedPlayheadTime,
                        },
                    });
                }

                if (updates.length > 0) {
                    batchUpdatePlayerState(updates);
                }
            }
        );
    }

    stopStatsCollection() {
        if (this.tickerSubscription) {
            this.tickerSubscription();
            this.tickerSubscription = null;
        }
    }

    async destroyPlayer(streamId) {
        appLog(
            'MultiPlayerService.destroyPlayer',
            'info',
            `Destroying player for stream ${streamId}`
        );
        const player = this.players.get(streamId);
        if (player) {
            await player.destroy();
            this.players.delete(streamId);
        }
        this.videoElements.delete(streamId);
        this.stallCalculators.delete(streamId);
    }

    async removePlayer(streamId) {
        const { players } = useMultiPlayerStore.getState();
        const playerToRemove = players.get(streamId);
        if (!playerToRemove) return;

        const playersForSameSource = Array.from(players.values()).filter(
            (p) => p.sourceStreamId === playerToRemove.sourceStreamId
        );

        if (playersForSameSource.length <= 1) {
            showToast({
                message: 'Cannot remove the last player for a stream.',
                type: 'warn',
            });
            return;
        }
        useMultiPlayerStore.getState().removePlayer(streamId);
    }

    async destroyAll() {
        appLog(
            'MultiPlayerService.destroyAll',
            'info',
            'Destroying all players.'
        );
        this.stopStatsCollection();
        this.#loadQueue = Promise.resolve();
        for (const player of this.players.values()) await player.destroy();
        this.players.clear();
        this.videoElements.clear();
        this.stallCalculators.clear();
        useMultiPlayerStore.getState().clearPlayersAndLogs();
    }

    async playAll() {
        const { players, updatePlayerState } = useMultiPlayerStore.getState();
        const { streams } = useAnalysisStore.getState();
        const playPromises = [];

        for (const [id, video] of this.videoElements.entries()) {
            const playerState = players.get(id);
            if (playerState) {
                const sourceStream = streams.find(
                    (s) => s.id === playerState.sourceStreamId
                );
                if (sourceStream) {
                    const isDynamic = sourceStream.manifest?.type === 'dynamic';
                    analysisActions.setStreamPolling(sourceStream.id, isDynamic);
                }
            }
            playPromises.push(
                video.play().catch((e) => ({
                    streamId: id,
                    error: e,
                }))
            );
        }

        const results = await Promise.allSettled(playPromises);
        results.forEach((result, index) => {
            // --- ARCHITECTURAL FIX: Type guards for PromiseSettledResult ---
            if (result.status === 'rejected') {
                const streamId = Array.from(this.videoElements.keys())[index];
                const errorValue = result.reason;
                appLog('MultiPlayerService.playAll', 'error', `Playback failed for stream ${streamId}.`, errorValue);
                updatePlayerState(streamId, { state: 'error', error: `Failed to start: ${errorValue.message}` });
            } else if (result.status === 'fulfilled' && result.value && result.value.error) {
                const { streamId, error: errorValue } = result.value;
                appLog('MultiPlayerService.playAll', 'error', `Playback failed for stream ${streamId}.`, errorValue);
                updatePlayerState(streamId, { state: 'error', error: `Failed to start playback: ${errorValue.message}` });
            }
            // --- END FIX ---
        });
    }

    pauseAll() {
        for (const v of this.videoElements.values()) v.pause();
    }

    muteAll() {
        for (const v of this.videoElements.values()) v.muted = true;
    }

    unmuteAll() {
        for (const v of this.videoElements.values()) v.muted = false;
    }

    seek(time, streamId) {
        const video = this.videoElements.get(streamId);
        if (video) {
            video.currentTime = time;
        }
    }

    syncAllTo(sourceStreamId) {
        const { players, isSyncEnabled } = useMultiPlayerStore.getState();
        if (!isSyncEnabled) return;

        const sourcePlayerState = players.get(sourceStreamId);
        const sourceVideo = this.videoElements.get(sourceStreamId);
        if (!sourcePlayerState || !sourceVideo) return;

        let syncedCount = 0;

        if (sourcePlayerState.streamType === 'live') {
            const sourceLatency =
                sourcePlayerState.seekableRange.end - sourceVideo.currentTime;

            for (const [targetId] of this.videoElements.entries()) {
                if (targetId === sourceStreamId) continue;
                const targetPlayerState = players.get(targetId);

                if (targetPlayerState?.streamType === 'live') {
                    const targetSeekTime =
                        targetPlayerState.seekableRange.end - sourceLatency;
                    if (
                        targetSeekTime >= targetPlayerState.seekableRange.start
                    ) {
                        this.seek(targetSeekTime, targetId);
                        syncedCount++;
                    }
                }
            }
            showToast({
                message: `Synced ${syncedCount} live player(s) to ${sourceLatency.toFixed(
                    2
                )}s latency.`,
                type: 'info',
            });
        } else {
            // Source is VOD
            const targetTime = sourceVideo.currentTime;
            for (const [targetId] of this.videoElements.entries()) {
                if (targetId === sourceStreamId) continue;
                const targetPlayerState = players.get(targetId);

                if (targetPlayerState?.streamType === 'vod') {
                    this.seek(targetTime, targetId);
                    syncedCount++;
                }
            }
            showToast({
                message: `Synced ${syncedCount} VOD player(s) to ${targetTime.toFixed(
                    2
                )}s.`,
                type: 'info',
            });
        }
    }

    resetAllPlayers() {
        for (const [id, video] of this.videoElements.entries()) {
            video.pause();
            video.currentTime = 0;
            this.stallCalculators.get(id)?.reset();
        }
        showToast({ message: 'All players reset.', type: 'info' });
    }

    async resetFailedPlayers() {
        const { players } = useMultiPlayerStore.getState();
        const failedPlayerIds = Array.from(players.values())
            .filter((p) => p.state === 'error')
            .map((p) => p.streamId);

        if (failedPlayerIds.length === 0) {
            showToast({ message: 'No failed players to reset.', type: 'info' });
            return;
        }

        for (const streamId of failedPlayerIds) {
            this.resetSinglePlayer(streamId);
        }
        showToast({
            message: `Attempting to reset ${failedPlayerIds.length} failed player(s).`,
            type: 'pass',
        });
    }

    async resetSinglePlayer(streamId) {
        const playerState = useMultiPlayerStore
            .getState()
            .players.get(streamId);
        if (!playerState) return;

        useMultiPlayerStore
            .getState()
            .updatePlayerState(streamId, { state: 'loading', error: null });

        const player = this.players.get(streamId);
        const { streams } = useAnalysisStore.getState();
        const streamDef = streams.find(
            (s) => s.id === playerState.sourceStreamId
        );

        if (player && streamDef) {
            try {
                await this.loadStreamIntoPlayer(streamDef, player, streamId);
                useMultiPlayerStore
                    .getState()
                    .updatePlayerState(streamId, {
                        state: 'paused',
                        retryCount: 0,
                    });
            } catch (error) {
                this._handlePlayerError(streamId, error);
            }
        }
    }

    async clearAndResetPlayers() {
        const { players } = useMultiPlayerStore.getState();
        const copyIds = Array.from(players.values())
            .filter((p) => p.streamName.includes('(Copy)'))
            .map((p) => p.streamId);

        for (const id of copyIds) {
            await this.destroyPlayer(id);
        }
        this.resetAllPlayers();
        showToast({
            message: 'Duplicate players cleared and originals reset.',
            type: 'pass',
        });
    }

    setGlobalAbr(enabled) {
        for (const player of this.players.values()) {
            playerConfigService.setAbrEnabled(player, enabled);
        }
    }

    setAbrEnabled(streamId, enabled) {
        const player = this.players.get(streamId);
        playerConfigService.setAbrEnabled(player, enabled);
    }

    setGlobalBandwidthCap(bps) {
        for (const streamId of this.players.keys()) {
            this.applyStreamConfig(streamId);
        }
    }

    setGlobalMaxHeight(height) {
        for (const streamId of this.players.keys()) {
            this.applyStreamConfig(streamId);
        }
    }

    setGlobalAudioTrack(lang) {
        let appliedCount = 0;
        for (const p of this.players.values()) {
            const availableLangs = p.getAudioLanguages();
            if (availableLangs.includes(lang)) {
                p.selectAudioLanguage(lang);
                appliedCount++;
            }
        }
        showToast({
            message: `Audio language '${lang}' applied to ${appliedCount} player(s).`,
            type: 'info',
        });
    }

    setGlobalTrackByHeight(height) {
        const { setStreamOverride } = useMultiPlayerStore.getState();
        let appliedCount = 0;

        for (const [streamId, shakaPlayer] of this.players.entries()) {
            if (
                playerConfigService.setGlobalTrackByHeight(shakaPlayer, height)
            ) {
                setStreamOverride(streamId, { abr: false });
                appliedCount++;
            }
        }
        showToast({
            message: `Manual track selection applied to ${appliedCount} player(s).`,
            type: 'info',
        });
    }

    setGlobalRestrictions(restrictions) {
        for (const p of this.players.values()) p.configure({ restrictions });
    }

    setGlobalBufferingGoal(goal) {
        for (const p of this.players.values())
            p.configure({ streaming: { bufferingGoal: goal } });
    }

    selectTrack(streamId, type, selectionCriteria) {
        const player = this.players.get(streamId);
        playerConfigService.selectTrack(player, type, selectionCriteria);
    }

    applyStreamConfig(streamId) {
        const { players } = useMultiPlayerStore.getState();
        const playerState = players.get(streamId);
        const shakaPlayer = this.players.get(streamId);
        playerConfigService.applyStreamConfig(shakaPlayer, playerState);
    }

    duplicateStream(sourceStreamId) {
        const sourceVideo = this.videoElements.get(sourceStreamId);
        if (!sourceVideo) return;

        const initialState = {
            currentTime: sourceVideo.currentTime,
            paused: sourceVideo.paused,
        };
        useMultiPlayerStore
            .getState()
            .duplicateStream(sourceStreamId, initialState);
    }

    applyActionToSelected(action) {
        const { players } = useMultiPlayerStore.getState();
        const selectedPlayers = Array.from(players.values()).filter(
            (p) => p.selectedForAction
        );

        for (const playerState of selectedPlayers) {
            const videoEl = this.videoElements.get(playerState.streamId);
            if (videoEl) {
                if (action.type !== 'play') {
                    videoEl.pause();
                }
                switch (action.type) {
                    case 'seek':
                        videoEl.currentTime = Math.max(
                            0,
                            videoEl.currentTime + action.delta
                        );
                        break;
                    case 'seek-frame-forward':
                        videoEl.currentTime += FRAME_DURATION;
                        break;
                    case 'seek-frame-backward':
                        videoEl.currentTime = Math.max(
                            0,
                            videoEl.currentTime - FRAME_DURATION
                        );
                        break;
                    case 'play':
                        videoEl.play();
                        break;
                    case 'pause':
                        // Already paused
                        break;
                }
            }
        }
    }
}

export const multiPlayerService = new MultiPlayerService();