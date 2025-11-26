import { eventBus } from '@/application/event-bus';
import { useAnalysisStore } from '@/state/analysisStore';
import { playerActions, usePlayerStore } from '@/state/playerStore';
import { getShaka } from '@/infrastructure/player/shaka';
import { formatBitrate } from '@/ui/shared/format';
import { StallCalculator } from '@/features/multiPlayer/domain/stall-calculator';
import { parseShakaError } from '@/infrastructure/player/shaka-error';
import { playerConfigService } from './playerConfigService.js';
import { appLog } from '@/shared/utils/debug';

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;
const JITTER_FACTOR = 0.3;

class PlayerService {
    constructor() {
        this.player = null;
        this.statsInterval = null;
        this.activeStreamIds = new Set();
        this.activeManifestVariants = [];
        this.isInitialized = false;
        // this.ui = null; // REMOVED: We control the UI manually now
        this.tickerSubscription = null;
        this.stallCalculator = new StallCalculator();
    }

    getActiveStreamIds() {
        return this.activeStreamIds;
    }

    _updateStatsAndPlaybackInfo() {
        if (!this.player) return;

        const shakaStats = this.player.getStats();
        const { abrHistory, currentStats } = usePlayerStore.getState();
        const lastBitrate = abrHistory[0]?.bitrate;
        const videoEl = this.player.getMediaElement();
        if (!videoEl) return;

        const rawVariantTracks = this.player.getVariantTracks();
        const activeVariant = rawVariantTracks.find((t) => t.active);

        const videoTracks = this.player.getVariantTracks();
        const audioTracks = this.player.getAudioLanguagesAndRoles();
        const textTracks = this.player.getTextTracks();

        playerActions.updatePlaybackInfo({
            videoTracks,
            audioTracks,
            textTracks,
            activeVideoTrack: activeVariant,
            activeAudioTrack: audioTracks.find((t) => t.active),
            activeTextTrack: textTracks.find((t) => t.active),
        });

        const videoOnlyBitrate = activeVariant?.videoBandwidth || 0;
        if (videoOnlyBitrate && videoOnlyBitrate !== lastBitrate) {
            playerActions.logAbrSwitch({
                time: shakaStats.playTime || 0,
                bitrate: videoOnlyBitrate,
                width: shakaStats.width || 0,
                height: shakaStats.height || 0,
            });
        }

        let timeToFirstFrame =
            currentStats?.playbackQuality.timeToFirstFrame || 0;

        if (timeToFirstFrame === 0 && shakaStats.stateHistory.length > 1) {
            const loadingState = shakaStats.stateHistory.find(
                (s) => s.state === 'loading'
            );
            const firstPlayingState = shakaStats.stateHistory.find(
                (s) => s.state === 'playing'
            );
            if (loadingState && firstPlayingState) {
                timeToFirstFrame =
                    firstPlayingState.timestamp - loadingState.timestamp;
            }
        }

        const { totalStalls, totalStallDuration } = this.stallCalculator.update(
            shakaStats.stateHistory
        );

        let switchesUp = 0;
        let switchesDown = 0;
        if (shakaStats.switchHistory) {
            const variantSwitches = shakaStats.switchHistory.filter(
                (s) => s.type === 'variant' && s.bandwidth
            );
            for (let i = 1; i < variantSwitches.length; i++) {
                if (
                    variantSwitches[i].bandwidth >
                    variantSwitches[i - 1].bandwidth
                ) {
                    switchesUp++;
                } else if (
                    variantSwitches[i].bandwidth <
                    variantSwitches[i - 1].bandwidth
                ) {
                    switchesDown++;
                }
            }
        }

        const seekRange = this.player.seekRange();
        const manifestTime = seekRange.end - seekRange.start;
        const playheadTime = videoEl.currentTime;
        const isLive = this.player.isLive();

        // --- Enhanced Buffer Calculation ---
        let bufferEnd = 0;
        const buffered = videoEl.buffered;
        if (buffered) {
            for (let i = 0; i < buffered.length; i++) {
                if (
                    buffered.start(i) <= playheadTime &&
                    buffered.end(i) >= playheadTime
                ) {
                    bufferEnd = buffered.end(i);
                    break;
                }
            }
            if (bufferEnd === 0 && buffered.length > 0) {
                bufferEnd = buffered.end(buffered.length - 1);
            }
        }
        const forwardBuffer = Math.max(0, bufferEnd - playheadTime);

        // Retrieve separate audio/video buffer info if available (Shaka specific internal structure,
        // but accessible via getBufferedInfo() in newer versions, or we infer from buffered ranges)
        // For now, we rely on the unified buffer, but we can expose loaded bytes.

        const bufferInfo = {
            label: /** @type {'Live Latency' | 'Buffer Health'} */ (
                isLive ? 'Live Latency' : 'Buffer Health'
            ),
            seconds: isLive ? shakaStats.liveLatency || 0 : forwardBuffer,
            forwardBuffer: forwardBuffer,
        };

        const newStats = {
            playheadTime: playheadTime,
            manifestTime: manifestTime,
            playbackQuality: {
                resolution: `${shakaStats.width || 0}x${shakaStats.height || 0}`,
                droppedFrames: shakaStats.droppedFrames || 0,
                corruptedFrames: shakaStats.corruptedFrames || 0,
                totalStalls: totalStalls,
                totalStallDuration: totalStallDuration,
                timeToFirstFrame: timeToFirstFrame,
                decodedFrames: shakaStats.decodedFrames || 0, // NEW
            },
            abr: {
                currentVideoBitrate: videoOnlyBitrate,
                estimatedBandwidth: shakaStats.estimatedBandwidth || 0,
                switchesUp: switchesUp,
                switchesDown: switchesDown,
                loadLatency: shakaStats.loadLatency || 0, // NEW: Time to download last segment
            },
            buffer: {
                label: bufferInfo.label,
                seconds: bufferInfo.seconds,
                forwardBuffer: bufferInfo.forwardBuffer,
                totalGaps: shakaStats.gapsJumped || 0,
            },
            session: {
                totalPlayTime: shakaStats.playTime || 0,
                totalBufferingTime: shakaStats.bufferingTime || 0,
            },
        };

        playerActions.updateStats(newStats);
    }

    async initialize(videoEl, videoContainer) {
        if (this.isInitialized) {
            return;
        }

        const shaka = await getShaka();
        if (!shaka) {
            console.error('Shaka Player module not loaded correctly.');
            return;
        }

        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) {
            console.error('Shaka Player is not supported by this browser.');
            return;
        }

        this.player = new shaka.Player();
        await this.player.attach(videoEl);

        // --- ARCHITECTURAL CHANGE: Removed Shaka UI Overlay initialization ---
        // We are now managing all controls via our custom UI to prevent conflict and
        // allow for a "Glass Cockpit" aesthetic.

        const videoElement = this.player.getMediaElement();
        if (!videoElement) {
            console.error(
                'Shaka player did not attach to the video element correctly.'
            );
            return;
        }

        // Ensure native controls are off
        videoElement.controls = false;
        videoElement.muted = usePlayerStore.getState().isMuted;

        this.player.streamAnalyzerStreamId = null;
        this.player.getNetworkingEngine().streamAnalyzerStreamId = null;

        this.player.addEventListener('error', this.onErrorEvent.bind(this));
        this.player.addEventListener(
            'adaptation',
            this.onAdaptationEvent.bind(this)
        );
        this.player.addEventListener(
            'buffering',
            this.onBufferingEvent.bind(this)
        );

        this.player.addEventListener('loading', (e) =>
            eventBus.dispatch('player:loading', e)
        );
        this.player.addEventListener('loaded', (e) =>
            eventBus.dispatch('player:loaded', e)
        );
        this.player.addEventListener('streaming', (e) =>
            eventBus.dispatch('player:streaming', e)
        );
        this.player.addEventListener('ratechange', (e) =>
            eventBus.dispatch('player:ratechange', {
                rate: videoElement.playbackRate,
            })
        );
        this.player.addEventListener('emsg', (e) => {
            const { streams, activeStreamId } = useAnalysisStore.getState();
            const stream = streams.find((s) => s.id === activeStreamId);
            if (stream) {
                eventBus.dispatch('player:emsg', { ...e.detail, stream });
            }
        });
        this.player.addEventListener('texttrackvisibility', (e) =>
            eventBus.dispatch(
                'player:texttrackvisibility',
                /** @type {any} */ (e).detail
            )
        );

        videoElement.addEventListener('play', () =>
            playerActions.updatePlaybackInfo({ playbackState: 'PLAYING' })
        );
        videoElement.addEventListener('playing', () =>
            playerActions.updatePlaybackInfo({ playbackState: 'PLAYING' })
        );
        videoElement.addEventListener('pause', () =>
            playerActions.updatePlaybackInfo({ playbackState: 'PAUSED' })
        );
        videoElement.addEventListener('ended', () =>
            playerActions.updatePlaybackInfo({ playbackState: 'ENDED' })
        );
        videoElement.addEventListener('waiting', () =>
            playerActions.updatePlaybackInfo({ playbackState: 'BUFFERING' })
        );
        videoElement.addEventListener('volumechange', () => {
            const currentElement = this.player?.getMediaElement();
            if (currentElement) {
                playerActions.setMutedState(currentElement.muted);
            }
        });

        videoElement.addEventListener('enterpictureinpicture', () =>
            eventBus.dispatch('player:pip-changed', { isInPiP: true })
        );
        videoElement.addEventListener('leavepictureinpicture', () =>
            eventBus.dispatch('player:pip-changed', { isInPiP: false })
        );

        this.isInitialized = true;
    }

    async reinitializeAndLoad(videoEl, videoContainer, stream) {
        if (this.isInitialized) {
            await this.destroy();
        }
        await this.initialize(videoEl, videoContainer);
        if (stream) {
            await this.load(stream, true);
        }
    }

    togglePlay() {
        const video = this.player?.getMediaElement();
        if (video) {
            video.paused ? video.play() : video.pause();
        }
    }

    toggleMute() {
        const video = this.player?.getMediaElement();
        if (video) {
            video.muted = !video.muted;
        }
    }

    seek(time) {
        const video = this.player?.getMediaElement();
        if (video) {
            video.currentTime = time;
        }
    }

    async togglePictureInPicture() {
        const video = this.player?.getMediaElement();
        if (!video || !document.pictureInPictureEnabled) return;
        try {
            if (document.pictureInPictureElement === video) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch (error) {
            console.error('PiP request failed:', error);
        }
    }

    startStatsCollection() {
        this.stopStatsCollection();
        this.tickerSubscription = eventBus.subscribe(
            'ticker:one-second-tick',
            () => {
                if (this.player?.getMediaElement()) {
                    this._updateStatsAndPlaybackInfo();
                }
            }
        );
    }

    stopStatsCollection() {
        if (this.tickerSubscription) {
            this.tickerSubscription();
            this.tickerSubscription = null;
        }
        this.activeManifestVariants = [];
    }

    async load(stream, autoPlay = false) {
        if (!this.isInitialized || !this.player || !stream) return;

        this.stallCalculator.reset();
        playerActions.setRetryCount(0);

        const networkingEngine = this.player.getNetworkingEngine();
        if (networkingEngine) {
            networkingEngine.streamAnalyzerStreamId = stream.id;
        }
        this.player.streamAnalyzerStreamId = stream.id;

        this.activeStreamIds.add(stream.id);
        eventBus.dispatch('player:active-streams-changed', {
            activeStreamIds: this.activeStreamIds,
        });

        const isDynamic = stream.manifest?.type === 'dynamic';
        useAnalysisStore.getState().setStreamPolling(stream.id, isDynamic);

        try {
            const drmConfig = await playerConfigService.buildDrmConfig(stream);
            this.player.configure({ drm: drmConfig });

            const manifestUrl = stream.patchedManifestUrl || stream.originalUrl;
            await this.player.load(manifestUrl);

            const rawVariantTracks = this.player.getVariantTracks();
            const uniqueVideoTracks = new Map();
            if (rawVariantTracks) {
                rawVariantTracks.forEach((track) => {
                    if (track.videoCodec) {
                        const trackKey = `${track.height}x${track.width}@${track.videoBandwidth || track.bandwidth}|${track.videoCodec}|${track.frameRate}`;
                        if (!uniqueVideoTracks.has(trackKey)) {
                            uniqueVideoTracks.set(trackKey, track);
                        }
                    }
                });
            }
            const videoTracks = Array.from(uniqueVideoTracks.values());

            playerActions.setPlayerLoadedWithTracks({
                videoTracks,
                audioTracks: this.player.getAudioLanguagesAndRoles(),
                textTracks: this.player.getTextTracks(),
                isAbrEnabled: this.player.getConfiguration().abr.enabled,
            });

            this.activeManifestVariants =
                this.player.getManifest()?.variants || [];
            this.startStatsCollection();

            eventBus.dispatch('player:manifest-loaded');

            if (autoPlay && this.player.getMediaElement()) {
                this.player.getMediaElement().play();
            }
        } catch (e) {
            playerActions.setLoadedState(false);
            this.onError(e);
        }
    }

    async unload() {
        if (this.isInitialized && this.player) {
            const streamId = this.player.streamAnalyzerStreamId;
            this.stopStatsCollection();
            await this.player.unload();
            playerActions.reset();
            this.stallCalculator.reset();
            if (streamId !== undefined) {
                this.activeStreamIds.delete(streamId);
                eventBus.dispatch('player:active-streams-changed', {
                    activeStreamIds: this.activeStreamIds,
                });
            }
        }
    }

    destroy() {
        if (!this.isInitialized) return;
        this.stopStatsCollection();
        // Removed UI destroy call as this.ui is no longer used
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
        this.isInitialized = false;
        this.activeStreamIds.clear();
        eventBus.dispatch('player:active-streams-changed', {
            activeStreamIds: this.activeStreamIds,
        });
        playerActions.reset();
        this.stallCalculator.reset();
    }

    getPlayer() {
        return this.player;
    }
    getActiveManifestVariants() {
        return this.activeManifestVariants;
    }
    getConfiguration() {
        return this.player?.getConfiguration();
    }

    setAbrEnabled(enabled) {
        playerConfigService.setAbrEnabled(this.player, enabled);
        playerActions.logEvent({
            timestamp: new Date().toLocaleTimeString(),
            type: 'interaction',
            details: `ABR strategy set to: ${
                enabled ? 'Auto (enabled)' : 'Manual (disabled)'
            }.`,
        });
    }

    setRestrictions(restrictions) {
        playerConfigService.setRestrictions(this.player, restrictions);
    }

    setBufferConfiguration(config) {
        playerConfigService.setBufferConfiguration(this.player, config);
    }

    setLatencyConfiguration(config) {
        playerConfigService.setLatencyConfiguration(this.player, config);
    }

    setAbrConfiguration(config) {
        playerConfigService.setAbrConfiguration(this.player, config);
    }

    selectVariantTrack(track, clearBuffer = true) {
        playerConfigService.selectVariantTrack(this.player, track, clearBuffer);
        playerActions.logEvent({
            timestamp: new Date().toLocaleTimeString(),
            type: 'interaction',
            details: `Manual track selection: Locked to ${
                track.height
            }p @ ${formatBitrate(track.bandwidth)}.`,
        });
    }

    selectTextTrack(track) {
        playerConfigService.selectTextTrack(this.player, track);
    }

    selectAudioLanguage(language) {
        playerConfigService.selectAudioLanguage(this.player, language);
    }

    onErrorEvent(event) {
        this.onError(/** @type {any} */ (event).detail);
    }

    onError(error) {
        appLog(
            'PlayerService.onError',
            'warn',
            'Shaka Player Error:',
            error.code,
            error
        );

        playerActions.setLoadedState(false);
        const originalMessage = parseShakaError(error);

        const { isAutoResetEnabled, retryCount } = usePlayerStore.getState();
        if (!isAutoResetEnabled) {
            eventBus.dispatch('player:error', {
                message: originalMessage,
                error,
            });
            return;
        }

        const newRetryCount = retryCount + 1;
        if (newRetryCount > MAX_RETRIES) {
            const finalMessage = `Permanent Failure: ${originalMessage}`;
            eventBus.dispatch('player:error', {
                message: finalMessage,
                error,
            });
            const { streams, activeStreamId } = useAnalysisStore.getState();
            const stream = streams.find((s) => s.id === activeStreamId);
            eventBus.dispatch('notify:player-error', {
                streamName: stream?.name || 'Player Simulation',
                message: finalMessage,
            });
            return;
        }

        const backoff =
            INITIAL_RETRY_DELAY_MS *
            Math.pow(2, retryCount) *
            (1 + Math.random() * JITTER_FACTOR);
        const delay = Math.min(backoff, 30000); // Cap delay at 30s

        playerActions.setRetryCount(newRetryCount);
        const retryMessage = `Retrying (${newRetryCount}/${MAX_RETRIES})...`;
        eventBus.dispatch('player:error', { message: retryMessage, error });

        setTimeout(() => {
            const { streams, activeStreamId } = useAnalysisStore.getState();
            const streamToReload = streams.find((s) => s.id === activeStreamId);
            if (streamToReload) {
                this.load(streamToReload, true);
            }
        }, delay);
    }

    onAdaptationEvent(event) {
        if (!event.newVariant && !event.oldVariant) {
            return;
        }

        const { streams, activeStreamId } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId);
        const mediaElement = this.player.getMediaElement();
        const currentTime = mediaElement ? mediaElement.currentTime : 0;

        const newTrack = event.newVariant
            ? {
                  ...event.newVariant,
                  playheadTime: currentTime,
                  streamId: activeStreamId,
                  stream,
              }
            : null;

        const oldTrack = event.oldVariant
            ? {
                  ...event.oldVariant,
                  playheadTime: currentTime,
                  streamId: activeStreamId,
                  stream,
              }
            : null;

        eventBus.dispatch('player:adaptation-internal', { oldTrack, newTrack });
    }

    onBufferingEvent(event) {
        eventBus.dispatch('player:buffering', { buffering: event.buffering });
    }
}

export const playerService = new PlayerService();
