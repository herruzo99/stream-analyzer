import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { showToast } from '@/ui/components/toast';
import { createSafeJsonReplacer } from '@/shared/utils/debug';

/**
 * Gathers the current application state, distills it into a concise debug summary,
 * serializes it, and copies it to the clipboard.
 * Shows success or failure toasts to the user.
 */
export function copyDebugInfoToClipboard() {
    const analysisState = useAnalysisStore.getState();
    const { debugCopySelections } = useUiStore.getState();

    try {
        const debugData = {
            timestamp: new Date().toISOString(),
        };

        if (debugCopySelections.uiState) {
            const distilledUiState = { ...useUiStore.getState() };
            // Sanitize complex or large UI state properties
            distilledUiState.expandedComparisonTables = Array.from(
                distilledUiState.expandedComparisonTables
            );
            distilledUiState.expandedComparisonFlags = Array.from(
                distilledUiState.expandedComparisonFlags
            );
            distilledUiState.segmentExplorerClosedGroups = Array.from(
                distilledUiState.segmentExplorerClosedGroups
            );
            delete distilledUiState._viewMap; // Remove non-serializable view map
            debugData.uiState = distilledUiState;
        }

        if (debugCopySelections.analysisState) {
            const distilledAnalysisState = {
                activeStreamId: analysisState.activeStreamId,
                streamInputs: analysisState.streamInputs,
                segmentsForCompare: analysisState.segmentsForCompare,
                streams: analysisState.streams.map((stream) => {
                    const latestUpdate = stream.manifestUpdates?.[0];
                    const mediaPlaylistsRaw = {};

                    if (
                        debugCopySelections.rawManifests &&
                        stream.mediaPlaylists
                    ) {
                        for (const [
                            id,
                            playlistData,
                        ] of stream.mediaPlaylists.entries()) {
                            // --- HLS Master Deduplication Logic ---
                            if (stream.protocol === 'hls' && id === 'master') {
                                continue;
                            }
                            // Make the key more descriptive for debugging
                            const variantState = stream.hlsVariantState.get(id);
                            const key = variantState
                                ? `[${id}] ${variantState.uri}`
                                : id;
                            mediaPlaylistsRaw[key] = playlistData.rawManifest;
                        }
                    }

                    const streamCopy = {
                        id: stream.id,
                        name: stream.name,
                        originalUrl: stream.originalUrl,
                        protocol: stream.protocol,
                        manifestSummary: stream.manifest?.summary || null,
                        adAvails: stream.adAvails || [],
                        latestComplianceResults:
                            latestUpdate?.complianceResults || [],
                        coverageReport: stream.coverageReport || [],
                    };

                    if (debugCopySelections.rawManifests) {
                        streamCopy.rawManifest =
                            latestUpdate?.rawManifest || stream.rawManifest;
                        streamCopy.mediaPlaylistsRaw = mediaPlaylistsRaw;
                    }

                    return streamCopy;
                }),
            };
            debugData.analysisState = distilledAnalysisState;
        }

        if (debugCopySelections.parsedSegments) {
            const segmentCache = useSegmentCacheStore.getState().cache;
            const parsedSegments = {};
            let count = 0;
            segmentCache.forEach((entry, key) => {
                if (count < 5 && entry.parsedData) {
                    parsedSegments[key] = entry.parsedData;
                    count++;
                }
            });
            debugData.parsedSegments = parsedSegments;
        }

        const jsonString = JSON.stringify(
            debugData,
            createSafeJsonReplacer({
                distill: debugCopySelections.parsedSegments,
            }),
            2
        );

        navigator.clipboard
            .writeText(jsonString)
            .then(() => {
                showToast({
                    message: 'Selected debug info copied to clipboard!',
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