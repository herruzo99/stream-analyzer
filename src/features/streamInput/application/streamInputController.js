import { eventBus } from '@/application/event-bus';
import { analysisActions } from '@/state/analysisStore';
import { EVENTS } from '@/types/events';

export function initializeStreamInputController() {
    eventBus.subscribe(
        EVENTS.UI.STREAM_INPUT_POPULATE_PRESET,
        ({ id, preset }) => {
            analysisActions.populateStreamInput(id, preset);
        }
    );

    eventBus.subscribe(EVENTS.UI.STREAM_INPUT_REMOVE, ({ id }) => {
        analysisActions.removeStreamInput(id);
    });

    eventBus.subscribe(EVENTS.UI.STREAM_INPUT_SET_ACTIVE, ({ id }) => {
        analysisActions.setActiveStreamInputId(id);
    });
}
