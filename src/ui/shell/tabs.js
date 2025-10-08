import { stopLiveSegmentHighlighter } from '@/features/segmentExplorer/ui/components/hls/index.js';
import { useUiStore, uiActions } from '@/state/uiStore.js';
import { showLoader, hideLoader } from '@/ui/components/loader.js';

let dom;
let keyboardNavigationListener = null;

export function initializeTabs(domContext) {
    dom = domContext;
    dom.tabs.addEventListener('click', handleTabClick);

    // Subscribe to activeTab changes in the store to update button styling
    useUiStore.subscribe((state, prevState) => {
        if (state.activeTab !== prevState.activeTab) {
            updateTabButtonStyling(state.activeTab);
        }
    });

    // Initial styling on load
    updateTabButtonStyling(useUiStore.getState().activeTab);
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

function handleTabClick(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    const targetTab = /** @type {HTMLElement} */ (target.closest('[data-tab]'));
    if (!targetTab) return;

    if (useUiStore.getState().activeTab === targetTab.dataset.tab) {
        return; // Do not re-render if the same tab is clicked
    }

    showLoader('Loading view...');

    // Defer the state change and subsequent render to the next event loop tick.
    // This gives the browser a chance to paint the loader before the main thread
    // gets blocked by the potentially heavy rendering work of the new tab.
    setTimeout(() => {
        if (keyboardNavigationListener) {
            document.removeEventListener('keydown', keyboardNavigationListener);
            keyboardNavigationListener = null;
        }
        stopLiveSegmentHighlighter();

        const activeTabName = targetTab.dataset.tab;
        uiActions.setActiveTab(activeTabName);

        // Special handling for keyboard navigation in the 'updates' tab
        if (activeTabName === 'updates') {
            // Lazily import to avoid circular dependencies or premature loading
            import('@/features/manifestUpdates/ui/index.js').then(
                ({ navigateManifestUpdates }) => {
                    keyboardNavigationListener = (event) => {
                        if (event.key === 'ArrowRight')
                            navigateManifestUpdates(1);
                        if (event.key === 'ArrowLeft')
                            navigateManifestUpdates(-1);
                    };
                    document.addEventListener(
                        'keydown',
                        keyboardNavigationListener
                    );
                }
            );
        }

        hideLoader();
    }, 0);
}