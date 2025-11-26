import { useAnalysisStore } from '@/state/analysisStore';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { appLog } from '@/shared/utils/debug';
import { getShaka } from '@/infrastructure/player/shaka';
import { showToast } from '@/ui/components/toast';
import { eventBus } from '@/application/event-bus';
import { StallCalculator } from '../domain/stall-calculator.js';
import { parseShakaError } from '@/infrastructure/player/shaka-error';
import { playerConfigService } from './playerConfigService.js';

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;
const JITTER_FACTOR = 0.3;

class MultiPlayerService {
    #loadQueue = Promise.resolve();

    constructor() {
        this.players = new Map();
        this.videoElements = new Map();
        this.stallCalculators = new Map();
        this.tickerSubscription = null;
    }

    initialize() {
        appLog('MultiPlayerService.initialize', 'info', 'Service initialized.');
    }

    async bindMediaElement(streamId, element) {
        if (!element) return;
        this.videoElements.set(streamId, element);
        element.disablePictureInPicture = true;
        element.muted = useMultiPlayerStore.getState().isMutedAll;
        this.addVideoElementListeners(element, streamId);

        const player = this.players.get(streamId);
        if (player) {
            try {
                await player.attach(element);
                if (!player.getAssetUri()) {
                    const { players } = useMultiPlayerStore.getState();
                    const playerState = players.get(streamId);
                    if (playerState) {
                        const { streams } = useAnalysisStore.getState();
                        const streamDef = streams.find(
                            (s) => s.id === playerState.sourceStreamId
                        );
                        if (streamDef) {
                            await this.loadStreamIntoPlayer(
                                streamDef,
                                player,
                                streamId,
                                playerState.initialState
                            );
                        }
                    }
                }
            } catch (e) {
                console.error(`Attach failed for ${streamId}`, e);
            }
        }
    }

    async unbindMediaElement(streamId) {
        const player = this.players.get(streamId);
        if (player) await player.detach().catch(() => {});
        this.videoElements.delete(streamId);
    }

    async createAndLoadPlayer(playerState) {
        const serializedOperation = async () => {
            const { streamId } = playerState;
            if (!playerState || this.players.has(streamId)) return;

            const shaka = await getShaka();
            const player = new shaka.Player();
            this.players.set(streamId, player);
            this.stallCalculators.set(streamId, new StallCalculator());

            player.addEventListener('error', (e) =>
                this._handlePlayerError(streamId, /** @type {any} */ (e).detail)
            );

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
            useMultiPlayerStore
                .getState()
                .updatePlayerState(uniqueStreamId, {
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
            const videoEl = this.videoElements.get(uniqueStreamId);

            let finalState = 'paused';
            if (initialState && videoEl) {
                videoEl.currentTime = initialState.currentTime;
                if (!initialState.paused) finalState = 'playing';
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
                await videoEl.play().catch((e) => {
                    console.warn(`Autoplay blocked for ${uniqueStreamId}`);
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
        if (error.code === 7000) return; // Ignore LOAD_INTERRUPTED
        const message = parseShakaError(error);

        // Update State
        useMultiPlayerStore
            .getState()
            .updatePlayerState(streamId, { state: 'error', error: message });

        // Log to Event History
        const playerState = useMultiPlayerStore
            .getState()
            .players.get(streamId);
        useMultiPlayerStore.getState().logEvent({
            streamId,
            streamName: playerState?.streamName || `Stream ${streamId}`,
            type: 'error',
            details: message,
            severity: 'critical',
        });
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

                    // Detect NEW stalls by comparing against previous state
                    const prevStalls =
                        currentPlayerState.stats?.playbackQuality
                            ?.totalStalls || 0;
                    if (totalStalls > prevStalls) {
                        logEvent({
                            streamId,
                            streamName: currentPlayerState.streamName,
                            type: 'stall',
                            details: `Stall detected. Buffer dropped to 0.`,
                            severity: 'warning',
                        });
                    }

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
                    }

                    const activeTrack = shakaPlayer
                        .getVariantTracks()
                        .find((t) => t.active);

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
                                },
                                abr: {
                                    currentVideoBitrate:
                                        activeTrack?.videoBandwidth || 0,
                                    estimatedBandwidth:
                                        shakaStats.estimatedBandwidth,
                                    switchesUp: 0,
                                    switchesDown: 0,
                                },
                                buffer: {
                                    label: 'Buffer',
                                    seconds: Math.max(
                                        0,
                                        bufferEnd - videoEl.currentTime
                                    ),
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
                case 'syncLive':
                    const player = this.players.get(playerState.streamId);
                    if (player && player.isLive()) player.goToLive();
                    break;
            }
        }
    }

    applyConfigToSelected(config) {
        const { players, setStreamOverride } = useMultiPlayerStore.getState();
        const selectedPlayers = Array.from(players.values()).filter(
            (p) => p.selectedForAction
        );

        for (const playerState of selectedPlayers) {
            const shakaPlayer = this.players.get(playerState.streamId);
            if (!shakaPlayer) continue;

            if (config.abrEnabled !== undefined) {
                setStreamOverride(playerState.streamId, {
                    abr: config.abrEnabled,
                });
                playerConfigService.setAbrEnabled(
                    shakaPlayer,
                    config.abrEnabled
                );
            }

            if (config.trackByHeight !== undefined) {
                if (
                    playerConfigService.setGlobalTrackByHeight(
                        shakaPlayer,
                        config.trackByHeight
                    )
                ) {
                    setStreamOverride(playerState.streamId, { abr: false });
                }
            }
        }
        showToast({
            message: `Updated configuration for ${selectedPlayers.length} players.`,
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
        if (playerState) {
            useMultiPlayerStore
                .getState()
                .updatePlayerState(streamId, { state: 'loading', error: null });
            const player = this.players.get(streamId);
            const videoEl = this.videoElements.get(streamId);
            const { streams } = useAnalysisStore.getState();
            const streamDef = streams.find(
                (s) => s.id === playerState.sourceStreamId
            );
            if (player && videoEl && streamDef) {
                await this.loadStreamIntoPlayer(streamDef, player, streamId);
            }
        }
    }

    applyStreamConfig(streamId) {
        const { players, globalAbrEnabled } = useMultiPlayerStore.getState();
        const playerState = players.get(streamId);
        const shakaPlayer = this.players.get(streamId);
        if (playerState && shakaPlayer) {
            const abr = playerState.abrOverride ?? globalAbrEnabled;
            playerConfigService.setAbrEnabled(shakaPlayer, abr);
        }
    }

    // --- Global Operations ---

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

    /**
     * Synchronizes all players to the timeline of the master stream.
     * Handles both VOD (absolute time) and Live (offset from live edge).
     */
    syncAllTo(masterStreamId) {
        const masterVideo = this.videoElements.get(masterStreamId);
        const masterPlayer = this.players.get(masterStreamId);

        if (!masterVideo || !masterPlayer) return;

        const isMasterLive = masterPlayer.isLive();

        // Calculate sync targets
        let targetTime = masterVideo.currentTime;
        let offsetFromLive = 0;

        if (isMasterLive) {
            const seekable = masterPlayer.seekRange();
            // Calculate how far behind the live edge the master is
            offsetFromLive = seekable.end - masterVideo.currentTime;
        }

        const masterState = !masterVideo.paused ? 'playing' : 'paused';

        this.videoElements.forEach((video, id) => {
            if (id === masterStreamId) return;

            const player = this.players.get(id);
            if (!player) return;

            if (isMasterLive && player.isLive()) {
                // Syncing Live to Live: Use offset from edge
                const seekable = player.seekRange();
                const target = Math.max(
                    seekable.start,
                    seekable.end - offsetFromLive
                );
                video.currentTime = target;
            } else {
                // Syncing VOD to VOD (or mixed): Use absolute time
                // Clamp to duration to avoid errors
                const safeTime = Math.min(
                    targetTime,
                    video.duration || Infinity
                );
                video.currentTime = safeTime;
            }

            // Sync playback state
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
        for (const [streamId, player] of players.entries()) {
            if (player.state === 'error') {
                await this.resetSinglePlayer(streamId);
            }
        }
    }

    setGlobalAbr(enabled) {
        this.players.forEach((player) =>
            playerConfigService.setAbrEnabled(player, enabled)
        );
    }

    setGlobalBandwidthCap(bps) {
        this.players.forEach((player) => {
            const config = player.getConfiguration();
            const restrictions = config.restrictions || {};
            restrictions.maxBandwidth = bps;
            player.configure({ restrictions });
        });
    }

    setGlobalMaxHeight(height) {
        this.players.forEach((player) => {
            const config = player.getConfiguration();
            const restrictions = config.restrictions || {};
            restrictions.maxHeight = height;
            player.configure({ restrictions });
        });
    }

    setGlobalTrackByHeight(height) {
        this.players.forEach((player) => {
            playerConfigService.setGlobalTrackByHeight(player, height);
        });
    }

    selectTrack(streamId, type, value) {
        const player = this.players.get(streamId);
        if (!player) return;

        if (type === 'variant') {
            // value is the track object
            playerConfigService.selectVariantTrack(player, value);
        } else if (type === 'audio') {
            // value is language string
            playerConfigService.selectAudioLanguage(player, value);
        }
    }

    setAbrEnabled(streamId, enabled) {
        const player = this.players.get(streamId);
        if (player) {
            playerConfigService.setAbrEnabled(player, enabled);
        }
    }

    duplicateStream(sourceStreamId) {
        const state = useMultiPlayerStore.getState();
        const playerState = state.players.get(sourceStreamId);
        if (!playerState) return;

        const newId = state.duplicateStream(sourceStreamId);
        if (newId !== -1) {
            const newPlayerState = state.players.get(newId);
            // Schedule creation
            this.createAndLoadPlayer(newPlayerState);
        }
    }
}

export const multiPlayerService = new MultiPlayerService();
