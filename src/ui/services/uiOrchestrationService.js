import { eventBus } from '@/application/event-bus';
import { openModalWithContent } from '@/ui/services/modalService';
import { showToast } from '@/ui/components/toast';
import { showLoader, hideLoader } from '@/ui/components/loader';
import { getParsedSegment } from '@/infrastructure/segments/segmentService';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { EVENTS } from '@/types/events';

/**
 * Initializes listeners for global UI events that orchestrate application-level responses.
 */
export function initializeUiOrchestration() {
    // --- Segment Analysis Modal ---
    eventBus.subscribe(
        EVENTS.UI.SHOW_SEGMENT_ANALYSIS_MODAL,
        ({ uniqueId, format, isIFrame }) => {
            const { activeStreamId } = useAnalysisStore.getState();
            const cachedEntry = useSegmentCacheStore.getState().get(uniqueId);

            if (cachedEntry?.parsedData) {
                openModalWithContent({
                    title: 'Segment Analysis',
                    url: uniqueId,
                    content: {
                        type: 'segmentAnalysis',
                        data: {
                            parsedData: cachedEntry.parsedData,
                            isIFrame: isIFrame,
                        },
                    },
                });
                return;
            }

            showLoader('Analyzing segment...');
            getParsedSegment(uniqueId, activeStreamId, format, {
                isIFrame,
            })
                .then((parsedData) => {
                    hideLoader();
                    openModalWithContent({
                        title: 'Segment Analysis',
                        url: uniqueId,
                        content: {
                            type: 'segmentAnalysis',
                            data: { parsedData: parsedData, isIFrame },
                        },
                    });
                })
                .catch((error) => {
                    hideLoader();
                    showToast({
                        message: `Failed to analyze segment: ${error.message}`,
                        type: 'fail',
                    });
                });
        }
    );

    // --- Segment Comparison ---
    eventBus.subscribe(
        EVENTS.UI.REQUEST_SEGMENT_COMPARISON,
        ({ urlA, urlB }) => {
            const { activeStreamId } = useAnalysisStore.getState();
            showLoader('Analyzing segments for comparison...');
            Promise.all([
                getParsedSegment(urlA, activeStreamId),
                getParsedSegment(urlB, activeStreamId),
            ])
                .then(([parsedDataA, parsedDataB]) => {
                    hideLoader();
                    openModalWithContent({
                        title: 'Segment Comparison',
                        url: 'Comparing two segments',
                        content: {
                            type: 'segmentAnalysis',
                            data: {
                                parsedData: parsedDataA,
                                parsedDataB: parsedDataB,
                            },
                        },
                    });
                })
                .catch((error) => {
                    hideLoader();
                    showToast({
                        message: `Failed to compare segments: ${error.message}`,
                        type: 'fail',
                    });
                });
        }
    );

    // --- SCTE-35 Details ---
    eventBus.subscribe(
        EVENTS.UI.SHOW_SCTE35_DETAILS,
        ({ scte35, startTime }) => {
            openModalWithContent({
                title: `SCTE-35 Details (${scte35.splice_command?.type || 'Unknown'})`,
                url: `Event at ${startTime.toFixed(3)}s`,
                content: {
                    type: 'segmentAnalysis',
                    data: {
                        parsedData: {
                            format: 'scte35',
                            data: scte35,
                        },
                    },
                },
            });
        }
    );

    // --- Manifest Patcher ---
    eventBus.subscribe(EVENTS.UI.SHOW_MANIFEST_PATCHER, () => {
        const { activeStreamId, streams } = useAnalysisStore.getState();
        const activeStream = streams.find((s) => s.id === activeStreamId);

        if (!activeStream) {
            showToast({
                message: 'No active stream to patch.',
                type: 'warn',
            });
            return;
        }

        openModalWithContent({
            title: 'Manifest Patcher',
            url: activeStream.originalUrl || 'Local File',
            content: {
                type: 'manifestPatcher',
                data: { streamId: activeStreamId },
            },
            isFullWidth: true,
        });
    });
}
