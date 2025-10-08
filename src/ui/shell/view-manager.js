import { eventBus } from '@/application/event-bus';
import { uiActions } from '@/state/uiStore';

export function initializeViewManager() {
    // This event should only indicate that the process has begun, typically
    // to show a loader. It should not reset the application state.
    eventBus.subscribe('analysis:started', () => {
        // DO NOT reset state here. The loader is handled separately.
        // The store is now only reset when a new analysis is explicitly requested
        // by the user via the "Analyze New Streams" button.
    });

    // If analysis fails after starting, we ensure we're back in the input state.
    // The `startAnalysis` action resets the store, which includes setting viewState to 'input'.
    eventBus.subscribe('analysis:failed', () => {
        uiActions.setViewState('input');
    });

    // The `completeAnalysis` action, called on 'state:analysis-complete',
    // handles setting the viewState to 'results'. No listener is needed here.
}
