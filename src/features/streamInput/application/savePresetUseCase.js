import { eventBus } from '@/application/event-bus';
import {
    fetchStreamMetadata,
    savePreset,
} from '@/infrastructure/persistence/streamStorage';
import { useAnalysisStore } from '@/state/analysisStore';
import { showToast } from '@/ui/components/toast';
import { uiActions } from '@/state/uiStore';

function handleSavePresetRequest({ name, url, button, isPreset }) {
    button.disabled = true;
    const originalButtonText = button.textContent;
    button.textContent = 'Saving...';

    const streamInput = useAnalysisStore
        .getState()
        .streamInputs.find((i) => i.url === url);
    if (!streamInput) {
        showToast({
            message: 'Could not find stream input to save.',
            type: 'fail',
        });
        button.textContent = originalButtonText;
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

            button.textContent = isPreset ? 'Updated!' : 'Saved!';
            setTimeout(() => {
                // The component will re-render and update the button state,
                // so we don't need to reset the text here, just re-enable.
                button.disabled = false;
            }, 1500);

            // Trigger a re-render of the library panel by reloading the presets into the UI store.
            uiActions.loadPresets();
        })
        .catch((err) => {
            console.error('Failed to save preset:', err);
            button.textContent = originalButtonText;
            button.disabled = false;
        });
}

export function initializeSavePresetUseCase() {
    eventBus.subscribe('ui:save-preset-requested', handleSavePresetRequest);
}