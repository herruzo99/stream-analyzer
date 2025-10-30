import { eventBus } from '@/application/event-bus';
import { useAnalysisStore } from '@/state/analysisStore';
import { playerActions } from '@/state/playerStore';
import { debugLog } from '@/shared/utils/debug';
import { getShaka } from '@/infrastructure/player/shaka';

let player = null;
let videoElement = null;
let ui = null;
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
            throw new Error(`HTTP ${response.status} fetching certificate`);
        }
        return await response.arrayBuffer();
    } catch (e) {
        console.error('Failed to fetch DRM service certificate:', e);
        throw e;
    }
}

export const playerService = {
    isInitialized: false,
    getActiveStreamIds: () => activeStreamIds,

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

        videoElement = videoEl;
        player = new shaka.Player();
        await player.attach(videoElement);

        /** @type {any} */ (player).streamAnalyzerStreamId = null;
        /** @type {any} */ (
            player.getNetworkingEngine()
        ).streamAnalyzerStreamId = null;

        ui = new shaka.ui.Overlay(player, videoContainer, videoElement);
        ui.getControls();

        player.addEventListener('error', this.onErrorEvent.bind(this));
        player.addEventListener(
            'adaptation',
            this.onAdaptationEvent.bind(this)
        );
        player.addEventListener('buffering', this.onBufferingEvent.bind(this));

        videoElement.addEventListener('enterpictureinpicture', () =>
            eventBus.dispatch('player:pip-changed', { isInPiP: true })
        );
        videoElement.addEventListener('leavepictureinpicture', () =>
            eventBus.dispatch('player:pip-changed', { isInPiP: false })
        );

        this.isInitialized = true;
    },

    startStatsCollection() {
        if (statsInterval) clearInterval(statsInterval);
        statsInterval = setInterval(() => {
            if (player && videoElement) {
                eventBus.dispatch('player:stats-changed', {
                    stats: player.getStats(),
                });

                let stateStr = 'IDLE';
                if (player.isBuffering()) stateStr = 'BUFFERING';
                else if (videoElement.ended) stateStr = 'ENDED';
                else if (videoElement.paused) stateStr = 'PAUSED';
                else stateStr = 'PLAYING';

                const playbackState = /** @type {any} */ (stateStr);

                const activeVariant = player
                    .getVariantTracks()
                    .find((t) => t.active);

                playerActions.updatePlaybackInfo({
                    playbackState,
                    activeVideoTrack: activeVariant
                        ? {
                              bitrate: activeVariant.bandwidth,
                              width: activeVariant.width,
                              height: activeVariant.height,
                          }
                        : null,
                    activeAudioTrack:
                        player
                            .getAudioLanguagesAndRoles()
                            .find((t) => t.active) || null,
                    activeTextTrack:
                        player.getTextTracks().find((t) => t.active) || null,
                });
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

        // CRITICAL FIX: Tag the player instance BEFORE the load call.
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
        if (ui) {
            ui.destroy();
            ui = null;
        }
        if (player) {
            player.destroy();
            player = null;
        }
        videoElement = null;
        this.isInitialized = false;
        activeStreamIds.clear();
        eventBus.dispatch('player:active-streams-changed', { activeStreamIds });
        playerActions.setLoadedState(false);
    },

    getPlayer: () => player,
    getActiveManifestVariants: () => activeManifestVariants,
    getConfiguration: () => player?.getConfiguration(),

    async enterPictureInPicture() {
        if (
            videoElement &&
            document.pictureInPictureEnabled &&
            !videoElement.disablePictureInPicture
        ) {
            try {
                await videoElement.requestPictureInPicture();
            } catch (error) {
                console.error('PiP request failed:', error);
            }
        }
    },

    async exitPictureInPicture() {
        if (document.pictureInPictureElement) {
            try {
                await document.exitPictureInPicture();
            } catch (error) {
                console.error('Exit PiP failed:', error);
            }
        }
    },

    setAbrEnabled(enabled) {
        if (player) {
            player.configure({ abr: { enabled } });
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
            this.setAbrEnabled(false);
            player.selectVariantTrack(track, clearBuffer);
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
        const { streams, activeStreamId } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId);
        const newTrack = {
            ...event.newVariant,
            playheadTime: player.getMediaElement().currentTime,
            streamId: activeStreamId,
            stream,
        };
        const oldTrack = {
            ...event.oldVariant,
            playheadTime: player.getMediaElement().currentTime,
            streamId: activeStreamId,
            stream,
        };
        eventBus.dispatch('player:adaptation-internal', { oldTrack, newTrack });
    },

    onBufferingEvent(event) {
        eventBus.dispatch('player:buffering', { buffering: event.buffering });
    },
};
