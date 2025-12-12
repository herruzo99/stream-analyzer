import { eventBus } from '@/application/event-bus';
import {
    prepareForStorage,
    restoreFromStorage,
} from '@/infrastructure/persistence/streamStorage';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';

/**
 * @typedef {import('@/types').StreamInput} StreamInput
 * @typedef {import('@/types').SegmentToCompare} SegmentToCompare
 */

/**
 * @typedef {object} SessionUIState
 * @property {string} activeTab
 * @property {string | null} activeStreamUrl
 * @property {string | null} activeMediaPlaylistUrl
 * @property {string | null} activeSegmentUrl
 * @property {SegmentToCompare[]} segmentsForCompare
 */

/**
 * @typedef {object} SessionState
 * @property {number} v - The session state version.
 * @property {StreamInput[]} inputs - The stream inputs used for the analysis.
 * @property {SessionUIState} ui - The UI state to restore after analysis.
 */

class SessionService {
    /**
     * Serializes the relevant parts of the application state for sharing.
     * @returns {string | null} A Base64-encoded JSON string of the session state, or null.
     */
    serializeStateForUrl() {
        const { streams, streamInputs, activeStreamId, segmentsForCompare } =
            useAnalysisStore.getState();
        const { activeTab, activeSegmentUrl } = useUiStore.getState();
        const activeStream = streams.find((s) => s.id === activeStreamId);

        if (streamInputs.length === 0) {
            return null;
        }

        /** @type {SessionState} */
        const sessionState = {
            v: 1,
            inputs: streamInputs.map(prepareForStorage),
            ui: {
                activeTab: activeTab,
                activeStreamUrl: activeStream?.originalUrl || null,
                activeMediaPlaylistUrl:
                    activeStream?.activeMediaPlaylistUrl || null,
                activeSegmentUrl: activeSegmentUrl,
                segmentsForCompare: segmentsForCompare,
            },
        };

        try {
            const jsonString = JSON.stringify(sessionState);
            // Use base64url encoding (RFC 4648) to be safe for URLs
            let base64 = btoa(jsonString);
            base64 = base64.replace(/\+/g, '-').replace(/\//g, '_');

            // Strip padding using substring instead of regex to avoid ReDoS warning
            const paddingIndex = base64.indexOf('=');
            if (paddingIndex !== -1) {
                base64 = base64.substring(0, paddingIndex);
            }

            return base64;
        } catch (e) {
            console.error('Failed to serialize session state:', e);
            return null;
        }
    }

    /**
     * Deserializes session state from the URL hash.
     * @returns {SessionState | null} The deserialized session state object, or null.
     */
    deserializeStateFromUrl() {
        try {
            const hash = window.location.hash.substring(1);
            if (!hash.startsWith('session=')) {
                return null;
            }
            let base64String = hash.substring(8); // Length of "session="
            // Convert from base64url back to standard base64
            base64String = base64String.replace(/-/g, '+').replace(/_/g, '/');
            while (base64String.length % 4) {
                base64String += '=';
            }

            const jsonString = atob(base64String);
            const state = JSON.parse(jsonString);

            // Restore any special types like File objects
            if (state.inputs) {
                state.inputs = state.inputs.map((input, index) => {
                    const restored = restoreFromStorage(input);
                    // ARCHITECTURAL FIX: Ensure ID is present.
                    // prepareForStorage strips the ID, so we must re-assign it here
                    // to ensure downstream logic (like tier0 analysis) can reference the input correctly.
                    if (restored.id === undefined) {
                        restored.id = index;
                    }
                    return restored;
                });
            }

            return state.v === 1 ? state : null;
        } catch (e) {
            console.error('Failed to deserialize session state from URL:', e);
            window.location.hash = ''; // Clear invalid hash
            return null;
        }
    }

    /**
     * Applies the session state when the application boots.
     * @returns {boolean} True if a session was found and is being applied, false otherwise.
     */
    applySessionOnBoot() {
        const sessionState = this.deserializeStateFromUrl();
        if (!sessionState || !sessionState.inputs) {
            return false;
        }

        // 1. Set the stream inputs that will be used for the analysis.
        analysisActions.setStreamInputs(sessionState.inputs);

        // 2. Listen ONCE for the analysis to complete.
        const unsubscribe = eventBus.subscribe(
            EVENTS.STATE.ANALYSIS_COMPLETE,
            ({ streams }) => {
                unsubscribe(); // Clean up listener immediately

                // 3. After analysis, apply the UI state.
                const { ui } = sessionState;
                const targetStream = streams.find(
                    (s) => s.originalUrl === ui.activeStreamUrl
                );

                uiActions.setActiveTab(ui.activeTab);

                if (targetStream) {
                    analysisActions.setActiveStreamId(targetStream.id);
                    if (ui.activeMediaPlaylistUrl) {
                        eventBus.dispatch(EVENTS.HLS.MEDIA_PLAYLIST_ACTIVATE, {
                            streamId: targetStream.id,
                            url: ui.activeMediaPlaylistUrl,
                        });
                    }
                }

                if (ui.segmentsForCompare) {
                    analysisActions.clearSegmentsToCompare();
                    ui.segmentsForCompare.forEach((item) => {
                        analysisActions.addSegmentToCompare(item);
                    });
                }

                if (ui.activeSegmentUrl) {
                    uiActions.navigateToInteractiveSegment(ui.activeSegmentUrl);
                }

                // Clear the hash so a page refresh doesn't re-trigger analysis.
                history.replaceState(
                    null,
                    '',
                    window.location.pathname + window.location.search
                );
            }
        );

        // 4. Trigger the analysis.
        eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
            inputs: sessionState.inputs,
        });

        return true; // Signal that a session is being restored.
    }
}

export const sessionService = new SessionService();
