import { eventBus } from '@/application/event-bus.js';
import { useSegmentCacheStore } from '@/state/segmentCacheStore.js';
import { openModalWithContent } from '@/ui/services/modalService.js';
import { showToast } from '@/ui/components/toast.js';

/**
 * Initializes listeners for global UI events that orchestrate application-level responses.
 */
export function initializeUiOrchestration() {
    eventBus.subscribe('ui:request-segment-analysis', ({ url }) => {
        const { get: getFromCache } = useSegmentCacheStore.getState();
        const cacheEntry = getFromCache(url);
        if (cacheEntry?.parsedData) {
            openModalWithContent({
                title: 'Segment Analysis',
                url: url,
                content: {
                    type: 'segmentAnalysis',
                    data: { parsedData: cacheEntry.parsedData },
                },
            });
        } else {
            showToast({
                message: 'Segment data not ready. Please load it first.',
                type: 'warn',
            });
        }
    });

    eventBus.subscribe('ui:request-segment-comparison', ({ urlA, urlB }) => {
        const { get: getFromCache } = useSegmentCacheStore.getState();
        const cacheEntryA = getFromCache(urlA);
        const cacheEntryB = getFromCache(urlB);

        if (cacheEntryA?.parsedData && cacheEntryB?.parsedData) {
            openModalWithContent({
                title: 'Segment Comparison',
                url: 'Comparing two segments',
                content: {
                    type: 'segmentAnalysis',
                    data: {
                        parsedData: cacheEntryA.parsedData,
                        parsedDataB: cacheEntryB.parsedData,
                    },
                },
            });
        } else {
            showToast({
                message: 'One or both segments not loaded for comparison.',
                type: 'warn',
            });
        }
    });
}