import { stopLiveSegmentHighlighter } from './views/segment-explorer/components/hls/index.js';
import { useStore, storeActions } from '../core/store.js';
import { showLoader } from './components/loader.js';

let dom;
let keyboardNavigationListener = null;

export function initializeTabs(domContext) {
    dom = domContext;
    dom.tabs.addEventListener('click', handleTabClick);

    // Subscribe to activeTab changes in the store to update button styling
    useStore.subscribe((state, prevState) => {
        if (state.activeTab !== prevState.activeTab) {
            updateTabButtonStyling(state.activeTab);
        }
    });

    // Initial styling on load
    updateTabButtonStyling(useStore.getState().activeTab);
}

function updateTabButtonStyling(activeTabName) {
    const activeClasses = ['border-blue-600', 'text-gray-100', 'bg-gray-700'];
    const inactiveClasses = ['border-transparent'];

    dom.tabs.querySelectorAll('[data-tab]').forEach((t) => {
        if (t.dataset.tab === activeTabName) {
            t.classList.add(...activeClasses);
            t.classList.remove(...inactiveClasses);
        } else {
            t.classList.remove(...activeClasses);
            t.classList.add(...inactiveClasses);
        }
    });
}

async function handleTabClick(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    const targetTab = /** @type {HTMLElement} */ (target.closest('[data-tab]'));
    if (!targetTab) return;

    if (useStore.getState().activeTab === targetTab.dataset.tab) {
        return; // Do not re-render if the same tab is clicked
    }

    showLoader('Loading view...');

    // Defer the state change and subsequent render to the next event loop tick.
    // This gives the browser a chance to paint the loader before the main thread
    // gets blocked by the potentially heavy rendering work of the new tab.
    setTimeout(async () => {
        if (keyboardNavigationListener) {
            document.removeEventListener('keydown', keyboardNavigationListener);
            keyboardNavigationListener = null;
        }
        stopLiveSegmentHighlighter();

        const activeTabName = targetTab.dataset.tab;
        storeActions.setActiveTab(activeTabName);

        // Special handling for keyboard navigation in the 'updates' tab
        if (activeTabName === 'updates') {
            const { navigateManifestUpdates } = await import(
                './views/manifest-updates/index.js'
            );
            keyboardNavigationListener = (event) => {
                if (event.key === 'ArrowRight') navigateManifestUpdates(1);
                if (event.key === 'ArrowLeft') navigateManifestUpdates(-1);
            };
            document.addEventListener('keydown', keyboardNavigationListener);
        }
    }, 0);
}
