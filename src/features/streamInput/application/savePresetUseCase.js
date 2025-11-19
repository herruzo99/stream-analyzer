import { eventBus } from '@/application/event-bus';
import {
    fetchStreamMetadata,
    savePreset,
} from '@/infrastructure/persistence/streamStorage';
import { useAnalysisStore } from '@/state/analysisStore';
import { showToast } from '@/ui/components/toast';
import { uiActions } from '@/state/uiStore';
import { EVENTS } from '@/types/events';

function handleSavePresetRequest({ name, url, isPreset }) {
    uiActions.setPresetSaveStatus('saving');

    const streamInput = useAnalysisStore
        .getState()
        .streamInputs.find((i) => i.url === url);
    if (!streamInput) {
        showToast({
            message: 'Could not find stream input to save.',
            type: 'fail',
        });
        uiActions.setPresetSaveStatus('error');
        setTimeout(() => uiActions.setPresetSaveStatus('idle'), 2000);
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

            uiActions.loadPresets();
            uiActions.setPresetSaveStatus('saved');
        })
        .catch((err) => {
            console.error('Failed to save preset:', err);
            uiActions.setPresetSaveStatus('error');
        })
        .finally(() => {
            setTimeout(() => uiActions.setPresetSaveStatus('idle'), 2000);
        });
}

export function initializeSavePresetUseCase() {
    eventBus.subscribe(
        EVENTS.UI.SAVE_PRESET_REQUESTED,
        handleSavePresetRequest
    );
}
