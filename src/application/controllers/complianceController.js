import { eventBus } from '@/application/event-bus.js';
import { uiActions } from '@/state/uiStore.js';
import { renderApp } from '@/ui/shell/mainRenderer.js';

export function initializeComplianceController() {
    eventBus.subscribe('ui:compliance:filter-changed', ({ filter }) => {
        uiActions.setComplianceFilter(filter);
        renderApp();
    });

    eventBus.subscribe(
        'ui:compliance:standard-version-changed',
        ({ version }) => {
            uiActions.setComplianceStandardVersion(version);
            renderApp();
        }
    );

    eventBus.subscribe('ui:compliance:path-hovered', ({ pathId }) => {
        uiActions.setHighlightedCompliancePathId(pathId);
    });

    eventBus.subscribe('ui:compliance:path-unhovered', () => {
        uiActions.setHighlightedCompliancePathId(null);
    });
}