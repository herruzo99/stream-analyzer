import { eventBus } from '@/application/event-bus';
import {
    fetchStreamMetadata,
    savePreset,
} from '@/infrastructure/persistence/streamStorage';
import { useAnalysisStore } from '@/state/analysisStore';
import { showToast } from '@/ui/components/toast';

function handleSavePresetRequest({ name, url, button }) {
    button.disabled = true;
    button.textContent = 'Saving...';

    // Find the full input object to get auth details
    const streamInput = useAnalysisStore
        .getState()
        .streamInputs.find((i) => i.url === url);
    if (!streamInput) {
        showToast({ message: 'Could not find stream input to save.', type: 'fail' });
        button.textContent = 'Save as Preset';
        button.disabled = false;
        return;
    }

    fetchStreamMetadata(url)
        .then(({ protocol, type }) => {
            savePreset({
                name,
                url,
                protocol,
                type,
                auth: streamInput.auth,
                drmAuth: streamInput.drmAuth,
            });
            // Optionally clear the name field or give other UI feedback
            button.textContent = 'Saved!';
            eventBus.dispatch('use-case:preset-saved-successfully');
        })
        .catch((err) => {
            console.error('Failed to save preset:', err);
            // Error toast is already shown by fetchStreamMetadata
            button.textContent = 'Save as Preset';
            button.disabled = false;
        });
}

export function initializeSavePresetUseCase() {
    eventBus.subscribe('ui:save-preset-requested', handleSavePresetRequest);
}