import { eventBus } from '../core/event-bus.js';
import { storeActions } from '../core/store.js';

export function initializeViewManager() {
    // The `startAnalysis` action resets the entire store to its initial state,
    // which includes setting `viewState` to 'input'. This correctly transitions the UI.
    eventBus.subscribe('analysis:started', () => {
        storeActions.startAnalysis();
    });

    // If analysis fails after starting, we ensure we're back in the input state.
    eventBus.subscribe('analysis:failed', () => {
        storeActions.startAnalysis();
    });

    // The `completeAnalysis` action, called on 'state:analysis-complete',
    // handles setting the viewState to 'results'. No listener is needed here.
}
