import { render } from 'lit-html';
import { eventBus } from '../core/event-bus.js';
import { analysisState, dom } from '../core/state.js';
import { getSegmentAnalysisTemplate } from './views/segment-analysis/index.js';

function openModal() {
    const modalPanel = dom.segmentModal.querySelector('div');
    dom.segmentModal.classList.remove('opacity-0', 'invisible');
    dom.segmentModal.classList.add('opacity-100', 'visible');
    modalPanel.classList.remove('scale-95');
    modalPanel.classList.add('scale-100');
}

/**
 * Initializes all UI-related event bus subscriptions.
 */
export function initializeUiController() {
    eventBus.subscribe('state:stream-updated', async () => {
        const stream = analysisState.streams.find(
            (s) => s.id === analysisState.activeStreamId
        );
        if (stream) {
            const { getInteractiveManifestTemplate } = await import(
                './views/interactive-manifest/index.js'
            );
            render(
                getInteractiveManifestTemplate(stream),
                dom.tabContents['interactive-manifest']
            );
        }
    });

    eventBus.subscribe('stream:data-updated', async ({ streamId }) => {
        // A generic event that signals data for a stream has been updated.
        // Multiple components can listen to this to refresh themselves.
        if (streamId !== analysisState.activeStreamId) {
            return;
        }

        // 1. Re-render Features tab if it's active
        const featuresTab = dom.tabs.querySelector('[data-tab="features"]');
        if (featuresTab && featuresTab.classList.contains('bg-gray-700')) {
            const stream = analysisState.streams.find((s) => s.id === streamId);
            if (stream) {
                const { getFeaturesAnalysisTemplate } = await import(
                    './views/feature-analysis/index.js'
                );
                render(
                    getFeaturesAnalysisTemplate(stream),
                    dom.tabContents.features
                );
            }
        }

        // 2. Re-render Manifest Updates tab if it's active
        const updatesTab = dom.tabs.querySelector('[data-tab="updates"]');
        if (updatesTab && updatesTab.classList.contains('bg-gray-700')) {
            const { renderManifestUpdates } = await import(
                './views/manifest-updates/index.js'
            );
            renderManifestUpdates(streamId);
        }
    });

    eventBus.subscribe('ui:request-segment-analysis', ({ url }) => {
        dom.modalTitle.textContent = 'Segment Analysis';
        dom.modalSegmentUrl.textContent = url;
        const cachedSegment = analysisState.segmentCache.get(url);
        openModal();
        render(
            getSegmentAnalysisTemplate(cachedSegment?.parsedData),
            dom.modalContentArea
        );
    });

    eventBus.subscribe('ui:request-segment-comparison', ({ urlA, urlB }) => {
        dom.modalTitle.textContent = 'Segment Comparison';
        dom.modalSegmentUrl.textContent = `Comparing Segment A vs. Segment B`;
        const segmentA = analysisState.segmentCache.get(urlA);
        const segmentB = analysisState.segmentCache.get(urlB);
        openModal();
        render(
            getSegmentAnalysisTemplate(
                segmentA?.parsedData,
                segmentB?.parsedData
            ),
            dom.modalContentArea
        );
    });
}