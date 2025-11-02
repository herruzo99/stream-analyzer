import { eventBus } from '@/application/event-bus';
import { uiActions, useUiStore } from '@/state/uiStore';

export function initializeInteractiveManifestController() {
    eventBus.subscribe(
        'ui:interactive-manifest:page-changed',
        ({ newPage }) => {
            uiActions.setInteractiveManifestPage(newPage);
        }
    );

    eventBus.subscribe('ui:interactive-manifest:toggle-substitution', () => {
        uiActions.toggleInteractiveManifestSubstitution();
    });

    eventBus.subscribe(
        'ui:interactive-manifest:item-hovered',
        ({ item }) => {
            uiActions.setInteractiveManifestHoveredItem(item);
        }
    );

    eventBus.subscribe('ui:interactive-manifest:item-unhovered', () => {
        uiActions.setInteractiveManifestHoveredItem(null);
    });

    eventBus.subscribe(
        'ui:interactive-manifest:item-clicked',
        ({ item }) => {
            const { interactiveManifestSelectedItem } = useUiStore.getState();
            if (
                interactiveManifestSelectedItem &&
                interactiveManifestSelectedItem.path === item.path
            ) {
                // Clicked the same item, so deselect it
                uiActions.setInteractiveManifestSelectedItem(null);
            } else {
                // Select the new item
                uiActions.setInteractiveManifestSelectedItem(item);
            }
        }
    );

    eventBus.subscribe('ui:interactive-manifest:clear-selection', () => {
        uiActions.setInteractiveManifestSelectedItem(null);
    });
}