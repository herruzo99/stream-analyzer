import { useAnalysisStore } from '@/state/analysisStore';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { workerService } from '@/infrastructure/worker/workerService';
import { debugLog } from '@/shared/utils/debug';
import { getShaka } from '@/infrastructure/player/shaka';
import shaka from 'shaka-player/dist/shaka-player.compiled';
import { showToast } from '@/ui/components/toast';

function calculateStallMetrics(stateHistory) {
    let totalStalls = 0;
    let totalStallDuration = 0;
    if (!stateHistory || stateHistory.length < 2) {
        return { totalStalls, totalStallDuration };
    }
    const firstPlayIndex = stateHistory.findIndex((s) => s.state === 'playing');
    if (firstPlayIndex > -1) {
        for (let i = firstPlayIndex + 1; i < stateHistory.length; i++) {
            const [prevState, currentState] = [
                stateHistory[i - 1],
                stateHistory[i],
            ];
            if (
                currentState.state === 'buffering' &&
                prevState.state !== 'buffering'
            )
                totalStalls++;
            if (prevState.state === 'buffering')
                totalStallDuration +=
                    currentState.timestamp - prevState.timestamp;
        }
    }
    return { totalStalls, totalStallDuration: totalStallDuration / 1000 };
}

async function fetchCertificate(url) {
    try {
        if (!url) return null;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.arrayBuffer();
    } catch (e) {
        console.error('Failed to fetch DRM service certificate:', e);
        throw e;
    }
}

class MultiPlayerService {
    #loadQueue = Promise.resolve();

    constructor() {
        /** @type {Map<number, shaka.Player>} */
        this.players = new Map();
        /** @type {Map<number, HTMLVideoElement>} */
        this.videoElements = new Map();
        this.statsInterval = null;
    }

    initialize() {
        debugLog('MultiPlayerService.initialize', 'Service initialized.');
    }

    createVideoElement(streamId) {
        if (this.videoElements.has(streamId)) {
            return this.videoElements.get(streamId);
        }
        const videoElement = document.createElement('video');
        videoElement.className = 'w-full h-full';
        videoElement.muted = useMultiPlayerStore.getState().isMutedAll;
        this.videoElements.set(streamId, videoElement);
        return videoElement;
    }

    async createAndLoadPlayer(playerState) {
        const serializedOperation = async () => {
            const { streamId } = playerState;
            debugLog(
                'MultiPlayerService.createAndLoadPlayer',
                `[START QUEUED] for stream ${streamId}`
            );

            if (!playerState || this.players.has(streamId)) {
                debugLog(
                    'MultiPlayerService.createAndLoadPlayer',
                    `[ABORT QUEUED] Player for stream ${streamId} already exists or state is invalid.`
                );
                return;
            }

            const shaka = await getShaka();
            const player = new shaka.Player();
            this.players.set(streamId, player);
            debugLog(
                'MultiPlayerService.createAndLoadPlayer',
                `Created new Shaka player for stream ${streamId}`
            );

            player.addEventListener('error', (e) =>
                this._handlePlayerError(streamId, e.detail)
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
                    this.addVideoElementListeners(videoElement, streamId);
                    await this.loadStreamIntoPlayer(
                        streamDef,
                        player,
                        streamId
                    );
                } else {
                    debugLog(
                        'MultiPlayerService.createAndLoadPlayer',
                        `Video element for stream ${streamId} not found.`
                    );
                }
            }
            debugLog(
                'MultiPlayerService.createAndLoadPlayer',
                `[END QUEUED] for stream ${streamId}`
            );
        };

        this.#loadQueue = this.#loadQueue.then(() => serializedOperation());
        return this.#loadQueue;
    }

    async loadStreamIntoPlayer(streamDef, player, uniqueStreamId) {
        try {
            debugLog(
                'MultiPlayerService.loadStreamIntoPlayer',
                `[START LOAD] for stream ${uniqueStreamId}`
            );
            const { security } = streamDef.manifest?.summary || {};
            const drmConfig = { servers: {}, advanced: {} };
            if (security?.isEncrypted) {
                const licenseServerUrl =
                    streamDef.drmAuth.licenseServerUrl ||
                    security.licenseServerUrls?.[0] ||
                    '';
                const headers = {};
                (streamDef.drmAuth?.headers || []).forEach((h) => {
                    if (h.key) headers[h.key] = h.value;
                });
                const cert = await fetchCertificate(
                    streamDef.drmAuth.serverCertificate
                );
                for (const system of security.systems) {
                    if (system.systemId.includes('widevine')) {
                        drmConfig.servers['com.widevine.alpha'] =
                            licenseServerUrl;
                        drmConfig.advanced['com.widevine.alpha'] = {
                            serverCertificate: cert
                                ? new Uint8Array(cert)
                                : undefined,
                            headers,
                        };
                    } else if (system.systemId.includes('playready')) {
                        drmConfig.servers['com.microsoft.playready'] =
                            licenseServerUrl;
                    }
                }
            }

            this.applyStreamConfig(uniqueStreamId);

            await player.load(streamDef.originalUrl, 0, undefined, {
                drm: drmConfig,
            });
            debugLog(
                'MultiPlayerService.loadStreamIntoPlayer',
                `[END LOAD] SUCCESS for stream ${uniqueStreamId}`
            );
            useMultiPlayerStore
                .getState()
                .updatePlayerState(uniqueStreamId, {
                    state: 'paused',
                    error: null,
                });
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
            debugLog(
                'MultiPlayerService',
                `Load interrupted for stream ${streamId}. Ignoring.`
            );
            return;
        }
        console.error(`Player error for stream ${streamId}:`, error);
        const player = useMultiPlayerStore.getState().players.get(streamId);
        useMultiPlayerStore.getState().updatePlayerState(streamId, {
            state: 'error',
            health: 'critical',
            error: `Error ${error.code}: ${error.message}`,
        });
        if (player)
            useMultiPlayerStore.getState().logEvent({
                streamId,
                streamName: player.streamName,
                type: 'error',
                details: `Shaka Error ${error.code}: ${error.message}`,
                severity: 'critical',
            });
    }

    startStatsCollection() {
        if (this.statsInterval) clearInterval(this.statsInterval);
        this.statsInterval = setInterval(() => {
            const { players } = useMultiPlayerStore.getState();
            for (const [streamId, player] of this.players.entries()) {
                const videoEl = this.videoElements.get(streamId);
                if (
                    !player ||
                    !videoEl ||
                    videoEl.readyState === 0 ||
                    !videoEl.duration
                )
                    continue;

                const shakaStats = player.getStats();
                const currentPlayerState = players.get(streamId);
                if (!currentPlayerState) continue;

                const activeVariant = player
                    .getVariantTracks()
                    .find((track) => track.active);
                const { totalStalls, totalStallDuration } =
                    calculateStallMetrics(shakaStats.stateHistory);
                const isLive = player.isLive();
                const bufferHealth = isLive
                    ? shakaStats.liveLatency
                    : shakaStats.bufferEnd - videoEl.currentTime;
                const newHistoryEntry = {
                    time: Date.now(),
                    buffer: isNaN(bufferHealth) ? 0 : bufferHealth,
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
                        droppedFrames: shakaStats.droppedFrames,
                        corruptedFrames: shakaStats.corruptedFrames,
                        totalStalls,
                        totalStallDuration,
                        timeToFirstFrame: 0,
                    },
                    abr: {
                        currentVideoBitrate: activeVariant?.videoBandwidth || 0,
                        estimatedBandwidth: shakaStats.estimatedBandwidth,
                        switchesUp: 0,
                        switchesDown: 0,
                    },
                    buffer: {
                        bufferHealth,
                        liveLatency: shakaStats.liveLatency,
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
                        useMultiPlayerStore.getState().logEvent({
                            streamId,
                            streamName: currentPlayerState.streamName,
                            type: 'stall',
                            details: `Stall detected at playhead time ${newStats.playheadTime.toFixed(
                                2
                            )}s`,
                            severity: 'critical',
                        });
                    } else if (
                        newStats.playbackQuality.droppedFrames >
                        lastStats.playbackQuality.droppedFrames
                    ) {
                        health = 'warning';
                        useMultiPlayerStore.getState().logEvent({
                            streamId,
                            streamName: currentPlayerState.streamName,
                            type: 'dropped-frames',
                            details: `${
                                newStats.playbackQuality.droppedFrames -
                                lastStats.playbackQuality.droppedFrames
                            } frames dropped.`,
                            severity: 'warning',
                        });
                    }
                }
                useMultiPlayerStore.getState().updatePlayerState(streamId, {
                    stats: newStats,
                    playbackHistory: newPlaybackHistory,
                    health,
                });
            }
        }, 1000);
    }

    stopStatsCollection() {
        if (this.statsInterval) clearInterval(this.statsInterval);
        this.statsInterval = null;
    }

    async destroyPlayer(streamId) {
        debugLog(
            'MultiPlayerService.destroyPlayer',
            `Destroying player for stream ${streamId}`
        );
        const player = this.players.get(streamId);
        if (player) {
            await player.destroy();
            this.players.delete(streamId);
        }
        this.videoElements.delete(streamId);
        useMultiPlayerStore.getState().removePlayer(streamId);
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

        this.destroyPlayer(streamId);
    }

    async destroyAll() {
        debugLog('MultiPlayerService.destroyAll', 'Destroying all players.');
        this.stopStatsCollection();
        this.#loadQueue = Promise.resolve();
        for (const player of this.players.values()) await player.destroy();
        this.players.clear();
        this.videoElements.clear();
        useMultiPlayerStore.getState().reset();
    }

    async playAll() {
        for (const [id, video] of this.videoElements.entries()) {
            try {
                await video.play();
            } catch (e) {
                this._handlePlayerError(id, {
                    code: 'PLAYBACK_FAILED',
                    message: e.message,
                });
            }
        }
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
    seekAll(time) {
        for (const v of this.videoElements.values()) v.currentTime = time;
    }

    setGlobalAbr(enabled) {
        for (const p of this.players.values()) {
            p.configure({ abr: { enabled } });
        }
    }
    setGlobalRestrictions(restrictions) {
        for (const p of this.players.values()) p.configure({ restrictions });
    }
    setGlobalBufferingGoal(goal) {
        for (const p of this.players.values())
            p.configure({ streaming: { bufferingGoal: goal } });
    }
    selectTrack(streamId, type, id) {
        const player = this.players.get(streamId);
        if (!player) return;
        if (type === 'variant') {
            const track = player.getVariantTracks().find((t) => t.id === id);
            if (track) {
                player.configure({ abr: { enabled: false } });
                player.selectVariantTrack(track, true);
            }
        } else if (type === 'audio') {
            player.selectAudioLanguage(id);
        }
    }

    applyStreamConfig(streamId) {
        const {
            players,
            globalAbrEnabled,
            globalMaxHeight,
            globalBufferingGoal,
        } = useMultiPlayerStore.getState();
        const playerState = players.get(streamId);
        const shakaPlayer = this.players.get(streamId);
        if (!playerState || !shakaPlayer) return;

        const abrEnabled =
            playerState.abrOverride !== null
                ? playerState.abrOverride
                : globalAbrEnabled;
        const maxHeight =
            playerState.maxHeightOverride !== null
                ? playerState.maxHeightOverride
                : globalMaxHeight;
        const bufferingGoal =
            playerState.bufferingGoalOverride !== null
                ? playerState.bufferingGoalOverride
                : globalBufferingGoal;

        shakaPlayer.configure({
            abr: { enabled: abrEnabled },
            restrictions: { maxHeight },
            streaming: { bufferingGoal },
        });
    }

    duplicateStream(sourceStreamId) {
        // This action only updates the store. The UI component (`grid-view`)
        // is responsible for detecting the new player in the state
        // and triggering its creation via `createAndLoadPlayer`.
        useMultiPlayerStore.getState().duplicateStream(sourceStreamId);
    }

    applyActionToSelected(action) {
        const { players } = useMultiPlayerStore.getState();
        const selectedPlayers = Array.from(players.values()).filter(
            (p) => p.selectedForAction
        );

        for (const playerState of selectedPlayers) {
            const videoEl = this.videoElements.get(playerState.streamId);
            if (videoEl) {
                if (action.type === 'seek') {
                    videoEl.currentTime = Math.max(
                        0,
                        videoEl.currentTime + action.delta
                    );
                } else if (action.type === 'play') {
                    videoEl.play();
                } else if (action.type === 'pause') {
                    videoEl.pause();
                }
            }
        }
    }
}

export const multiPlayerService = new MultiPlayerService();