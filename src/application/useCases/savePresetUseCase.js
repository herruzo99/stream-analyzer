import { eventBus } from '@/application/event-bus';
import {
    fetchStreamMetadata,
    savePreset,
} from '@/infrastructure/persistence/streamStorage';
import { showToast } from '@/ui/components/toast';

function handleSavePresetRequest({ name, url, button }) {
    button.disabled = true;
    button.textContent = 'Saving...';

    fetchStreamMetadata(url)
        .then(({ protocol, type }) => {
            savePreset({ name, url, protocol, type });
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