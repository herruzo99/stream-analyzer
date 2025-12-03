import { useAnalysisStore } from '@/state/analysisStore';

/**
 * Manages the serialization and deserialization of application state to/from the URL.
 * Uses the URL hash to store state without triggering page reloads.
 */
export class UrlStateManager {
    constructor() {
        this.paramName = 'state';
    }

    /**
     * Encodes the current application state into a base64 string.
     * @returns {string} The base64 encoded state string.
     */
    encodeState() {
        const state = {
            inputs: useAnalysisStore.getState().streamInputs.map((input) => ({
                url: input.url,
                name: input.name,
            })),
            // Future: Add active patches, player config, etc.
            // For now, we focus on stream inputs as the MVP.
        };

        try {
            const jsonStr = JSON.stringify(state);
            return btoa(jsonStr);
        } catch (e) {
            console.error('Failed to encode state:', e);
            return '';
        }
    }

    /**
     * Decodes the state from a base64 string and applies it to the application.
     * @param {string} encodedState - The base64 encoded state string.
     */
    applyState(encodedState) {
        try {
            const jsonStr = atob(encodedState);
            const state = JSON.parse(jsonStr);

            if (state.inputs && Array.isArray(state.inputs)) {
                const inputs = state.inputs.map((input, index) => ({
                    id: index,
                    url: input.url,
                    name: input.name || '',
                    file: null,
                }));

                // We dispatch the event to trigger the analysis, similar to how App._populateInputs works
                // But since we are likely calling this after app init, we might need to be careful.
                // Ideally, this is called during app startup.
                return inputs;
            }
        } catch (e) {
            console.error('Failed to decode state:', e);
        }
        return null;
    }

    /**
     * Generates a shareable URL with the current state.
     * @returns {string} The full shareable URL.
     */
    getShareableUrl() {
        const encoded = this.encodeState();
        const url = new URL(window.location.href);
        url.hash = `${this.paramName}=${encoded}`;
        return url.toString();
    }

    /**
     * Checks the URL hash for state and returns the decoded inputs if found.
     * @returns {Array|null} The stream inputs if state exists, null otherwise.
     */
    getStateFromUrl() {
        const hash = window.location.hash.substring(1); // Remove #
        const params = new URLSearchParams(hash);
        const encodedState = params.get(this.paramName);

        if (encodedState) {
            return this.applyState(encodedState);
        }
        return null;
    }
}

export const urlStateManager = new UrlStateManager();
