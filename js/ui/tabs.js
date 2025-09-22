import { html, render } from 'lit-html';
import { dom, analysisState } from '../core/state.js';
import { getInteractiveSegmentTemplate } from '../features/interactive-segment/view.js';
import { initializeSegmentExplorer } from '../features/segment-explorer/view.js';
import {
    startManifestUpdatePolling,
    stopManifestUpdatePolling,
} from '../features/manifest-updates/poll.js';
import {
    renderManifestUpdates,
    updatePollingButton,
    navigateManifestUpdates,
} from '../features/manifest-updates/view.js';
import { renderSingleStreamTabs } from './rendering.js';
import {
    startLiveSegmentHighlighter,
    stopLiveSegmentHighlighter,
} from '../features/segment-explorer/hls-explorer-view.js';

let keyboardNavigationListener = null;

export function handleTabClick(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    const targetTab = /** @type {HTMLElement} */ (
        target.closest('[data-tab]')
    );
    if (!targetTab) return;

    // --- Stop all timers on any tab change ---
    stopManifestUpdatePolling();
    stopLiveSegmentHighlighter();

    if (keyboardNavigationListener) {
        document.removeEventListener('keydown', keyboardNavigationListener);
        keyboardNavigationListener = null;
    }

    const activeClasses = ['border-blue-600', 'text-gray-100', 'bg-gray-700'];
    const inactiveClasses = ['border-transparent'];

    dom.tabs.querySelectorAll('[data-tab]').forEach((t) => {
        t.classList.remove(...activeClasses);
        t.classList.add(...inactiveClasses);
    });
    targetTab.classList.add(...activeClasses);
    targetTab.classList.remove(...inactiveClasses);

    Object.values(dom.tabContents).forEach((c) => {
        if (c) c.classList.add('hidden');
    });

    const activeTabName = targetTab.dataset.tab;
    const activeTabContent = dom.tabContents[activeTabName];
    if (activeTabContent) activeTabContent.classList.remove('hidden');

    // Re-render state-dependent tabs when they are clicked
    if (activeTabName === 'interactive-segment') {
        render(
            getInteractiveSegmentTemplate(),
            dom.tabContents['interactive-segment']
        );
    }
    if (activeTabName === 'interactive-manifest') {
        renderSingleStreamTabs(analysisState.activeStreamId);
    }

    // --- Start timers for specific tabs ---
    if (activeTabName === 'explorer') {
        startLiveSegmentHighlighter();
    } else if (activeTabName === 'updates') {
        // Only start polling if the state indicates it should be active.
        if (
            analysisState.isPollingActive &&
            analysisState.streams.length === 1 &&
            analysisState.streams[0].manifest.type === 'dynamic'
        ) {
            const stream = analysisState.streams[0];
            const onUpdateCallback = () => renderManifestUpdates(stream.id);
            startManifestUpdatePolling(stream, onUpdateCallback);
        }
        keyboardNavigationListener = (event) => {
            if (event.key === 'ArrowLeft') navigateManifestUpdates(1);
            if (event.key === 'ArrowRight') navigateManifestUpdates(-1);
        };
        document.addEventListener('keydown', keyboardNavigationListener);
    }
    updatePollingButton();
}