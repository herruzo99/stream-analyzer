import { render } from 'lit-html';
import { dom } from '../core/dom.js';
import { useStore, storeActions } from '../core/store.js';
import { getInteractiveSegmentTemplate } from './views/interactive-segment/index.js';
import {
    renderManifestUpdates,
    navigateManifestUpdates,
} from './views/manifest-updates/index.js';
import { renderSingleStreamTabs } from './rendering.js';
import { initializeSegmentExplorer } from './views/segment-explorer/index.js';
import { stopLiveSegmentHighlighter } from './views/segment-explorer/components/hls/index.js';

let keyboardNavigationListener = null;

export function handleTabClick(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    const targetTab = /** @type {HTMLElement} */ (target.closest('[data-tab]'));
    if (!targetTab) return;

    // --- Cleanup logic for timers ---
    if (keyboardNavigationListener) {
        document.removeEventListener('keydown', keyboardNavigationListener);
        keyboardNavigationListener = null;
    }
    stopLiveSegmentHighlighter(); // Stop the live segment UI updater

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

    const { activeStreamId, streams } = useStore.getState();

    if (activeTabName === 'interactive-segment') {
        render(
            getInteractiveSegmentTemplate(),
            dom.tabContents['interactive-segment']
        );
    }
    if (activeTabName === 'interactive-manifest') {
        renderSingleStreamTabs(activeStreamId);
    }

    if (activeTabName === 'explorer') {
        const stream = streams.find((s) => s.id === activeStreamId);
        if (stream) {
            initializeSegmentExplorer(dom.tabContents.explorer, stream);
        }
    }

    if (activeTabName === 'updates') {
        keyboardNavigationListener = (event) => {
            if (event.key === 'ArrowRight') navigateManifestUpdates(1);
            if (event.key === 'ArrowLeft') navigateManifestUpdates(-1);
        };
        document.addEventListener('keydown', keyboardNavigationListener);
        renderManifestUpdates(activeStreamId); // Initial render
    }
}
