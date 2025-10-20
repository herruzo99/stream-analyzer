import { eventBus } from '@/application/event-bus';
import { analysisActions } from '@/state/analysisStore';

export function initializeStreamInputController() {
    eventBus.subscribe('ui:stream-input:populate-from-preset', (payload) => {
        // This is now handled by dispatching actions to the central store.
        const { id, url, name } = payload;
        analysisActions.updateStreamInput(id, 'url', url);
        analysisActions.updateStreamInput(id, 'name', name);
        analysisActions.updateStreamInput(id, 'file', null); // Clear file input
    });

    eventBus.subscribe('ui:stream-input:remove-requested', ({ id }) => {
        analysisActions.removeStreamInput(id);
    });
}
