import { saveToHistory } from '@/infrastructure/persistence/streamStorage';
import { uiActions, useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';

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
        this.eventBus.subscribe(
            EVENTS.STATE.ANALYSIS_COMPLETE,
            ({ streams }) => {
                if (streams.length > 0) {
                    saveToHistory(streams[0]);
                    uiActions.loadHistory(); // Reactively update the history list in the UI
                    const defaultTab =
                        streams.length > 1 ? 'comparison' : 'summary';
                    // Only set the default tab if a session isn't being restored, as the session
                    // will set its own active tab.
                    if (!useUiStore.getState().isRestoringSession) {
                        uiActions.setActiveTab(defaultTab);
                    }
                    uiActions.setViewState('results');
                }
            }
        );

        this.eventBus.subscribe(EVENTS.ANALYSIS.ERROR, ({ message, error }) => {
            this.eventBus.dispatch(EVENTS.UI.SHOW_STATUS, {
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
     * Populates input fields from URL parameters.
     * Note: We no longer auto-populate from local storage on boot to allow the Landing Page to show.
     * This logic is skipped if a session is being restored.
     */
    _populateInputs() {
        if (useUiStore.getState().isRestoringSession) {
            return; // Session restoration is in progress, do nothing.
        }

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
            this.eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
                inputs,
            });
        }
        // ARCHITECTURAL CHANGE: Removed automatic loading of last used streams here.
        // This allows the user to see the Landing Page and explicitly choose to "Resume".
    }

    /**
     * Starts the application by attaching event listeners and populating initial data.
     */
    start() {
        this.initializeAppEventListeners();
        this._populateInputs();
    }
}
