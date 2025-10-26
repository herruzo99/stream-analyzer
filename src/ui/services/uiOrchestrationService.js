import { eventBus } from '@/application/event-bus';
import { openModalWithContent } from '@/ui/services/modalService';
import { showToast } from '@/ui/components/toast';
import { showLoader, hideLoader } from '@/ui/components/loader';
import { getParsedSegment } from '@/infrastructure/segments/segmentService';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';

/**
 * Initializes listeners for global UI events that orchestrate application-level responses.
 */
export function initializeUiOrchestration() {
    eventBus.subscribe(
        'ui:show-segment-analysis-modal',
        ({ uniqueId, format }) => {
            const { activeStreamId } = useAnalysisStore.getState();
            const cachedEntry = useSegmentCacheStore.getState().get(uniqueId);

            // If we have parsed data already, just open the modal.
            if (cachedEntry?.parsedData) {
                openModalWithContent({
                    title: 'Segment Analysis',
                    url: uniqueId,
                    content: {
                        type: 'segmentAnalysis',
                        data: { parsedData: cachedEntry.parsedData },
                    },
                });
                return;
            }

            // Otherwise, trigger the full fetch/parse flow.
            showLoader('Analyzing segment...');
            getParsedSegment(uniqueId, activeStreamId, format)
                .then((parsedData) => {
                    hideLoader();
                    openModalWithContent({
                        title: 'Segment Analysis',
                        url: uniqueId,
                        content: {
                            type: 'segmentAnalysis',
                            data: { parsedData: parsedData },
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

    eventBus.subscribe('ui:request-segment-comparison', ({ urlA, urlB }) => {
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
    });
}