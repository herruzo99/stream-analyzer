import { useAnalysisStore } from '@/state/analysisStore';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { workerService } from '@/infrastructure/worker/workerService';
import { debugLog } from '@/shared/utils/debug';
import { getShaka } from '@/infrastructure/player/shaka';
import shaka from 'shaka-player/dist/shaka-player.compiled';

/**
 * Calculates stall metrics by analyzing the player's state history.
 * @param {shaka.extern.StateChange[]} stateHistory
 * @returns {{totalStalls: number, totalStallDuration: number}}
 */
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
    /** @type {Promise<void>} */
    #loadQueue = Promise.resolve();

    constructor() {
        /** @type {Map<number, shaka.Player>} */
        this.players = new Map();
        this.videoElements = new Map();
        this.statsInterval = null;
    }

    initialize() {
        debugLog('MultiPlayerService.initialize', 'Service initialized.');
    }

    async setupPlayersForStreams(streams) {
        debugLog(
            'MultiPlayerService.setupPlayersForStreams',
            `Synchronizing ${streams.length} streams.`
        );
        const shaka = await getShaka();
        if (!shaka) return;

        const { addPlayer, removePlayer } = useMultiPlayerStore.getState();
        const currentStreamIds = new Set(Array.from(this.players.keys()));
        const newStreamIds = new Set(streams.map((s) => s.id));

        for (const streamId of currentStreamIds) {
            if (!newStreamIds.has(streamId)) {
                debugLog(
                    'MultiPlayerService.setupPlayersForStreams',
                    `Destroying player for removed stream ID: ${streamId}`
                );
                const player = this.players.get(streamId);
                if (player) await player.destroy();
                this.players.delete(streamId);
                this.videoElements.delete(streamId);
                removePlayer(streamId);
            }
        }

        for (const stream of streams) {
            if (!currentStreamIds.has(stream.id) && stream.originalUrl) {
                debugLog(
                    'MultiPlayerService.setupPlayersForStreams',
                    `Creating new player for stream ID: ${stream.id}`
                );
                const player = new shaka.Player();
                /** @type {any} */ (player).streamAnalyzerStreamId = stream.id;
                /** @type {any} */ (
                    player.getNetworkingEngine()
                ).streamAnalyzerStreamId = stream.id;
                player.addEventListener('error', (e) =>
                    this._handlePlayerError(stream.id, e.detail)
                );
                this.players.set(stream.id, player);
                const streamType =
                    stream.manifest?.type === 'dynamic' ? 'live' : 'vod';
                addPlayer(
                    stream.id,
                    stream.name,
                    stream.originalUrl,
                    streamType
                );
            }
        }
    }

    async loadStreamIntoPlayer(stream, player, videoElement) {
        try {
            useMultiPlayerStore
                .getState()
                .updatePlayerState(stream.id, { state: 'loading' });
            const { security } = stream.manifest?.summary || {};
            const drmConfig = { servers: {}, advanced: {} };
            if (security?.isEncrypted) {
                const licenseServerUrl =
                    stream.drmAuth.licenseServerUrl ||
                    security.licenseServerUrls?.[0] ||
                    '';
                const headers = {};
                (stream.drmAuth?.headers || []).forEach((h) => {
                    if (h.key) headers[h.key] = h.value;
                });
                const cert = await fetchCertificate(
                    stream.drmAuth.serverCertificate
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

            const { globalAbrEnabled, globalMaxHeight, globalBufferingGoal } =
                useMultiPlayerStore.getState();
            player.configure({
                abr: { enabled: globalAbrEnabled },
                streaming: { bufferingGoal: globalBufferingGoal },
            });
            if (isFinite(globalMaxHeight)) {
                player.configure({
                    restrictions: { maxHeight: globalMaxHeight },
                });
            }
            await player.load(stream.originalUrl, 0, undefined, {
                drm: drmConfig,
            });
            useMultiPlayerStore
                .getState()
                .updatePlayerState(stream.id, { state: 'paused', error: null });
            videoElement.muted = useMultiPlayerStore.getState().isMutedAll;
        } catch (error) {
            this._handlePlayerError(stream.id, error);
        }
    }

    async handleVideoElementReady(streamId, videoElement) {
        if (!videoElement || !this.players.has(streamId)) return;
        const player = this.players.get(streamId);
        const { streams } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === streamId);
        if (!stream || this.videoElements.get(streamId) === videoElement)
            return;

        await player.attach(videoElement);
        this.videoElements.set(streamId, videoElement);

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

        this.#loadQueue = this.#loadQueue.then(() => {
            if (this.players.has(streamId)) {
                return this.loadStreamIntoPlayer(stream, player, videoElement);
            }
        });
    }

    _handlePlayerError(streamId, error) {
        if (error.code === 7000) {
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
    async destroyAll() {
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
            if (enabled) {
                p.selectVariantTrack(null, false);
            }
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
                useMultiPlayerStore.getState().setGlobalAbrEnabled(false);
                player.selectVariantTrack(track, true);
            }
        } else if (type === 'audio') {
            player.selectAudioLanguage(id);
        }
    }
}

export const multiPlayerService = new MultiPlayerService();
