import { eventBus } from '@/application/event-bus';
import { uiActions } from '@/state/uiStore';

export function initializeSegmentExplorerController() {
    eventBus.subscribe(
        'ui:segment-explorer:representation-selected',
        ({ repId }) => {
            uiActions.setSegmentExplorerActiveRepId(repId);
        }
    );

    eventBus.subscribe('ui:segment-explorer:tab-changed', ({ tab }) => {
        uiActions.setSegmentExplorerActiveTab(tab);
    });

    eventBus.subscribe('ui:segment-explorer:sort-toggled', () => {
        uiActions.toggleSegmentExplorerSortOrder();
    });

    eventBus.subscribe('ui:segment-explorer:time-target-set', ({ target }) => {
        uiActions.setSegmentExplorerTargetTime(target);
    });

    eventBus.subscribe('ui:segment-explorer:time-target-cleared', () => {
        uiActions.clearSegmentExplorerTargetTime();
    });
}
