import { eventBus } from '@/application/event-bus';
import { analysisActions } from '@/state/analysisStore';
import { parseScte35 } from '@/infrastructure/parsing/scte35/parser';

/**
 * Listens for low-level player events and orchestrates higher-level
 * application state updates and use case triggers.
 */
function initializePlayerEventOrchestrator() {
    eventBus.subscribe('player:emsg', (emsg) => {
        const {
            schemeIdUri,
            startTime,
            endTime,
            timescale,
            presentationTimeDelta,
            eventDuration,
            id,
            messageData,
        } = emsg;
        const streamId = emsg.stream.id;

        // Create a canonical Event object from the raw emsg
        const event = {
            startTime: startTime,
            duration: eventDuration / timescale,
            message: `In-band Event: ${schemeIdUri}`,
            type: 'inband-event',
            scte35: null,
        };

        // If it's a SCTE-35 signal, parse it
        if (schemeIdUri.includes('scte35')) {
            try {
                // messageData is a Uint8Array from Shaka
                event.scte35 = parseScte35(messageData);
            } catch (e) {
                console.error('Failed to parse SCTE-35 from emsg event:', e);
                event.scte35 = { error: e.message };
            }
        }

        // Dispatch the canonical event to the analysis store
        analysisActions.addInbandEvents(streamId, [event]);
    });
}

// Export as a single object for consistency with other services
export const playerEventOrchestratorService = {
    initialize: initializePlayerEventOrchestrator,
};
