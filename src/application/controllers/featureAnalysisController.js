import { eventBus } from '@/application/event-bus.js';
import { uiActions } from '@/state/uiStore.js';
import { renderApp } from '@/ui/shell/mainRenderer.js';

export function initializeFeatureAnalysisController() {
    eventBus.subscribe(
        'ui:feature-analysis:standard-version-changed',
        ({ version }) => {
            uiActions.setFeatureAnalysisStandardVersion(version);
            renderApp();
        }
    );
}