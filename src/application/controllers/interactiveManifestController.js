import { eventBus } from '@/application/event-bus';
import { uiActions } from '@/state/uiStore';
import { renderApp } from '@/ui/shell/mainRenderer';

export function initializeInteractiveManifestController() {
    eventBus.subscribe(
        'ui:interactive-manifest:page-changed',
        ({ newPage }) => {
            uiActions.setInteractiveManifestPage(newPage);
            // We still trigger a render here because the state change might not
            // be picked up by the main renderer if it's not subscribed to this specific change.
            // The new renderer is smart enough to only re-render the active tab.
            renderApp();
        }
    );

    eventBus.subscribe(
        'ui:interactive-manifest:toggle-substitution',
        () => {
            uiActions.toggleInteractiveManifestSubstitution();
            // This action directly affects the view, so we trigger a re-render.
            renderApp();
        }
    );
}