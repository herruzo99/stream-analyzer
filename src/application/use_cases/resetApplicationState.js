import { stopAllMonitoring } from '@/application/services/primaryStreamMonitorService';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useDecryptionStore } from '@/state/decryptionStore';
import { usePlayerStore } from '@/state/playerStore';
import { useNetworkStore } from '@/state/networkStore';
import { multiPlayerService } from '@/features/multiPlayer/application/multiPlayerService';
import { uiActions } from '@/state/uiStore';

/**
 * Performs a hard reset of the entire application state.
 * This function stops all background processes, clears all data from every state store,
 * and then reloads persisted user data like presets and history.
 */
export function resetApplicationState() {
    // 1. Stop all background polling services.
    stopAllMonitoring();
    multiPlayerService.destroyAll();

    // 2. Reset all Zustand stores to their initial state.
    // The `startAnalysis` action on the analysis store also resets the UI store.
    useAnalysisStore.getState().startAnalysis();
    useSegmentCacheStore.getState().clear();
    useDecryptionStore.getState().clearCache();
    usePlayerStore.getState().reset();
    useNetworkStore.getState().reset();

    // 3. ARCHITECTURAL FIX: Re-hydrate the UI store with persisted data.
    // After the stores are cleared, we must reload any data that persists
    // across sessions, such as workspaces, presets, and history.
    uiActions.loadWorkspaces();
}
