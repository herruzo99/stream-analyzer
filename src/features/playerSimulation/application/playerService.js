import { eventBus } from '@/application/event-bus';
import { useAnalysisStore } from '@/state/analysisStore';
import { playerActions } from '@/state/playerStore';
import { debugLog } from '@/shared/utils/debug';
import { workerService } from '@/infrastructure/worker/workerService';

let player = null;
let videoElement = null;
let ui = null;
let statsInterval = null;

async function fetchCertificate(url) {
    try {
        if (!url) {
            return null; // No certificate URL provided, this is not an error.
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

    /**
     * Initializes the Shaka player instance and attaches it to the video element.
     * @param {HTMLVideoElement} videoEl The <video> element.
     * @param {HTMLElement} videoContainer The container for the UI controls.
     * @param {object} shaka The shaka player library object.
     */
    initialize(videoEl, videoContainer, shaka) {
        if (this.isInitialized) {
            return;
        }

        if (!shaka) {
            console.error('Shaka Player module not loaded correctly.');
            return;
        }

        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) {
            console.error('Shaka Player is not supported by this browser.');
            return;
        }

        const shakaNetworkPlugin = (uri, request, requestType) => {
            debugLog('ShakaNetworkPlugin', 'Intercepted request for URI:', uri, 'Type:', requestType);
            const { streams, activeStreamId } = useAnalysisStore.getState();
            let stream;

            // 1. Most reliable: Find the stream currently loaded in this player instance.
            const assetUri = player ? player.getAssetUri() : null;
            if (assetUri) {
                stream = streams.find(s => s.originalUrl === assetUri);
            }

            // 2. Fallback for requests during the loading phase, before player.load() has resolved.
            if (!stream) {
                stream = streams.find(s => s.originalUrl === uri);
            }
            
            // 3. Last resort if a match still isn't found. Default to the active stream in the UI.
            if (!stream) {
                stream = streams.find(s => s.id === activeStreamId);
            }

            const { auth, id: streamId } = stream || {};
            
            const serializableRequest = {
                uris: request.uris,
                method: request.method,
                headers: {},
                body: request.body,
            };
            for (const [key, value] of Object.entries(request.headers)) {
                serializableRequest.headers[key] = value;
            }

            debugLog('ShakaNetworkPlugin', 'Dispatching serializable request to worker via shaka-fetch task.', { uri, streamId });
            const abortableOp = new shaka.util.AbortableOperation(
                workerService.postTask('shaka-fetch', {
                    request: serializableRequest,
                    requestType,
                    auth,
                    streamId,
                })
            );
            
            return abortableOp;
        };
        
        shaka.net.NetworkingEngine.registerScheme('http', shakaNetworkPlugin);
        shaka.net.NetworkingEngine.registerScheme('https', shakaNetworkPlugin);

        videoElement = videoEl;
        player = new shaka.Player();
        player.attach(videoElement);

        ui = new shaka.ui.Overlay(player, videoContainer, videoElement);
        ui.getControls();

        player.addEventListener('error', this.onErrorEvent.bind(this));
        player.addEventListener('adaptation', this.onAdaptationEvent.bind(this));
        player.addEventListener('buffering', this.onBufferingEvent.bind(this));

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
                        player.getAudioLanguagesAndRoles().find((t) => t.active) ||
                        null,
                    activeTextTrack:
                        player.getTextTracks().find((t) => t.active) || null,
                });
            }
        }, 1000);

        this.isInitialized = true;
    },

    /**
     * Loads a new manifest into the player.
     * @param {import('@/types').Stream} stream The stream object containing the manifest URL and DRM info.
     */
    async load(stream) {
        if (!this.isInitialized || !player || !stream || !stream.drmAuth) return;

        const isEncrypted = stream.manifest?.summary?.security?.isEncrypted;

        if (isEncrypted) {
            const discoveredUrls =
                stream.manifest.summary.security.licenseServerUrls || [];
            const licenseServerUrl = stream.drmAuth.licenseServerUrl || discoveredUrls[0] || '';

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
            stream.drmAuth?.headers?.forEach(h => {
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

                debugLog('playerService.load', 'Applying DRM configuration:', drmConfig);
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
            // Explicitly clear DRM config for clear streams
            player.configure({ drm: { servers: {} } });
        }


        try {
            debugLog('playerService.load', 'Loading instrumented URL:', stream.originalUrl);
            await player.load(stream.originalUrl);
            playerActions.setLoadedState(true);
            eventBus.dispatch('player:manifest-loaded');
        } catch (e) {
            playerActions.setLoadedState(false);
            this.onError(e);
        }
    },

    /**
     * Unloads the current content from the player.
     */
    async unload() {
        if (this.isInitialized && player) {
            await player.unload();
            playerActions.setLoadedState(false);
        }
    },

    /**
     * Destroys the player instance and cleans up resources.
     */
    destroy() {
        if (!this.isInitialized) return;
        if (statsInterval) {
            clearInterval(statsInterval);
            statsInterval = null;
        }
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
        playerActions.setLoadedState(false);
    },

    getPlayer() {
        return player;
    },

    getConfiguration() {
        return player?.getConfiguration();
    },

    // --- New Control Methods ---
    setAbrEnabled(enabled) {
        if (player) {
            player.configure({ abr: { enabled } });
            if (enabled) {
                // When re-enabling ABR, we must clear any manual track selection.
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
            // Explicitly disable ABR when a manual selection is made.
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

    // --- Event Handlers ---
    onErrorEvent(event) {
        this.onError(event.detail);
    },

    onError(error) {
        console.error('Shaka Player Error:', error.code, error);
        playerActions.setLoadedState(false);
        
        let message = `Player error: ${error.code} - ${error.message}`;
        if (error.code === 6007) { // LICENSE_REQUEST_FAILED
            const networkError = error.data[0];
            if (networkError && networkError.data) {
                const httpStatus = networkError.data[1];
                message = `License request failed: HTTP ${httpStatus}. Check Authentication settings.`;
            }
        }

        eventBus.dispatch('player:error', {
            message,
            error,
        });
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

        eventBus.dispatch('player:adaptation-internal', {
            oldTrack,
            newTrack,
        });
    },

    onBufferingEvent(event) {
        eventBus.dispatch('player:buffering', { buffering: event.buffering });
    },
};