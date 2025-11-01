import { eventBus } from '@/application/event-bus';
import { useAnalysisStore } from '@/state/analysisStore';
import { playerActions, usePlayerStore } from '@/state/playerStore';
import { debugLog } from '@/shared/utils/debug';
import { getShaka } from '@/infrastructure/player/shaka';
import { formatBitrate } from '@/ui/shared/format';

let player = null;
let statsInterval = null;
let activeStreamIds = new Set();
let activeManifestVariants = [];

async function fetchCertificate(url) {
    try {
        if (!url) {
            return null;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(
                `HTTP error ${response.status} fetching certificate`
            );
        }
        return await response.arrayBuffer();
    } catch (e) {
        console.error('Failed to fetch DRM service certificate:', e);
        throw e;
    }
}

export const playerService = {
    isInitialized: false,
    ui: null, // Holds the Shaka UI instance
    getActiveStreamIds: () => activeStreamIds,

    _updateStatsAndPlaybackInfo() {
        if (!player) return;

        const shakaStats = player.getStats();
        const { abrHistory, currentStats } = usePlayerStore.getState();
        const lastBitrate = abrHistory[0]?.bitrate;
        const videoEl = player.getMediaElement();
        if (!videoEl) return;

        // --- Update Playback Info (for status display) ---
        const activeVariant = player.getVariantTracks().find((t) => t.active);
        playerActions.updatePlaybackInfo({
            activeVideoTrack: activeVariant
                ? {
                      bitrate: activeVariant.bandwidth,
                      width: activeVariant.width,
                      height: activeVariant.height,
                  }
                : null,
            activeAudioTrack:
                player.getAudioLanguagesAndRoles().find((t) => t.active) ||
                null,
            activeTextTrack:
                player.getTextTracks().find((t) => t.active) || null,
        });

        // --- Calculate Full Stats Object (for graphs and stats panel) ---
        const videoOnlyBitrate = activeVariant?.videoBandwidth || 0;
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
        let timeToFirstFrame =
            currentStats?.playbackQuality.timeToFirstFrame || 0;

        if (shakaStats.stateHistory && shakaStats.stateHistory.length > 1) {
            if (timeToFirstFrame === 0) {
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

            const firstPlayIndex = shakaStats.stateHistory.findIndex(
                (s) => s.state === 'playing'
            );
            if (firstPlayIndex > -1) {
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

        const seekRange = player.seekRange();
        const manifestTime = seekRange.end - seekRange.start;
        const playheadTime = videoEl.currentTime;
        const isLive = player.isLive();

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

        /** @type {import('@/types').PlayerStats} */
        const newStats = {
            playheadTime: playheadTime,
            manifestTime: manifestTime,
            playbackQuality: {
                resolution: `${shakaStats.width || 0}x${shakaStats.height || 0}`,
                droppedFrames: shakaStats.droppedFrames || 0,
                corruptedFrames: shakaStats.corruptedFrames || 0,
                totalStalls: totalStalls,
                totalStallDuration: totalStallDuration / 1000,
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
                totalGaps: shakaStats.gapCount || 0,
            },
            session: {
                totalPlayTime: shakaStats.playTime || 0,
                totalBufferingTime: shakaStats.bufferingTime || 0,
            },
        };

        playerActions.updateStats(newStats);
    },

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

        player = new shaka.Player();
        await player.attach(videoEl);

        // --- ARCHITECTURAL FIX: Instantiate and Configure Shaka UI Overlay ---
        this.ui = new shaka.ui.Overlay(player, videoContainer, videoEl);
        this.ui.configure({
            overflowMenuButtons: [
                'playback_rate',
                'captions',
                'language',
                'picture_in_picture',
                'loop',
            ],
        });
        // --- END FIX ---

        const videoElement = player.getMediaElement();
        if (!videoElement) {
            console.error(
                'Shaka player did not attach to the video element correctly.'
            );
            return;
        }

        // --- ARCHITECTURAL FIX: Apply initial muted state from store ---
        videoElement.muted = usePlayerStore.getState().isMuted;
        // --- END FIX ---

        /** @type {any} */ (player).streamAnalyzerStreamId = null;
        /** @type {any} */ (
            player.getNetworkingEngine()
        ).streamAnalyzerStreamId = null;

        player.addEventListener('error', this.onErrorEvent.bind(this));
        player.addEventListener(
            'adaptation',
            this.onAdaptationEvent.bind(this)
        );
        player.addEventListener('buffering', this.onBufferingEvent.bind(this));

        // --- ADD MORE EVENT LISTENERS ---
        player.addEventListener('loading', (e) =>
            eventBus.dispatch('player:loading', e)
        );
        player.addEventListener('loaded', (e) =>
            eventBus.dispatch('player:loaded', e)
        );
        player.addEventListener('streaming', (e) =>
            eventBus.dispatch('player:streaming', e)
        );
        player.addEventListener('ratechange', (e) =>
            eventBus.dispatch('player:ratechange', {
                rate: videoElement.playbackRate,
            })
        );
        player.addEventListener('emsg', (e) =>
            eventBus.dispatch('player:emsg', e.detail)
        );
        player.addEventListener('texttrackvisibility', (e) =>
            eventBus.dispatch('player:texttrackvisibility', e.detail)
        );
        // --- END ---

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
            const currentElement = player?.getMediaElement();
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
    },

    togglePlay: () => {
        const video = player?.getMediaElement();
        if (video) {
            video.paused ? video.play() : video.pause();
        }
    },

    toggleMute: () => {
        const video = player?.getMediaElement();
        if (video) {
            video.muted = !video.muted;
        }
    },

    seek: (time) => {
        const video = player?.getMediaElement();
        if (video) {
            video.currentTime = time;
        }
    },

    async togglePictureInPicture() {
        const video = player?.getMediaElement();
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
    },

    startStatsCollection() {
        if (statsInterval) clearInterval(statsInterval);
        statsInterval = setInterval(() => {
            if (player?.getMediaElement()) {
                this._updateStatsAndPlaybackInfo();
            }
        }, 1000);
    },

    stopStatsCollection() {
        if (statsInterval) {
            clearInterval(statsInterval);
            statsInterval = null;
        }
        activeManifestVariants = [];
    },

    async load(stream, autoPlay = false) {
        if (!this.isInitialized || !player || !stream || !stream.drmAuth)
            return;

        const videoElement = player.getMediaElement();

        const networkingEngine = player.getNetworkingEngine();
        if (networkingEngine) {
            /** @type {any} */ (networkingEngine).streamAnalyzerStreamId =
                stream.id;
        }
        /** @type {any} */ (player).streamAnalyzerStreamId = stream.id;

        activeStreamIds.add(stream.id);
        eventBus.dispatch('player:active-streams-changed', { activeStreamIds });

        const isEncrypted = stream.manifest?.summary?.security?.isEncrypted;

        if (isEncrypted) {
            const discoveredUrls =
                stream.manifest.summary.security.licenseServerUrls || [];
            const licenseServerUrl =
                stream.drmAuth.licenseServerUrl || discoveredUrls[0] || '';

            if (!licenseServerUrl) {
                this.onError({
                    code: 'DRM_NO_LICENSE_URL',
                    message:
                        'This stream is encrypted, but no license server URL could be found. Please provide one manually.',
                });
                playerActions.setLoadedState(false);
                return;
            }

            const licenseRequestHeaders = {};
            stream.drmAuth?.headers?.forEach((h) => {
                if (h.key) licenseRequestHeaders[h.key] = h.value;
            });

            try {
                let serverCertificate;
                const certSource = stream.drmAuth.serverCertificate;

                if (certSource instanceof ArrayBuffer) {
                    serverCertificate = certSource;
                } else if (typeof certSource === 'string' && certSource) {
                    serverCertificate = await fetchCertificate(certSource);
                }

                const drmConfig = {
                    drm: {
                        servers: {
                            'com.widevine.alpha': licenseServerUrl,
                            'com.microsoft.playready': licenseServerUrl,
                        },
                        advanced: {
                            'com.widevine.alpha': {
                                serverCertificate: serverCertificate
                                    ? new Uint8Array(serverCertificate)
                                    : undefined,
                                headers: licenseRequestHeaders,
                            },
                            'com.microsoft.playready': {
                                headers: licenseRequestHeaders,
                            },
                        },
                    },
                };

                debugLog(
                    'playerService.load',
                    'Applying DRM configuration:',
                    drmConfig
                );
                player.configure(drmConfig);
            } catch (e) {
                this.onError({
                    code: 'DRM_CERTIFICATE_FAILED',
                    message: `Failed to fetch or process the DRM service certificate: ${e.message}`,
                });
                playerActions.setLoadedState(false);
                return;
            }
        } else {
            player.configure({ drm: { servers: {} } });
        }

        try {
            debugLog('playerService.load', 'Loading URL:', stream.originalUrl);

            await player.load(stream.originalUrl);
            playerActions.setLoadedState(true);

            activeManifestVariants = player.getManifest()?.variants || [];
            this.startStatsCollection();

            eventBus.dispatch('player:manifest-loaded');

            if (autoPlay && videoElement) {
                videoElement.play();
            }
        } catch (e) {
            playerActions.setLoadedState(false);
            this.onError(e);
        }
    },

    async unload() {
        if (this.isInitialized && player) {
            const streamId = /** @type {any} */ (player).streamAnalyzerStreamId;
            this.stopStatsCollection();
            await player.unload();
            playerActions.setLoadedState(false);
            if (streamId !== undefined) {
                activeStreamIds.delete(streamId);
                eventBus.dispatch('player:active-streams-changed', {
                    activeStreamIds,
                });
            }
        }
    },

    destroy() {
        if (!this.isInitialized) return;
        this.stopStatsCollection();
        if (this.ui) {
            this.ui.destroy();
            this.ui = null;
        }
        if (player) {
            player.destroy();
            player = null;
        }
        this.isInitialized = false;
        activeStreamIds.clear();
        eventBus.dispatch('player:active-streams-changed', { activeStreamIds });
        playerActions.setLoadedState(false);
    },

    getPlayer: () => player,
    getActiveManifestVariants: () => activeManifestVariants,
    getConfiguration: () => player?.getConfiguration(),

    setAbrEnabled(enabled) {
        if (player) {
            player.configure({ abr: { enabled } });
            playerActions.logEvent({
                timestamp: new Date().toLocaleTimeString(),
                type: 'interaction',
                details: `ABR strategy set to: ${enabled ? 'Auto (enabled)' : 'Manual (disabled)'}.`,
            });
            if (enabled) {
                player.selectVariantTrack(null, false);
            }
        }
    },

    setRestrictions(restrictions) {
        player?.configure({ restrictions });
    },

    setBufferConfiguration(config) {
        player?.configure({
            streaming: {
                rebufferingGoal: config.rebufferingGoal,
                bufferingGoal: config.bufferingGoal,
                bufferBehind: config.bufferBehind,
                ignoreTextStreamFailures: config.ignoreTextStreamFailures,
            },
        });
    },

    setAbrConfiguration(config) {
        player?.configure({
            abr: {
                bandwidthUpgradeTarget: config.bandwidthUpgradeTarget,
                bandwidthDowngradeTarget: config.bandwidthDowngradeTarget,
            },
        });
    },

    selectVariantTrack(track, clearBuffer = true) {
        if (player) {
            if (player.getConfiguration().abr.enabled) {
                player.configure({ abr: { enabled: false } });
            }
            player.selectVariantTrack(track, clearBuffer);
            playerActions.logEvent({
                timestamp: new Date().toLocaleTimeString(),
                type: 'interaction',
                details: `Manual track selection: Locked to ${track.height}p @ ${formatBitrate(track.bandwidth)}.`,
            });
        }
    },

    selectTextTrack(track) {
        player?.selectTextTrack(track);
    },

    selectAudioLanguage(lang) {
        player?.selectAudioLanguage(lang);
    },

    onErrorEvent(event) {
        this.onError(event.detail);
    },

    onError(error) {
        console.error('Shaka Player Error:', error.code, error);
        playerActions.setLoadedState(false);
        let message = `Player error: ${error.code} - ${error.message}`;
        if (error.code === 6007) {
            const networkError = error.data[0];
            if (networkError && networkError.data) {
                const httpStatus = networkError.data[1];
                message = `License request failed: HTTP ${httpStatus}. Check Authentication settings.`;
            }
        }
        eventBus.dispatch('player:error', { message, error });
    },

    onAdaptationEvent(event) {
        if (!event.newVariant && !event.oldVariant) {
            return;
        }

        const { streams, activeStreamId } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId);
        const mediaElement = player.getMediaElement();
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
    },

    onBufferingEvent(event) {
        eventBus.dispatch('player:buffering', { buffering: event.buffering });
    },
};
