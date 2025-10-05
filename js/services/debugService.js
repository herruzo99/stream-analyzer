import { useStore } from '../core/store.js';
import { showToast } from '../ui/components/toast.js';

/**
 * Serializes the application state for debugging, handling complex types.
 * @param {object} state The application state from the store.
 * @returns {string} A JSON string representation of the state.
 */
function serializeStateForDebug(state) {
    const replacer = (key, value) => {
        if (value instanceof Map) {
            return {
                __dataType: 'Map',
                value: Array.from(value.entries()),
            };
        }
        if (value instanceof Set) {
            return {
                __dataType: 'Set',
                value: Array.from(value.values()),
            };
        }
        if (key === 'serializedManifest') {
            return '[Circular/ParsedObject]';
        }
        return value;
    };

    const debugData = {
        timestamp: new Date().toISOString(),
        appState: state,
    };

    return JSON.stringify(debugData, replacer, 2);
}

/**
 * Gathers the current application state, serializes it, and copies it to the clipboard.
 * Shows success or failure toasts to the user.
 */
export function copyDebugInfoToClipboard() {
    const state = useStore.getState();

    try {
        const jsonString = serializeStateForDebug(state);

        navigator.clipboard
            .writeText(jsonString)
            .then(() => {
                showToast({
                    message: 'Debug info copied to clipboard!',
                    type: 'pass',
                });
            })
            .catch((err) => {
                console.error('Failed to copy debug info:', err);
                showToast({
                    message: 'Failed to copy debug info.',
                    type: 'fail',
                });
            });
    } catch (error) {
        console.error('Error serializing debug state:', error);
        showToast({ message: 'Error creating debug info.', type: 'fail' });
    }
}