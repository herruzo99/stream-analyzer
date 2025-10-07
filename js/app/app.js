import { addStreamInput } from '../ui/components/stream-inputs.js';
import { copyDebugInfoToClipboard } from '../services/debugService.js';
import { copyShareUrlToClipboard } from '../services/shareService.js';
import { saveToHistory } from '../shared/utils/stream-storage.js';

export class Application {
    /**
     * @param {object} dom The collected DOM elements.
     * @param {object} services The injected services and utilities.
     */
    constructor(dom, services) {
        this.dom = dom;
        this.eventBus = services.eventBus;
        this.storeActions = services.storeActions;
        this.stopAllMonitoring = services.stopAllMonitoring;
        this.storage = services.storage;
    }

    /**
     * Attaches core application event listeners.
     */
    initializeAppEventListeners() {
        this.eventBus.subscribe('state:analysis-complete', ({ streams }) => {
            if (streams.length > 0) {
                saveToHistory(streams[0]);
                const defaultTab =
                    streams.length > 1 ? 'comparison' : 'summary';
                this.storeActions.setActiveTab(defaultTab);
            }
        });

        this.eventBus.subscribe('analysis:error', ({ message, error }) => {
            this.eventBus.dispatch('ui:show-status', {
                message,
                type: 'fail',
                duration: 8000,
            });
            console.error('An analysis error occurred:', error);
        });
    }

    /**
     * Attaches DOM-specific event listeners.
     */
    _initializeDOMEventListeners() {
        this.dom.addStreamBtn.addEventListener('click', () => {
            addStreamInput();
        });
        this.dom.analyzeBtn.addEventListener('click', () =>
            this._handleAnalysis()
        );
        this.dom.newAnalysisBtn.addEventListener('click', () => {
            this.stopAllMonitoring();
            this.storeActions.startAnalysis();
        });
        this.dom.clearAllBtn.addEventListener('click', () => {
            this.storeActions.resetStreamInputIds();
        });
        this.dom.contextSwitcher.addEventListener('change', (e) => {
            const target = /** @type {HTMLSelectElement} */ (e.target);
            this.storeActions.setActiveStreamId(parseInt(target.value, 10));
        });
        this.dom.shareAnalysisBtn.addEventListener(
            'click',
            copyShareUrlToClipboard
        );
        this.dom.copyDebugBtn.addEventListener(
            'click',
            copyDebugInfoToClipboard
        );
    }

    /**
     * Triggers the stream analysis process.
     */
    _handleAnalysis() {
        const inputGroups = this.dom.streamInputs.querySelectorAll(
            '.stream-input-group'
        );
        const inputs = Array.from(inputGroups)
            .map((group) => {
                const id = parseInt(
                    /** @type {HTMLElement} */ (group).dataset.id
                );
                const urlInput = /** @type {HTMLInputElement} */ (
                    group.querySelector('.input-url')
                );
                const nameInput = /** @type {HTMLInputElement} */ (
                    group.querySelector('.input-name')
                );
                const fileInput = /** @type {HTMLInputElement} */ (
                    group.querySelector('.input-file')
                );
                return {
                    id,
                    url: urlInput.value,
                    name: nameInput.value,
                    file:
                        fileInput.files.length > 0 ? fileInput.files[0] : null,
                };
            })
            .filter((input) => input.url || input.file);

        if (inputs.length > 0) {
            const streamsToSave = inputs
                .filter((i) => i.url)
                .map((i) => ({ url: i.url, name: i.name }));
            this.storage.saveLastUsedStreams(streamsToSave);
            this.eventBus.dispatch('analysis:request', { inputs });
        } else {
            this.eventBus.dispatch('ui:show-status', {
                message: 'Please provide a stream URL or file to analyze.',
                type: 'warn',
            });
        }
    }

    /**
     * Populates input fields from URL parameters or local storage.
     */
    _populateInputs() {
        const urlParams = new URLSearchParams(window.location.search);
        const streamUrls = urlParams.getAll('url');

        if (streamUrls.length > 0 && streamUrls[0]) {
            const inputs = streamUrls.map((url, index) => ({
                id: index,
                url: url,
                file: null,
            }));
            this.eventBus.dispatch('analysis:request', { inputs });
        } else {
            this._populateLastUsedStreams();
        }
    }

    _populateLastUsedStreams() {
        const lastUsed = this.storage.getLastUsedStreams();
        if (lastUsed && lastUsed.length > 0) {
            this.storeActions.setStreamInputsFromData(lastUsed);
            const allStoredStreams = [
                ...this.storage.getHistory(),
                ...this.storage.getPresets(),
            ];

            Promise.resolve().then(() => {
                const inputGroups = this.dom.streamInputs.querySelectorAll(
                    '.stream-input-group'
                );
                inputGroups.forEach((group, index) => {
                    if (!lastUsed[index]) return;

                    const urlInput = /** @type {HTMLInputElement} */ (
                        group.querySelector('.input-url')
                    );
                    const nameInput = /** @type {HTMLInputElement} */ (
                        group.querySelector('.input-name')
                    );

                    if (urlInput) {
                        const lastUsedUrl = lastUsed[index].url || '';
                        urlInput.value = lastUsedUrl;

                        const storedItem = allStoredStreams.find(
                            (s) => s.url === lastUsedUrl
                        );
                        if (storedItem) {
                            nameInput.value = storedItem.name;
                        }

                        urlInput.dispatchEvent(
                            new Event('input', { bubbles: true })
                        );
                    }
                });
            });
        }
    }

    /**
     * Starts the application by attaching event listeners and populating initial data.
     */
    start() {
        this._initializeDOMEventListeners();
        this._populateInputs();
    }
}
