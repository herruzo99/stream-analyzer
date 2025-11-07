import { stopAllMonitoring } from '@/application/services/primaryStreamMonitorService';
import { stopAllHlsVariantPolling } from '@/application/services/hlsVariantPollerService';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useDecryptionStore } from '@/state/decryptionStore';
import { usePlayerStore } from '@/state/playerStore';
import { useNetworkStore } from '@/state/networkStore';
import { multiPlayerService } from '@/features/multiPlayer/application/multiPlayerService';

/**
 * Performs a hard reset of the entire application state.
 * This function stops all background processes and clears all data from every state store.
 */
export function resetApplicationState() {
    // 1. Stop all background polling services.
    stopAllMonitoring();
    stopAllHlsVariantPolling();
    multiPlayerService.destroyAll();

    // 2. Reset all Zustand stores to their initial state.
    // The `startAnalysis` action on the analysis store also resets the UI store.
    useAnalysisStore.getState().startAnalysis();
    useSegmentCacheStore.getState().clear();
    useDecryptionStore.getState().clearCache();
    usePlayerStore.getState().reset();
    useNetworkStore.getState().reset();
}
