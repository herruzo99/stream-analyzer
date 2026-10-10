import { initializeCmafService } from '@/features/compliance/application/cmafService';
import { stagingCommands } from '@/features/streamInput/application/staging-commands.js';
import { saveToHistory } from '@/infrastructure/persistence/streamStorage';
import { useAnalysisStore } from '@/state/analysisStore';
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
                    const primaryStream = streams[0];
                    const isProcessLocal =
                        primaryStream.protocol === 'local' ||
                        primaryStream.manifest?.profiles === 'local-file';
                    if (!isProcessLocal) {
                        const sourceInput = useAnalysisStore
                            .getState()
                            .streamInputs.find(
                                (input) => input.id === primaryStream.id
                            );
                        saveToHistory(primaryStream, sourceInput);
                        // Reactively update the history list in the UI.
                        uiActions.loadHistory();
                    }
                    const defaultTab =
                        streams.length > 1 ? 'comparison' : 'summary';
                    // Only set the default tab if a session isn't being restored, as the session
                    // will set its own active tab.
                    if (!useUiStore.getState().isRestoringSession) {
                        uiActions.setActiveTab(defaultTab);
                    }
                    uiActions.setViewState('results');

                    // Trigger CMAF validation for DASH streams
                    streams.forEach((stream) => {
                        if (stream.protocol === 'dash') {
                            this.eventBus.dispatch(
                                'ui:cmaf-validation-requested',
                                { stream }
                            );
                        }
                    });
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

        this.eventBus.subscribe(
            'hls:media-playlist-activate',
            ({ streamId, variantId }) => {
                this.analysisActions.setActiveMediaPlaylist(
                    streamId,
                    variantId
                );
            }
        );
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

        // Check for shared state in URL hash first
        const sharedInputs = this.services.urlStateManager.getStateFromUrl();
        if (sharedInputs) {
            void stagingCommands.replaceAndAnalyzeSources(sharedInputs);
            // Clear the hash after consuming it to clean up the URL?
            // Maybe keep it so the user can refresh? Let's keep it for now.
            return;
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

            void stagingCommands.replaceAndAnalyzeSources(inputs);
        }
        // ARCHITECTURAL CHANGE: Removed automatic loading of last used streams here.
        // This allows the user to see the Landing Page and explicitly choose to "Resume".
    }

    /**
     * Starts the application by attaching event listeners and populating initial data.
     */
    start() {
        initializeCmafService();
        this.initializeAppEventListeners();
        this._populateInputs();
    }
}
