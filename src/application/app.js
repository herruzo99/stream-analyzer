import { saveToHistory } from '@/infrastructure/persistence/streamStorage.js';
import { uiActions } from '@/state/uiStore';

export class Application {
    /**
     * @param {object} services The injected services and utilities.
     */
    constructor(services) {
        this.eventBus = services.eventBus;
        this.analysisActions = services.analysisActions;
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
                uiActions.setActiveTab(defaultTab);
                uiActions.setViewState('results');
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
            this.analysisActions.setStreamInputsFromData(lastUsed);
            const allStoredStreams = [
                ...this.storage.getHistory(),
                ...this.storage.getPresets(),
            ];

            // This must run after the initial render populates the inputs
            Promise.resolve().then(() => {
                const inputGroups = document.querySelectorAll(
                    '[data-testid="stream-input-group"]'
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
        this.initializeAppEventListeners();
        this._populateInputs();
    }
}