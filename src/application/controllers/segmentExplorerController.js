import { eventBus } from '@/application/event-bus';
import { uiActions } from '@/state/uiStore';
import { renderApp } from '@/ui/shell/mainRenderer';

export function initializeSegmentExplorerController() {
    eventBus.subscribe('ui:segment-explorer:dash-mode-changed', ({ mode }) => {
        uiActions.setSegmentExplorerDashMode(mode);
        renderApp();
    });

    eventBus.subscribe('ui:segment-explorer:tab-changed', ({ tab }) => {
        uiActions.setSegmentExplorerActiveTab(tab);
        renderApp();
    });
}
