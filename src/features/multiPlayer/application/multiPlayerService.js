import { eventBus } from '@/application/event-bus';
import { getShaka } from '@/infrastructure/player/shaka';
import { parseShakaError } from '@/infrastructure/player/shaka-error';
import { appLog } from '@/shared/utils/debug';
import { secureRandom } from '@/shared/utils/random';
import { useAnalysisStore } from '@/state/analysisStore';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { showToast } from '@/ui/components/toast';
import { StallCalculator } from '../domain/stall-calculator.js';
import { playerConfigService } from './playerConfigService.js';

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 2000;
const JITTER_FACTOR = 0.3;

class MultiPlayerService {
    #loadQueue = Promise.resolve();

    constructor() {
        /** @type {Map<number, any>} */
        this.players = new Map();
        /** @type {Map<number, HTMLVideoElement>} */
        this.videoElements = new Map();
        this.stallCalculators = new Map();
        this.tickerSubscription = null;
        this.retryTimers = new Map();
    }

    initialize() {
        appLog('MultiPlayerService.initialize', 'info', 'Service initialized.');
    }

    getVideoElement(streamId) {
        if (!this.videoElements.has(streamId)) {
            const video = document.createElement('video');
            video.className = 'w-full h-full object-contain';
            video.autoplay = false; // Changed to false to prevent auto-start
            video.playsInline = true;
            video.muted = useMultiPlayerStore.getState().isMutedAll;

            this.videoElements.set(streamId, video);
            this.addVideoElementListeners(video, streamId);
        }
        return this.videoElements.get(streamId);
    }

    async createAndLoadPlayer(playerState) {
        if (!playerState) {
            console.warn(
                '[MultiPlayerService] createAndLoadPlayer called with null state'
            );
            return;
        }

        const serializedOperation = async () => {
            if (!playerState) return;
            const { streamId } = playerState;
            const videoElement = this.getVideoElement(streamId);

            if (!this.players.has(streamId)) {
                const shaka = await getShaka();
                const player = new shaka.Player();
                await player.attach(videoElement);

                this.players.set(streamId, player);
                this.stallCalculators.set(streamId, new StallCalculator());

                player.addEventListener('error', (e) =>
                    this._handlePlayerError(
                        streamId,
                        /** @type {any} */ (e).detail
                    )
                );

                const { streams } = useAnalysisStore.getState();
                const streamDef = streams.find(
                    (s) => s.id === playerState.sourceStreamId
                );

                if (streamDef) {
                    player.streamAnalyzerStreamId = streamDef.id;
                    player.getNetworkingEngine().streamAnalyzerStreamId =
                        streamDef.id;

                    await this.loadStreamIntoPlayer(
                        streamDef,
                        player,
                        streamId,
                        playerState.initialState
                    );
                }
            }
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
            if (this.retryTimers.has(uniqueStreamId)) {
                clearTimeout(this.retryTimers.get(uniqueStreamId));
                this.retryTimers.delete(uniqueStreamId);
            }

            useMultiPlayerStore.getState().updatePlayerState(uniqueStreamId, {
                state: 'loading',
                error: null,
            });

            const drmConfig =
                await playerConfigService.buildDrmConfig(streamDef);
            player.configure({ drm: drmConfig });
            this.applyStreamConfig(uniqueStreamId);

            let startTime = initialState?.currentTime;
            await player.load(streamDef.originalUrl, startTime);

            const videoTracks = player.getVariantTracks();
            const activeVideoTrack = videoTracks.find((t) => t.active) || null;
            const videoEl = this.getVideoElement(uniqueStreamId);

            // Default to paused unless explicitly carrying over a playing state (e.g. duplication)
            let finalState = 'paused';
            if (initialState && !initialState.paused) {
                finalState = 'playing';
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

            if (finalState === 'playing') {
                await videoEl.play().catch((e) => {
                    console.warn(`Autoplay blocked for ${uniqueStreamId}`, e);
                    useMultiPlayerStore
                        .getState()
                        .updatePlayerState(uniqueStreamId, { state: 'paused' });
                });
            }
        } catch (error) {
            this._handlePlayerError(uniqueStreamId, error);
        }
    }

    addVideoElementListeners(videoElement, streamId) {
        const updateState = (state) =>
            useMultiPlayerStore
                .getState()
                .updatePlayerState(streamId, { state });
        videoElement.addEventListener('play', () => updateState('playing'));
        videoElement.addEventListener('playing', () => updateState('playing'));
        videoElement.addEventListener('pause', () => updateState('paused'));
        videoElement.addEventListener('ended', () => updateState('ended'));
        videoElement.addEventListener('waiting', () =>
            updateState('buffering')
        );
    }

    _handlePlayerError(streamId, error) {
        if (error.code === 7000) return;
        const message = parseShakaError(error);
        const store = useMultiPlayerStore.getState();
        const playerState = store.players.get(streamId);
        const streamName = playerState?.streamName || `Stream ${streamId}`;

        store.updatePlayerState(streamId, { state: 'error', error: message });
        store.logEvent({
            streamId,
            streamName,
            type: 'error',
            details: message,
            severity: 'critical',
        });

        if (store.isAutoResetEnabled) {
            const currentRetries = playerState?.retryCount || 0;
            if (currentRetries < MAX_RETRIES) {
                const nextRetryCount = currentRetries + 1;
                // Fix: Use secureRandom for jitter
                const backoff =
                    INITIAL_RETRY_DELAY_MS *
                    Math.pow(2, currentRetries) *
                    (1 + secureRandom() * JITTER_FACTOR);
                const delay = Math.min(backoff, 30000);

                store.updatePlayerState(streamId, {
                    retryCount: nextRetryCount,
                });

                if (this.retryTimers.has(streamId)) {
                    clearTimeout(this.retryTimers.get(streamId));
                }
                const timerId = setTimeout(() => {
                    if (this.players.has(streamId)) {
                        this.resetSinglePlayer(streamId);
                    }
                    this.retryTimers.delete(streamId);
                }, delay);
                this.retryTimers.set(streamId, timerId);
            } else {
                store.logEvent({
                    streamId,
                    streamName,
                    type: 'error',
                    details: `Auto-reset failed after ${MAX_RETRIES} attempts.`,
                    severity: 'critical',
                });
            }
        }
    }

    // ... (rest of the file matches previous output)
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
                    if (!videoEl || videoEl.readyState === 0) continue;

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

                    const { totalStalls, totalStallDuration } =
                        stallCalculator.update(shakaStats.stateHistory);

                    const prevStalls =
                        currentPlayerState.stats?.playbackQuality
                            ?.totalStalls || 0;
                    if (totalStalls > prevStalls) {
                        logEvent({
                            streamId,
                            streamName: currentPlayerState.streamName,
                            type: 'stall',
                            details: `Stall detected.`,
                            severity: 'warning',
                        });
                    }

                    let bufferEnd = 0;
                    const buffered = videoEl.buffered;
                    if (buffered) {
                        for (let i = 0; i < buffered.length; i++) {
                            if (
                                buffered.start(i) <=
                                    videoEl.currentTime + 0.1 &&
                                buffered.end(i) >= videoEl.currentTime
                            ) {
                                bufferEnd = buffered.end(i);
                                break;
                            }
                        }
                    }

                    const activeTrack = shakaPlayer
                        .getVariantTracks()
                        .find((t) => t.active);

                    const currentHistory =
                        currentPlayerState.playbackHistory || [];
                    const newEntry = {
                        time: videoEl.currentTime,
                        buffer: Math.max(0, bufferEnd - videoEl.currentTime),
                        loadLatency: shakaStats.loadLatency || 0,
                        bitrate: activeTrack?.videoBandwidth || 0,
                        bandwidth: shakaStats.estimatedBandwidth,
                        bufferHealth: Math.max(
                            0,
                            bufferEnd - videoEl.currentTime
                        ),
                    };
                    const updatedHistory = [...currentHistory, newEntry].slice(
                        -150
                    );

                    updates.push({
                        streamId,
                        updates: {
                            stats: {
                                playheadTime: videoEl.currentTime,
                                manifestTime: videoEl.duration,
                                playbackQuality: {
                                    resolution: `${shakaStats.width}x${shakaStats.height}`,
                                    droppedFrames: shakaStats.droppedFrames,
                                    corruptedFrames: shakaStats.corruptedFrames,
                                    totalStalls,
                                    totalStallDuration,
                                    timeToFirstFrame: 0,
                                    decodedFrames:
                                        shakaStats.decodedFrames || 0,
                                },
                                abr: {
                                    currentVideoBitrate:
                                        activeTrack?.videoBandwidth || 0,
                                    estimatedBandwidth:
                                        shakaStats.estimatedBandwidth,
                                    switchesUp: 0,
                                    switchesDown: 0,
                                    loadLatency: shakaStats.loadLatency,
                                },
                                buffer: {
                                    label: 'Buffer',
                                    seconds: newEntry.buffer,
                                    totalGaps: 0,
                                },
                                session: {
                                    totalPlayTime: shakaStats.playTime,
                                    totalBufferingTime:
                                        shakaStats.bufferingTime,
                                },
                            },
                            activeVideoTrack: activeTrack,
                            seekableRange,
                            normalizedPlayheadTime,
                            playbackHistory: updatedHistory,
                        },
                    });
                }

                if (updates.length > 0) batchUpdatePlayerState(updates);
            }
        );
    }

    stopStatsCollection() {
        if (this.tickerSubscription) {
            this.tickerSubscription();
            this.tickerSubscription = null;
        }
    }

    async destroyAll() {
        this.stopStatsCollection();
        this.retryTimers.forEach((timer) => clearTimeout(timer));
        this.retryTimers.clear();
        this.#loadQueue = Promise.resolve();
        for (const player of this.players.values()) await player.destroy();
        this.players.clear();
        this.videoElements.clear();
        this.stallCalculators.clear();
        useMultiPlayerStore.getState().clearPlayersAndLogs();
    }

    applyActionToSelected(action) {
        const { players } = useMultiPlayerStore.getState();
        const selectedPlayers = Array.from(players.values()).filter(
            (p) => p.selectedForAction
        );

        for (const playerState of selectedPlayers) {
            const videoEl = this.videoElements.get(playerState.streamId);
            if (!videoEl) continue;

            switch (action.type) {
                case 'play':
                    videoEl.play().catch(() => {});
                    break;
                case 'pause':
                    videoEl.pause();
                    break;
                case 'togglePlay':
                    if (videoEl.paused) videoEl.play().catch(() => {});
                    else videoEl.pause();
                    break;
                case 'mute':
                    videoEl.muted = true;
                    break;
                case 'unmute':
                    videoEl.muted = false;
                    break;
                case 'seekRelative':
                    if (videoEl.duration === Infinity) {
                        videoEl.currentTime += action.value;
                    } else {
                        videoEl.currentTime = Math.min(
                            Math.max(0, videoEl.currentTime + action.value),
                            videoEl.duration
                        );
                    }
                    break;
                case 'syncLive': {
                    const player = this.players.get(playerState.streamId);
                    if (player && player.isLive()) player.goToLive();
                    break;
                }
                case 'seek-frame-forward':
                    videoEl.currentTime += 0.04;
                    break;
                case 'seek-frame-backward':
                    videoEl.currentTime -= 0.04;
                    break;
            }
        }
    }

    applyConfigToSelected(config) {
        const { players, setStreamOverride } = useMultiPlayerStore.getState();
        const selectedPlayers = Array.from(players.values()).filter(
            (p) => p.selectedForAction
        );

        if (selectedPlayers.length === 0) {
            showToast({ message: 'No players selected.', type: 'warn' });
            return;
        }

        for (const playerState of selectedPlayers) {
            const shakaPlayer = this.players.get(playerState.streamId);
            if (!shakaPlayer) continue;

            const overrides = {};

            // 1. ABR
            if (config.abrEnabled !== undefined) {
                overrides.abr = config.abrEnabled;
                playerConfigService.setAbrEnabled(
                    shakaPlayer,
                    config.abrEnabled
                );
            }

            // 2. Max Height (Resolution Cap)
            if (config.maxHeight !== undefined) {
                overrides.maxHeight = config.maxHeight;
                // Apply directly to restrictions as well
                const currentConfig = shakaPlayer.getConfiguration();
                const restrictions = currentConfig.restrictions || {};
                restrictions.maxHeight = config.maxHeight;
                shakaPlayer.configure({ restrictions });
            }

            // 3. Bandwidth Cap
            if (config.maxBandwidth !== undefined) {
                overrides.maxBandwidth = config.maxBandwidth;
                const currentConfig = shakaPlayer.getConfiguration();
                const restrictions = currentConfig.restrictions || {};
                restrictions.maxBandwidth = config.maxBandwidth;
                shakaPlayer.configure({ restrictions });
            }

            // 4. Manual Track Selection
            if (config.trackByHeight !== undefined) {
                const found = playerConfigService.setGlobalTrackByHeight(
                    shakaPlayer,
                    config.trackByHeight
                );
                if (found) {
                    overrides.abr = false;
                }
            }

            // 5. Audio Language
            if (config.audioLanguage !== undefined) {
                playerConfigService.selectAudioLanguage(
                    shakaPlayer,
                    config.audioLanguage
                );
            }

            setStreamOverride(playerState.streamId, overrides);
        }

        showToast({
            message: `Updated settings for ${selectedPlayers.length} player(s).`,
            type: 'info',
        });
    }

    togglePlay(streamId) {
        const video = this.videoElements.get(streamId);
        if (video) video.paused ? video.play().catch(() => {}) : video.pause();
    }

    seek(time, streamId) {
        const video = this.videoElements.get(streamId);
        if (video) video.currentTime = time;
    }

    async removePlayer(streamId) {
        await this.destroyPlayer(streamId);
        useMultiPlayerStore.getState().removePlayer(streamId);
    }

    async destroyPlayer(streamId) {
        if (this.retryTimers.has(streamId)) {
            clearTimeout(this.retryTimers.get(streamId));
            this.retryTimers.delete(streamId);
        }

        const player = this.players.get(streamId);
        if (player) {
            await player.destroy();
            this.players.delete(streamId);
        }
        this.videoElements.delete(streamId);
        this.stallCalculators.delete(streamId);
    }

    async resetSinglePlayer(streamId) {
        const playerState = useMultiPlayerStore
            .getState()
            .players.get(streamId);
        if (!playerState) return;

        if (this.retryTimers.has(streamId)) {
            clearTimeout(this.retryTimers.get(streamId));
            this.retryTimers.delete(streamId);
        }

        if (this.players.has(streamId)) {
            await this.players.get(streamId).destroy();
            this.players.delete(streamId);
        }

        await this.createAndLoadPlayer(playerState);
    }

    async resetSelectedPlayers() {
        const { players } = useMultiPlayerStore.getState();
        const selectedIds = Array.from(players.values())
            .filter((p) => p.selectedForAction)
            .map((p) => p.streamId);

        if (selectedIds.length === 0) {
            showToast({
                message: 'No players selected for reset.',
                type: 'warn',
            });
            return;
        }

        for (const id of selectedIds) {
            await this.resetSinglePlayer(id);
        }

        showToast({
            message: `Resetting ${selectedIds.length} players...`,
            type: 'info',
        });
    }

    applyStreamConfig(streamId) {
        const { players } = useMultiPlayerStore.getState();
        const playerState = players.get(streamId);
        const shakaPlayer = this.players.get(streamId);
        if (playerState && shakaPlayer) {
            playerConfigService.applyStreamConfig(shakaPlayer, playerState);
        }
    }

    playAll() {
        this.videoElements.forEach((video) => video.play().catch(() => {}));
    }

    pauseAll() {
        this.videoElements.forEach((video) => video.pause());
    }

    muteAll() {
        this.videoElements.forEach((video) => (video.muted = true));
    }

    unmuteAll() {
        this.videoElements.forEach((video) => (video.muted = false));
    }

    syncAllTo(masterStreamId) {
        const masterVideo = this.videoElements.get(masterStreamId);
        const masterPlayer = this.players.get(masterStreamId);

        if (!masterVideo || !masterPlayer) {
            showToast({ message: 'Master player not ready.', type: 'warn' });
            return;
        }

        const isMasterLive = masterPlayer.isLive();
        let offsetFromLive = 0;
        if (isMasterLive) {
            const range = masterPlayer.seekRange();
            if (range.end > range.start) {
                offsetFromLive = range.end - masterVideo.currentTime;
            }
        }

        const masterState = !masterVideo.paused ? 'playing' : 'paused';

        this.videoElements.forEach((video, id) => {
            if (id === masterStreamId) return;
            const player = this.players.get(id);
            if (!player) return;

            const isPlayerLive = player.isLive();
            if (isMasterLive && isPlayerLive) {
                const seekable = player.seekRange();
                if (seekable.end > seekable.start) {
                    const target = Math.max(
                        seekable.start,
                        seekable.end - offsetFromLive
                    );
                    video.currentTime = Math.min(target, seekable.end);
                } else {
                    player.goToLive();
                }
            } else if (!isMasterLive && !isPlayerLive) {
                video.currentTime = Math.min(
                    masterVideo.currentTime,
                    video.duration || Infinity
                );
            }

            if (masterState === 'playing') {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });

        showToast({
            message: `Synced all players to stream #${masterStreamId}`,
            type: 'info',
        });
    }

    async resetAllPlayers() {
        const { players } = useMultiPlayerStore.getState();
        for (const streamId of players.keys()) {
            await this.resetSinglePlayer(streamId);
        }
    }

    async clearAndResetPlayers() {
        await this.destroyAll();
        const { streams } = useAnalysisStore.getState();
        useMultiPlayerStore.getState().initializePlayers(streams);
    }

    async resetFailedPlayers() {
        const { players } = useMultiPlayerStore.getState();
        let resetCount = 0;
        for (const [streamId, player] of players.entries()) {
            if (player.state === 'error') {
                await this.resetSinglePlayer(streamId);
                resetCount++;
            }
        }
        if (resetCount > 0) {
            showToast({
                message: `Resetting ${resetCount} failed players...`,
                type: 'info',
            });
        }
    }

    duplicateStream(sourceStreamId) {
        const store = useMultiPlayerStore.getState();
        const newId = store.duplicateStream(sourceStreamId);

        if (newId !== -1) {
            const freshStore = useMultiPlayerStore.getState();
            const newPlayerState = freshStore.players.get(newId);

            if (newPlayerState) {
                this.createAndLoadPlayer(newPlayerState);
            }
        }
    }

    selectTrack(streamId, type, value) {
        const player = this.players.get(streamId);
        if (!player) return;

        if (type === 'variant') {
            playerConfigService.selectVariantTrack(player, value);
        } else if (type === 'audio') {
            playerConfigService.selectAudioLanguage(player, value);
        }
    }

    setAbrEnabled(streamId, enabled) {
        const player = this.players.get(streamId);
        if (player) {
            playerConfigService.setAbrEnabled(player, enabled);
        }
    }
}

export const multiPlayerService = new MultiPlayerService();