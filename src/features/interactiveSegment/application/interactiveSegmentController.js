import { eventBus } from '@/application/event-bus';
import { useUiStore, uiActions } from '@/state/uiStore';

export function initializeInteractiveSegmentController() {
    eventBus.subscribe(
        'ui:interactive-segment:item-hovered',
        ({ item, field }) => {
            uiActions.setInteractiveSegmentHighlightedItem(item, field);
        }
    );

    eventBus.subscribe('ui:interactive-segment:item-unhovered', () => {
        uiActions.setInteractiveSegmentHighlightedItem(null, null);
    });

    eventBus.subscribe('ui:interactive-segment:item-clicked', ({ item }) => {
        const { interactiveSegmentSelectedItem } = useUiStore.getState();
        if (
            interactiveSegmentSelectedItem &&
            interactiveSegmentSelectedItem.item?.offset === item?.offset
        ) {
            // Clicked the same item, so deselect it
            uiActions.setInteractiveSegmentSelectedItem(null);
        } else {
            // Select the new item
            uiActions.setInteractiveSegmentSelectedItem(item);
        }
    });
}
