import { eventBus } from '@/application/event-bus.js';
import { uiActions } from '@/state/uiStore.js';
import { renderApp } from '@/ui/shell/mainRenderer.js';

export function initializeSegmentExplorerController() {
    eventBus.subscribe(
        'ui:segment-explorer:dash-mode-changed',
        ({ mode }) => {
            uiActions.setSegmentExplorerDashMode(mode);
            renderApp();
        }
    );
}