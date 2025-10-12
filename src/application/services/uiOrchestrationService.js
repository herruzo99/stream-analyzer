import { eventBus } from '@/application/event-bus';
import { openModalWithContent } from '@/ui/services/modalService';
import { showToast } from '@/ui/components/toast';
import { showLoader, hideLoader } from '@/ui/components/loader';
import { getParsedSegment } from '@/application/services/segmentService';

/**
 * Initializes listeners for global UI events that orchestrate application-level responses.
 */
export function initializeUiOrchestration() {
    eventBus.subscribe('ui:request-segment-analysis', ({ url, format }) => {
        showLoader('Analyzing segment...');
        getParsedSegment(url, format)
            .then((parsedData) => {
                hideLoader();
                openModalWithContent({
                    title: 'Segment Analysis',
                    url: url,
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
    });

    eventBus.subscribe(
        'ui:request-segment-comparison',
        ({ urlA, urlB }) => {
            showLoader('Analyzing segments for comparison...');
            Promise.all([getParsedSegment(urlA), getParsedSegment(urlB)])
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
}