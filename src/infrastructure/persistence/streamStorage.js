import { showToast } from '@/ui/components/toast';
import { workerService } from '@/infrastructure/worker/workerService';
import { uiActions } from '@/state/uiStore';
import { useAnalysisStore } from '@/state/analysisStore';

const HISTORY_KEY = 'stream-analyzer_history';
const PRESETS_KEY = 'stream-analyzer_presets';
const LAST_USED_KEY = 'stream-analyzer_last-used';
const WORKSPACES_KEY = 'stream-analyzer_workspaces';
const MAX_HISTORY_ITEMS = 10;
const MAX_PRESETS = 50;

/**
 * Prepares a stream input object for serialization by handling the File object.
 * @param {import('@/types').StreamInput} input The stream input object.
 * @returns {object} A serializable version of the input.
 */
export function prepareForStorage(input) {
    const storableInput = JSON.parse(JSON.stringify(input)); // Deep clone to avoid mutation
    if (storableInput.drmAuth?.serverCertificate instanceof File) {
        const file = /** @type {File} */ (
            storableInput.drmAuth.serverCertificate
        );
        storableInput.drmAuth.serverCertificate = {
            isFilePlaceholder: true,
            name: file.name,
            type: file.type,
        };
    }
    return storableInput;
}

/**
 * Restores a stream input object after deserialization.
 * @param {object} storedInput The object from localStorage.
 * @returns {object} A restored stream input object.
 */
export function restoreFromStorage(storedInput) {
    if (storedInput.drmAuth?.serverCertificate?.isFilePlaceholder) {
        const { name, type } = storedInput.drmAuth.serverCertificate;
        // Create a stub File object. The lack of content (size=0) will be our
        // signal in the UI to prompt for re-selection.
        storedInput.drmAuth.serverCertificate = new File([], name, { type });
    }
    return storedInput;
}

/**
 * Reads a list of items from localStorage.
 * @param {string} key The localStorage key.
 * @returns {Array<object>}
 */
function getItems(key) {
    try {
        const stored = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(stored) ? stored.map(restoreFromStorage) : [];
    } catch (e) {
        console.error(`Error reading from localStorage key "${key}":`, e);
        return [];
    }
}

/**
 * Writes a list of items to localStorage.
 * @param {string} key The localStorage key.
 * @param {Array<object>} items The array of items to save.
 */
function setItems(key, items) {
    try {
        const storableItems = items.map(prepareForStorage);
        localStorage.setItem(key, JSON.stringify(storableItems));
    } catch (e) {
        console.error(`Error writing to localStorage key "${key}":`, e);
    }
}

export const getHistory = () => getItems(HISTORY_KEY);
export const getPresets = () => getItems(PRESETS_KEY);
export const getLastUsedStreams = () => getItems(LAST_USED_KEY);
export const saveLastUsedStreams = (streams) =>
    setItems(LAST_USED_KEY, streams);
export const getWorkspaces = () => getItems(WORKSPACES_KEY);

/**
 * Saves a stream object to the history.
 * @param {import('@/types.ts').Stream} stream The stream object to save.
 */
export function saveToHistory(stream) {
    const { streamInputs } = useAnalysisStore.getState();
    const streamInput = streamInputs.find((input) => input.id === stream.id);

    const canonicalUrl = streamInput?.url || stream.originalUrl;
    if (!canonicalUrl) return;

    const history = getHistory();
    const presets = getPresets();
    const isPreset = presets.some((p) => p.url === canonicalUrl);
    if (isPreset) return;

    const newHistory = history.filter((item) => item.url !== canonicalUrl);

    newHistory.unshift({
        name: stream.name,
        url: canonicalUrl,
        protocol: stream.protocol,
        type: stream.manifest?.type === 'dynamic' ? 'live' : 'vod',
        auth: streamInput?.auth || stream.auth,
        drmAuth: streamInput?.drmAuth || stream.drmAuth,
    });

    if (newHistory.length > MAX_HISTORY_ITEMS) {
        newHistory.length = MAX_HISTORY_ITEMS;
    }
    setItems(HISTORY_KEY, newHistory);
}

/**
 * Saves a stream object as a preset.
 * @param {object} preset The preset object to save.
 */
export function savePreset(preset) {
    const presets = getPresets();
    const newPresets = presets.filter((item) => item.url !== preset.url);
    newPresets.unshift(preset);

    if (newPresets.length > MAX_PRESETS) {
        newPresets.length = MAX_PRESETS;
    }
    setItems(PRESETS_KEY, newPresets);
    showToast({
        message: `Preset "${preset.name}" saved!`,
        type: 'pass',
    });
}

/**
 * Saves a workspace configuration and triggers a UI update.
 * @param {{name: string, inputs: import('@/types').StreamInput[]}} workspace The workspace to save.
 */
export function saveWorkspace(workspace) {
    const workspaces = getWorkspaces();
    const newWorkspaces = workspaces.filter((w) => w.name !== workspace.name);
    newWorkspaces.unshift(workspace);
    setItems(WORKSPACES_KEY, newWorkspaces);
    uiActions.loadWorkspaces(); // Trigger UI refresh
    showToast({
        message: `Workspace "${workspace.name}" saved!`,
        type: 'pass',
    });
}

/**
 * Deletes an item from history by its URL.
 * @param {string} url The URL of the history item to delete.
 */
export function deleteHistoryItem(url) {
    const history = getHistory();
    const newHistory = history.filter((item) => item.url !== url);
    setItems(HISTORY_KEY, newHistory);
}

/**
 * Deletes a preset by its URL.
 * @param {string} url The URL of the preset to delete.
 */
export function deletePreset(url) {
    const presets = getPresets();
    const newPresets = presets.filter((item) => item.url !== url);
    setItems(PRESETS_KEY, newPresets);
}

/**
 * Deletes a workspace by its name and triggers a UI update.
 * @param {string} name The name of the workspace to delete.
 */
export function deleteWorkspace(name) {
    const workspaces = getWorkspaces();
    const newWorkspaces = workspaces.filter((w) => w.name !== name);
    setItems(WORKSPACES_KEY, newWorkspaces);
    uiActions.loadWorkspaces(); // Trigger UI refresh
}

/**
 * Fetches a manifest URL and asks the worker to determine its metadata.
 * @param {string} url The manifest URL.
 * @returns {Promise<{protocol: 'dash'|'hls', type: 'live'|'vod'}>}
 */
export async function fetchStreamMetadata(url) {
    showToast({ message: 'Fetching stream metadata...', type: 'info' });
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching manifest`);
        }
        const manifestString = await response.text();

        return await workerService.postTask('get-manifest-metadata', {
            manifestString,
        }).promise;
    } catch (e) {
        showToast({ message: `Error: ${e.message}`, type: 'fail' });
        throw e;
    }
}
