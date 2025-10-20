import { eventBus } from '@/application/event-bus';
const shaka = require('shaka-player/dist/shaka-player.ui.js');

let player = null;
let videoElement = null;
let ui = null;

export const playerService = {
    isInitialized: false,

    /**
     * Initializes the Shaka player instance and attaches it to the video element.
     * @param {HTMLVideoElement} videoEl The <video> element.
     * @param {HTMLElement} videoContainer The container for the UI controls.
     */
    initialize(videoEl, videoContainer) {
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

        videoElement = videoEl;
        player = new shaka.Player();
        player.attach(videoElement); // Use modern attach method

        ui = new shaka.ui.Overlay(player, videoContainer, videoElement);
        ui.getControls(); // This builds the default UI

        player.addEventListener('error', this.onErrorEvent);
        player.addEventListener('adaptation', this.onAdaptationEvent);
        player.addEventListener('trackschanged', this.onTracksChangedEvent);

        this.isInitialized = true;
    },

    /**
     * Loads a new manifest into the player.
     * @param {string} manifestUrl The URL of the manifest to load.
     */
    async load(manifestUrl) {
        if (!this.isInitialized || !player) return;
        try {
            await player.load(manifestUrl);
            eventBus.dispatch('player:manifest-loaded');
        } catch (e) {
            this.onError(e);
        }
    },

    /**
     * Destroys the player instance and cleans up resources.
     */
    destroy() {
        if (!this.isInitialized) return;
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
    },

    getPlayer() {
        return player;
    },

    // --- Event Handlers ---
    onErrorEvent(event) {
        this.onError(event.detail);
    },

    onError(error) {
        console.error('Shaka Player Error:', error.code, error);
        eventBus.dispatch('player:error', {
            message: `Player error: ${error.code}`,
            error,
        });
    },

    onAdaptationEvent() {
        eventBus.dispatch('player:adaptation');
    },

    onTracksChangedEvent() {
        eventBus.dispatch('player:tracks-changed');
    },
};
