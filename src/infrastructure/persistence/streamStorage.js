import { showToast } from '@/ui/components/toast.js';
import { workerService } from '@/infrastructure/worker/workerService.js';

const HISTORY_KEY = 'stream-analyzer_history';
const PRESETS_KEY = 'stream-analyzer_presets';
const LAST_USED_KEY = 'stream-analyzer_last-used';
const MAX_HISTORY_ITEMS = 10;
const MAX_PRESETS = 50;

/**
 * Reads a list of streams from localStorage.
 * @param {string} key The localStorage key.
 * @returns {Array<object>}
 */
function getStreams(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        console.error(`Error reading from localStorage key "${key}":`, e);
        return [];
    }
}

/**
 * Writes a list of streams to localStorage.
 * @param {string} key The localStorage key.
 * @param {Array<object>} streams The array of streams to save.
 */
function setStreams(key, streams) {
    try {
        localStorage.setItem(key, JSON.stringify(streams));
    } catch (e) {
        console.error(`Error writing to localStorage key "${key}":`, e);
    }
}

export const getHistory = () => getStreams(HISTORY_KEY);
export const getPresets = () => getStreams(PRESETS_KEY);
export const getLastUsedStreams = () => getStreams(LAST_USED_KEY);
export const saveLastUsedStreams = (streams) =>
    setStreams(LAST_USED_KEY, streams);

/**
 * Saves a stream object to the history.
 * @param {import('@/types.ts').Stream} stream The stream object to save.
 */
export function saveToHistory(stream) {
    if (!stream || !stream.originalUrl) return;

    const history = getHistory();
    const presets = getPresets();
    const isPreset = presets.some((p) => p.url === stream.originalUrl);
    if (isPreset) return; // Don't add presets to history

    const newHistory = history.filter(
        (item) => item.url !== stream.originalUrl
    );
    newHistory.unshift({
        name: stream.name,
        url: stream.originalUrl,
        protocol: stream.protocol,
        type: stream.manifest?.type === 'dynamic' ? 'live' : 'vod',
    });

    if (newHistory.length > MAX_HISTORY_ITEMS) {
        newHistory.length = MAX_HISTORY_ITEMS;
    }
    setStreams(HISTORY_KEY, newHistory);
}

/**
 * Saves a stream object as a preset.
 * @param {object} preset The preset object to save.
 * @param {string} preset.name
 * @param {string} preset.url
 * @param {'dash'|'hls'|'unknown'} preset.protocol
 * @param {'live'|'vod'} preset.type
 */
export function savePreset({ name, url, protocol, type }) {
    const presets = getPresets();
    const newPresets = presets.filter((item) => item.url !== url);
    newPresets.unshift({ name, url, protocol, type });

    if (newPresets.length > MAX_PRESETS) {
        newPresets.length = MAX_PRESETS;
    }
    setStreams(PRESETS_KEY, newPresets);
    showToast({
        message: `Preset "${name}" saved!`,
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
    setStreams(HISTORY_KEY, newHistory);
}

/**
 * Deletes a preset by its URL.
 * @param {string} url The URL of the preset to delete.
 */
export function deletePreset(url) {
    const presets = getPresets();
    const newPresets = presets.filter((item) => item.url !== url);
    setStreams(PRESETS_KEY, newPresets);
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

        // Use the centralized worker service with a promise-based API
        return await workerService.postTask('get-manifest-metadata', {
            manifestString,
        });
    } catch (e) {
        showToast({ message: `Error: ${e.message}`, type: 'fail' });
        throw e;
    }
}