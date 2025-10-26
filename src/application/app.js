import { saveToHistory } from '@/infrastructure/persistence/streamStorage';
import { uiActions } from '@/state/uiStore';

export class Application {
    /**
     * @param {object} services The injected services from the container.
     */
    constructor(services) {
        this.services = services; // Store the whole services object
        this.eventBus = services.eventBus;
        this.analysisActions = services.analysisActions;
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

            // Report error to Sentry if available
            if (window.Sentry) {
                window.Sentry.captureException(error, {
                    extra: { message },
                });
            }
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
                name: '', // Name is not available from URL params
            }));

            // Set the inputs in the store so the UI can reflect them if analysis fails
            this.analysisActions.setStreamInputs(inputs);
            // Dispatch event instead of calling use case directly
            this.eventBus.dispatch('ui:stream-analysis-requested', { inputs });
        } else {
            this._populateLastUsedStreams();
        }
    }

    _populateLastUsedStreams() {
        const { storage } = this.services;
        const lastUsed = storage.getLastUsedStreams();
        if (lastUsed && lastUsed.length > 0) {
            // Set inputs from storage. The `setStreamInputs` action now handles setting the active input.
            this.analysisActions.setStreamInputs(lastUsed);
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
