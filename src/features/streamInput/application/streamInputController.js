import { eventBus } from '@/application/event-bus';
import { analysisActions } from '@/state/analysisStore';

export function initializeStreamInputController() {
    eventBus.subscribe(
        'ui:stream-input:populate-from-preset',
        ({ id, preset }) => {
            analysisActions.populateStreamInput(id, preset);
        }
    );

    eventBus.subscribe('ui:stream-input:remove-requested', ({ id }) => {
        analysisActions.removeStreamInput(id);
    });

    eventBus.subscribe('ui:stream-input:set-active', ({ id }) => {
        analysisActions.setActiveStreamInputId(id);
    });
}