import { stopLiveSegmentHighlighter } from '@/features/segmentExplorer/ui/components/hls/index';
import { useUiStore, uiActions } from '@/state/uiStore';
import { showLoader, hideLoader } from '@/ui/components/loader';

let dom;
let keyboardNavigationListener = null;

export function initializeTabs(domContext) {
    dom = domContext;
    dom.tabs.addEventListener('click', handleTabClick);

    // Subscriptions to update styling are now handled declaratively in mainRenderer.
}

function handleTabClick(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    const targetTab = /** @type {HTMLElement} */ (target.closest('[data-tab]'));
    if (!targetTab) return;

    if (useUiStore.getState().activeTab === targetTab.dataset.tab) {
        return; // Do not re-render if the same tab is clicked
    }

    showLoader('Loading view...');

    setTimeout(() => {
        if (keyboardNavigationListener) {
            document.removeEventListener('keydown', keyboardNavigationListener);
            keyboardNavigationListener = null;
        }
        stopLiveSegmentHighlighter();

        const activeTabName = targetTab.dataset.tab;
        uiActions.setActiveTab(activeTabName);

        if (activeTabName === 'updates') {
            import('@/features/manifestUpdates/ui/index').then(
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