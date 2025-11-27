import { eventBus } from '@/application/event-bus';
import { uiActions } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import { renderApp } from '@/ui/shell/mainRenderer';

export function initializeComplianceController() {
    eventBus.subscribe(EVENTS.UI.COMPLIANCE_FILTER_CHANGED, ({ filter }) => {
        uiActions.setComplianceFilter(filter);
        renderApp();
    });

    eventBus.subscribe(EVENTS.UI.COMPLIANCE_STANDARD_CHANGED, ({ version }) => {
        uiActions.setComplianceStandardVersion(version);
        renderApp();
    });

    eventBus.subscribe(EVENTS.UI.COMPLIANCE_PATH_HOVERED, ({ pathId }) => {
        uiActions.setHighlightedCompliancePathId(pathId);
    });

    eventBus.subscribe(EVENTS.UI.COMPLIANCE_PATH_UNHOVERED, () => {
        uiActions.setHighlightedCompliancePathId(null);
    });
}
