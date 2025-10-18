import { eventBus } from '@/application/event-bus';
import { uiActions } from '@/state/uiStore';
import { renderApp } from '@/ui/shell/mainRenderer';

export function initializeFeatureAnalysisController() {
    eventBus.subscribe(
        'ui:feature-analysis:standard-version-changed',
        ({ version }) => {
            uiActions.setFeatureAnalysisStandardVersion(version);
            renderApp();
        }
    );
}