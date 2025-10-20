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

    eventBus.subscribe('ui:segment-explorer:sort-toggled', () => {
        uiActions.toggleSegmentExplorerSortOrder();
    });

    eventBus.subscribe(
        'ui:segment-explorer:time-filter-applied',
        ({ start, end }) => {
            uiActions.setSegmentExplorerTimeFilter({ start, end });
        }
    );

    eventBus.subscribe('ui:segment-explorer:time-filter-cleared', () => {
        uiActions.clearSegmentExplorerTimeFilter();
    });
}
