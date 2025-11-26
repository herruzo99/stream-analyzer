import { eventBus } from '@/application/event-bus';
import { uiActions } from '@/state/uiStore';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { showToast } from '@/ui/components/toast';
import { EVENTS } from '@/types/events';

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

    // --- Auto-Cleanup for Failed Comparisons ---
    eventBus.subscribe(EVENTS.SEGMENT.LOADED, ({ uniqueId, entry }) => {
        // Check for failure (HTTP error or parsing error)
        const isError =
            entry.status >= 400 || (entry.parsedData && entry.parsedData.error);

        if (isError) {
            const { segmentsForCompare } = useAnalysisStore.getState();
            const isInCompare = segmentsForCompare.some(
                (s) => s.segmentUniqueId === uniqueId
            );

            if (isInCompare) {
                analysisActions.removeSegmentFromCompare(uniqueId);
                showToast({
                    message: 'Segment failed to load. Removed from comparison.',
                    type: 'warn',
                });
            }
        }
    });
}
