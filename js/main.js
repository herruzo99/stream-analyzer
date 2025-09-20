import { dom, analysisState } from './state.js';
import {
    addStreamInput,
    handleTabClick,
    populateContextSwitcher,
    renderAllTabs,
    showStatus,
} from './ui.js';
import { parseManifest as parseDashManifest } from './protocols/dash/parser.js';
import { parseManifest as parseHlsManifest } from './protocols/hls/parser.js';
import { setupGlobalTooltipListener } from './tooltip.js';
import { stopManifestUpdatePolling } from './features/manifest-updates/poll.js';
import { diffManifest } from './features/manifest-updates/diff.js';
import xmlFormatter from 'xml-formatter';

const HISTORY_KEY = 'dash_analyzer_history';
const MAX_HISTORY_ITEMS = 10;

// --- EVENT LISTENERS ---
dom.addStreamBtn.addEventListener('click', addStreamInput);
dom.analyzeBtn.addEventListener('click', handleAnalysis);
dom.tabs.addEventListener('click', handleTabClick);
dom.closeModalBtn.addEventListener('click', () => {
    const modalContent = dom.segmentModal.querySelector('div');
    dom.segmentModal.classList.add('opacity-0', 'invisible');
    dom.segmentModal.classList.remove('opacity-100', 'visible');
    modalContent.classList.add('scale-95');
    modalContent.classList.remove('scale-100');
});
dom.contextSwitcher.addEventListener('change', (e) => {
    const target = /** @type {HTMLSelectElement} */ (e.target);
    analysisState.activeStreamId = parseInt(target.value);
    renderAllTabs();
});

document.addEventListener('DOMContentLoaded', () => {
    addStreamInput();
    setupGlobalTooltipListener();
});

// --- HISTORY MANAGEMENT ---
function saveUrlToHistory(url) {
    if (!url) return;
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    // Remove the URL if it already exists to move it to the top
    history = history.filter((item) => item !== url);
    // Add the new URL to the beginning of the array
    history.unshift(url);
    // Trim the history to the maximum number of items
    if (history.length > MAX_HISTORY_ITEMS) {
        history.length = MAX_HISTORY_ITEMS;
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// --- CORE LOGIC ---
async function handleAnalysis() {
    stopManifestUpdatePolling();
    showStatus('Starting analysis...', 'info');
    analysisState.streams = [];
    analysisState.manifestUpdates = [];
    analysisState.activeManifestUpdateIndex = 0;

    const inputGroups = dom.streamInputs.querySelectorAll(
        '.stream-input-group'
    );

    const promises = Array.from(inputGroups).map(async (group) => {
        const id = parseInt(/** @type {HTMLElement} */ (group).dataset.id);
        const urlInput = /** @type {HTMLInputElement} */ (
            group.querySelector('.input-url')
        );
        const fileInput = /** @type {HTMLInputElement} */ (
            group.querySelector('.input-file')
        );

        let manifestString = '';
        let name = `Stream ${id + 1}`;
        let originalUrl = '';
        let baseUrl = '';
        let protocol = 'unknown';

        try {
            if (urlInput.value) {
                originalUrl = urlInput.value;
                name = new URL(originalUrl).hostname;
                baseUrl = new URL(originalUrl, window.location.href).href;

                // Protocol Detection
                if (originalUrl.toLowerCase().includes('.m3u8')) {
                    protocol = 'hls';
                } else if (originalUrl.toLowerCase().includes('.mpd')) {
                    protocol = 'dash';
                } else {
                    protocol = 'dash'; // Default to DASH
                }

                showStatus(`Fetching ${name}...`, 'info');
                const response = await fetch(originalUrl);
                if (!response.ok)
                    throw new Error(`HTTP Error ${response.status}`);
                manifestString = await response.text();
                saveUrlToHistory(originalUrl);
            } else if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                name = file.name;
                baseUrl = window.location.href; // Use page location as base for local files

                // Protocol Detection
                if (name.toLowerCase().includes('.m3u8')) {
                    protocol = 'hls';
                } else {
                    protocol = 'dash'; // Default to DASH
                }

                showStatus(`Reading ${name}...`, 'info');
                manifestString = await file.text();
            } else {
                return null; // Skip empty input group
            }

            showStatus(
                `Parsing (${protocol.toUpperCase()}) and resolving remote elements for ${name}...`,
                'info'
            );

            let parseResult;
            if (protocol === 'hls') {
                parseResult = await parseHlsManifest(manifestString, baseUrl);
            } else {
                parseResult = await parseDashManifest(manifestString, baseUrl);
            }
            const { manifest, baseUrl: newBaseUrl } = parseResult;
            baseUrl = newBaseUrl;

            return {
                id,
                name,
                originalUrl,
                baseUrl,
                protocol,
                manifest: manifest,
                rawManifest: manifestString,
                mediaPlaylists: new Map(),
                activeMediaPlaylistUrl: null,
            };
        } catch (error) {
            showStatus(
                `Failed to process stream ${id + 1} (${name}): ${error.message}`,
                'fail'
            );
            console.error(`Error details for stream ${id + 1}:`, error);
            throw error;
        }
    });

    try {
        const results = await Promise.all(promises);
        analysisState.streams = results.filter(Boolean);

        if (analysisState.streams.length === 0) {
            showStatus('No valid streams to analyze.', 'warn');
            return;
        }

        analysisState.streams.sort((a, b) => a.id - b.id);
        analysisState.activeStreamId = analysisState.streams[0].id;

        const activeStream = analysisState.streams[0];
        const isSingleDynamicStream =
            analysisState.streams.length === 1 &&
            activeStream.manifest.type === 'dynamic';
        analysisState.isPollingActive = isSingleDynamicStream;

        // Pre-populate the manifest updates state for a consistent UI start.
        if (isSingleDynamicStream) {
            let initialDiffHtml;
            if (activeStream.protocol === 'dash') {
                const formattingOptions = {
                    indentation: '  ',
                    lineSeparator: '\n',
                };
                const formattedInitial = xmlFormatter(
                    activeStream.rawManifest,
                    formattingOptions
                );
                initialDiffHtml = diffManifest('', formattedInitial);
            } else {
                // For HLS, just highlight the whole thing as an addition.
                initialDiffHtml = diffManifest('', activeStream.rawManifest);
            }

            analysisState.manifestUpdates.push({
                timestamp: new Date().toLocaleTimeString(),
                diffHtml: initialDiffHtml,
            });
        }

        const defaultTab =
            analysisState.streams.length > 1 ? 'comparison' : 'summary';

        populateContextSwitcher();
        renderAllTabs();

        showStatus(
            `Analysis Complete for ${analysisState.streams.length} stream(s).`,
            'pass'
        );
        dom.results.classList.remove('hidden');

        /** @type {HTMLButtonElement} */ (
            document.querySelector(`[data-tab="${defaultTab}"]`)
        ).click();
    } catch (error) {
        // This outer catch now provides critical debugging information.
        console.error('A critical error occurred during analysis:', error);
        showStatus(
            `A critical error occurred: ${error.message}. Check console for details.`,
            'fail'
        );
        dom.results.classList.add('hidden');
    }
}