import { eventBus } from '@/application/event-bus';
import { useAnalysisStore } from '@/state/analysisStore';
import { playerActions, usePlayerStore } from '@/state/playerStore';
import { debugLog } from '@/shared/utils/debug';
import { getShaka } from '@/infrastructure/player/shaka';
import { formatBitrate } from '@/ui/shared/format';
import { StallCalculator } from '@/features/multiPlayer/domain/stall-calculator';
import { parseShakaError } from '@/infrastructure/player/shaka-error';
import { playerConfigService } from '@/features/multiPlayer/application/playerConfigService';

class PlayerService {
    constructor() {
        this.player = null;
        this.statsInterval = null;
        this.activeStreamIds = new Set();
        this.activeManifestVariants = [];
        this.isInitialized = false;
        this.ui = null; // Holds the Shaka UI instance
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

        const bufferInfo = {
            label: /** @type {'Live Latency' | 'Buffer Health'} */ (
                isLive ? 'Live Latency' : 'Buffer Health'
            ),
            seconds: isLive
                ? shakaStats.liveLatency || 0
                : Math.max(0, bufferEnd - playheadTime),
        };

        const newStats = {
            playheadTime: playheadTime,
            manifestTime: manifestTime,
            playbackQuality: {
                resolution: `${shakaStats.width || 0}x${
                    shakaStats.height || 0
                }`,
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
                label: bufferInfo.label,
                seconds: bufferInfo.seconds,
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

        this.ui = new shaka.ui.Overlay(this.player, videoContainer, videoEl);
        this.ui.configure({
            overflowMenuButtons: [
                'playback_rate',
                'captions',
                'language',
                'picture_in_picture',
                'loop',
            ],
        });

        const videoElement = this.player.getMediaElement();
        if (!videoElement) {
            console.error(
                'Shaka player did not attach to the video element correctly.'
            );
            return;
        }

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

        const networkingEngine = this.player.getNetworkingEngine();
        if (networkingEngine) {
            networkingEngine.streamAnalyzerStreamId = stream.id;
        }
        this.player.streamAnalyzerStreamId = stream.id;

        this.activeStreamIds.add(stream.id);
        eventBus.dispatch('player:active-streams-changed', {
            activeStreamIds: this.activeStreamIds,
        });

        try {
            const drmConfig = await playerConfigService.buildDrmConfig(stream);
            this.player.configure({ drm: drmConfig });

            await this.player.load(stream.originalUrl);

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
            playerActions.reset(); // Reset the UI state
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
        if (this.ui) {
            this.ui.destroy();
            this.ui = null;
        }
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
        this.isInitialized = false;
        this.activeStreamIds.clear();
        eventBus.dispatch('player:active-streams-changed', {
            activeStreamIds: this.activeStreamIds,
        });
        playerActions.setLoadedState(false);
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
        if (this.player) {
            this.player.configure({ abr: { enabled } });
            playerActions.logEvent({
                timestamp: new Date().toLocaleTimeString(),
                type: 'interaction',
                details: `ABR strategy set to: ${
                    enabled ? 'Auto (enabled)' : 'Manual (disabled)'
                }.`,
            });
        }
    }

    setRestrictions(restrictions) {
        this.player?.configure({ restrictions });
    }

    setBufferConfiguration(config) {
        this.player?.configure({
            streaming: {
                rebufferingGoal: config.rebufferingGoal,
                bufferingGoal: config.bufferingGoal,
                bufferBehind: config.bufferBehind,
                ignoreTextStreamFailures: config.ignoreTextStreamFailures,
            },
        });
    }

    setAbrConfiguration(config) {
        this.player?.configure({
            abr: {
                bandwidthUpgradeTarget: config.bandwidthUpgradeTarget,
                bandwidthDowngradeTarget: config.bandwidthDowngradeTarget,
            },
        });
    }

    selectVariantTrack(track, clearBuffer = true) {
        if (!this.player) return;

        if (this.player.getConfiguration().abr.enabled) {
            this.player.configure({ abr: { enabled: false } });
        }

        let trackToSelect = track;
        // If the passed track doesn't have Shaka's internal properties, it's a pre-hydrated object.
        if (typeof track.id !== 'number' || track.label === undefined) {
            const shakaTracks = this.player.getVariantTracks();
            trackToSelect = shakaTracks.find(
                (t) =>
                    t.bandwidth === track.bandwidth &&
                    t.height === track.height &&
                    t.width === track.width &&
                    t.codecs === track.codecs
            );
            if (!trackToSelect) {
                console.warn('Could not find matching Shaka track for', track);
                return;
            }
        }

        this.player.selectVariantTrack(trackToSelect, clearBuffer);
        playerActions.logEvent({
            timestamp: new Date().toLocaleTimeString(),
            type: 'interaction',
            details: `Manual track selection: Locked to ${
                track.height
            }p @ ${formatBitrate(track.bandwidth)}.`,
        });
    }

    selectTextTrack(track) {
        if (!this.player) return;
        let trackToSelect = track;

        if (track && typeof track.id !== 'number') {
            const shakaTracks = this.player.getTextTracks();
            trackToSelect = shakaTracks.find(
                (t) => t.language === track.language && t.kind === track.kind
            );
        }

        this.player.selectTextTrack(trackToSelect);
    }

    selectAudioLanguage(language) {
        if (!this.player) return;
        // Match by label first, as it can be more descriptive (e.g., "English (Commentary)")
        const audioTracks = this.player.getAudioLanguagesAndRoles();
        const trackToSelect =
            audioTracks.find((t) => t.label === language) ||
            audioTracks.find((t) => t.language === language);

        if (trackToSelect) {
            // By only passing the language, we let Shaka choose the default role,
            // which is a safer operation than potentially passing `undefined`.
            this.player.selectAudioLanguage(trackToSelect.language);
        }
    }

    onErrorEvent(event) {
        this.onError(/** @type {any} */ (event).detail);
    }

    onError(error) {
        console.error('Shaka Player Error:', error.code, error);
        playerActions.setLoadedState(false);
        const message = parseShakaError(error);
        eventBus.dispatch('player:error', { message, error });
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