import { render, html } from 'lit-html';
import { eventBus } from '../core/event-bus.js';
import { analysisState, dom } from '../core/state.js';
import { getInteractiveManifestTemplate } from './views/interactive-manifest/index.js';
import { getFeaturesAnalysisTemplate } from './views/feature-analysis/index.js';
import { getSegmentAnalysisTemplate } from './views/segment-analysis/index.js';
import { resetAndRenderAllStreamInputs } from './components/stream-inputs.js';
import { renderManifestUpdates } from './views/manifest-updates/index.js';

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
    eventBus.subscribe('state:stream-updated', () => {
        const stream = analysisState.streams.find(
            (s) => s.id === analysisState.activeStreamId
        );
        if (stream) {
            render(
                getInteractiveManifestTemplate(stream),
                dom.tabContents['interactive-manifest']
            );
        }
    });

    eventBus.subscribe('stream:data-updated', ({ streamId }) => {
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
                render(
                    getFeaturesAnalysisTemplate(stream),
                    dom.tabContents.features
                );
            }
        }

        // 2. Re-render Manifest Updates tab if it's active
        const updatesTab = dom.tabs.querySelector('[data-tab="updates"]');
        if (updatesTab && updatesTab.classList.contains('bg-gray-700')) {
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

    // Handle UI reset on new analysis
    eventBus.subscribe('analysis:started', () => {
        // Reset main layout
        dom.results.classList.add('hidden');
        dom.newAnalysisBtn.classList.add('hidden');
        dom.shareAnalysisBtn.classList.add('hidden');
        dom.contextSwitcherWrapper.classList.add('hidden');
        dom.inputSection.classList.remove('hidden');
        dom.status.textContent = '';

        // Reset header layout
        dom.mainHeader.classList.add('justify-center');
        dom.mainHeader.classList.remove('justify-between');
        dom.headerTitleGroup.classList.add('text-center');
        dom.headerTitleGroup.classList.remove('text-left');
        dom.headerUrlDisplay.classList.add('hidden');
        dom.headerUrlDisplay.innerHTML = '';

        resetAndRenderAllStreamInputs();

        Object.values(dom.tabContents).forEach((container) => {
            if (container) {
                render(html``, container);
            }
        });

        const firstTab = /** @type {HTMLElement} */ (
            dom.tabs.querySelector('[data-tab="comparison"]')
        );
        const activeClasses = [
            'border-blue-600',
            'text-gray-100',
            'bg-gray-700',
        ];
        const inactiveClasses = ['border-transparent'];
        dom.tabs.querySelectorAll('[data-tab]').forEach((t) => {
            t.classList.remove(...activeClasses);
            t.classList.add(...inactiveClasses);
        });
        if (firstTab) {
            firstTab.classList.add(...activeClasses);
            firstTab.classList.remove(...inactiveClasses);
        }
    });
}
