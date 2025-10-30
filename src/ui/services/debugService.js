import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { showToast } from '@/ui/components/toast';

/**
 * Gathers the current application state, distills it into a concise debug summary,
 * serializes it, and copies it to the clipboard.
 * Shows success or failure toasts to the user.
 */
export function copyDebugInfoToClipboard() {
    const analysisState = useAnalysisStore.getState();
    const uiState = useUiStore.getState();

    try {
        // --- STATE DISTILLATION LOGIC ---
        const distilledUiState = { ...uiState };
        delete distilledUiState.pagedByteMap; // Remove large, transient data
        distilledUiState.expandedComparisonTables = Array.from(
            distilledUiState.expandedComparisonTables
        );
        distilledUiState.expandedComparisonFlags = Array.from(
            distilledUiState.expandedComparisonFlags
        );

        const distilledAnalysisState = {
            activeStreamId: analysisState.activeStreamId,
            streamInputs: analysisState.streamInputs,
            segmentsForCompare: analysisState.segmentsForCompare,
            streams: analysisState.streams.map((stream) => {
                const latestUpdate = stream.manifestUpdates?.[0];
                return {
                    id: stream.id,
                    name: stream.name,
                    originalUrl: stream.originalUrl,
                    protocol: stream.protocol,
                    rawManifest:
                        latestUpdate?.rawManifest || stream.rawManifest,
                    manifestSummary: stream.manifest?.summary || null,
                    adAvails: stream.adAvails || [], // Include ad avails in the debug output
                    latestComplianceResults:
                        latestUpdate?.complianceResults || [],
                    coverageReport: stream.coverageReport || [],
                };
            }),
        };

        const debugData = {
            timestamp: new Date().toISOString(),
            analysisState: distilledAnalysisState,
            uiState: distilledUiState,
        };
        // --- END DISTILLATION ---

        const jsonString = JSON.stringify(debugData, null, 2);

        navigator.clipboard
            .writeText(jsonString)
            .then(() => {
                showToast({
                    message: 'Distilled debug info copied to clipboard!',
                    type: 'pass',
                });
            })
            .catch((err) => {
                console.error('Failed to copy debug info:', err);
                showToast({
                    message: 'Failed to copy debug info.',
                    type: 'fail',
                });
            });
    } catch (error) {
        console.error('Error serializing debug state:', error);
        showToast({ message: 'Error creating debug info.', type: 'fail' });
    }
}