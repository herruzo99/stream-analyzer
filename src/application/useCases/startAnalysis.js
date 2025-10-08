import { eventBus } from '@/application/event-bus.js';

/**
 * Orchestrates the business logic of starting a new stream analysis.
 * It is independent of the UI and any framework.
 * @param {object} params
 * @param {Array<{id: number, url: string, name: string, file: File | null}>} params.inputs - The raw input data from the UI.
 * @param {object} services - Injected dependencies for storage.
 * @param {{saveLastUsedStreams: Function}} services.storage - Storage service.
 */
export function startAnalysisUseCase({ inputs }, services) {
    const validInputs = inputs.filter((input) => input.url || input.file);

    if (validInputs.length > 0) {
        const streamsToSave = validInputs
            .filter((i) => i.url)
            .map((i) => ({ url: i.url, name: i.name }));

        services.storage.saveLastUsedStreams(streamsToSave);
        eventBus.dispatch('analysis:request', { inputs: validInputs });
    } else {
        eventBus.dispatch('ui:show-status', {
            message: 'Please provide a stream URL or file to analyze.',
            type: 'warn',
        });
    }
}
