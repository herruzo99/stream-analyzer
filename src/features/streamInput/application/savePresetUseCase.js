import { eventBus } from '@/application/event-bus';
import {
    deriveEffectiveSourceConfiguration,
    projectPersistableEffectiveSource,
} from '@/features/streamInput/application/effective-source-configuration.js';
import {
    fetchStreamMetadata,
    savePreset,
} from '@/infrastructure/persistence/streamStorage';
import { useAnalysisStore } from '@/state/analysisStore';
import { uiActions } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import { showToast } from '@/ui/components/toast';

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
    const effective = deriveEffectiveSourceConfiguration(streamInput);
    const persistable = projectPersistableEffectiveSource(effective);

    fetchStreamMetadata(effective.identity.url)
        .then(({ protocol, type }) => {
            savePreset({
                ...persistable,
                name,
                protocol,
                type,
            });

            uiActions.loadPresets();
            uiActions.setPresetSaveStatus('saved');
            showToast({
                message: `Preset “${name}” saved`,
                type: 'pass',
            });
        })
        .catch((err) => {
            console.error('Failed to save preset:', err);
            showToast({
                message: `Preset could not be saved: ${err.message}`,
                type: 'fail',
            });
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
