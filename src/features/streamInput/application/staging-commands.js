import { eventBus } from '@/application/event-bus.js';
import { urlStateManager } from '@/application/url-state-manager.js';
import { mergeWorkspaceInputs } from '@/features/streamInput/application/library-contract.js';
import {
    deleteHistoryItem,
    deletePreset,
    deleteWorkspace,
    exportWorkspace,
    previewWorkspaceFile,
    restoreLastDeletedWorkspace,
    saveWorkspace,
} from '@/infrastructure/persistence/streamStorage';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import { showToast } from '@/ui/components/toast.js';
import { createStagingCommandService } from './staging-command-contract.js';

export const stagingCommands = createStagingCommandService({
    getAnalysisState: () => useAnalysisStore.getState(),
    getUiState: () => useUiStore.getState(),
    analysisActions,
    uiActions,
    persistWorkspace: (workspace) => saveWorkspace(workspace),
    createShareUrl: () => urlStateManager.getShareableUrl(),
    writeClipboard: (value) => navigator.clipboard.writeText(value),
    requestAnalysis: (inputs) =>
        eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, { inputs }),
    requestSegmentAnalysis: (files) =>
        eventBus.dispatch(EVENTS.UI.SEGMENT_ANALYSIS_REQUESTED, { files }),
    requestPresetSave: (detail) =>
        eventBus.dispatch(EVENTS.UI.SAVE_PRESET_REQUESTED, detail),
    previewWorkspaceImport: (file) => previewWorkspaceFile(file),
    mergeWorkspaceSources: (current, incoming) =>
        mergeWorkspaceInputs(current, incoming),
    exportWorkspaceFile: (name) => exportWorkspace(name),
    deleteLibraryRecord: (kind, identity) => {
        if (kind === 'workspaces') deleteWorkspace(identity);
        else if (kind === 'presets') deletePreset(identity);
        else if (kind === 'history') deleteHistoryItem(identity);
    },
    restoreDeletedWorkspace: () => restoreLastDeletedWorkspace(),
    notify: showToast,
});
