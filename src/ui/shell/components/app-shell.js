import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { sidebarNavTemplate, getNavGroups } from './sidebar-nav.js';
import { renderContextSwitcher } from './context-switcher.js';
import { globalControlsTemplate } from './global-controls.js';
import { mainContentControlsTemplate } from './main-content-controls.js';

import { startLiveSegmentHighlighter } from '@/features/segmentExplorer/ui/components/hls/index';

let dom;

const handleTabClick = (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const targetTab = /** @type {HTMLElement} */ (target.closest('[data-tab]'));
    if (!targetTab) return;

    e.preventDefault();
    const tabKey = targetTab.dataset.tab;
    const { activeTab } = useUiStore.getState();

    if (activeTab === tabKey) {
        uiActions.setActiveSidebar(null);
        return;
    }

    uiActions.setActiveTab(tabKey);
    uiActions.setActiveSidebar(null);
};

export function renderAppShell(domContext) {
    dom = domContext;
    const { activeStreamId } = useAnalysisStore.getState();
    const { activeTab, activeSidebar } = useUiStore.getState();
    const activeStream = useAnalysisStore
        .getState()
        .streams.find((s) => s.id === activeStreamId);

    if (dom.sidebarNav && !dom.sidebarNav.dataset.listenerAttached) {
        dom.sidebarNav.addEventListener('click', handleTabClick);
        dom.sidebarNav.dataset.listenerAttached = 'true';
    }

    if (
        dom.sidebarToggleBtn &&
        !dom.sidebarToggleBtn.dataset.listenerAttached
    ) {
        dom.sidebarToggleBtn.addEventListener('click', () =>
            uiActions.setActiveSidebar('primary')
        );
        dom.sidebarOverlay.addEventListener('click', () =>
            uiActions.setActiveSidebar(null)
        );
        dom.sidebarToggleBtn.dataset.listenerAttached = 'true';
    }

    if (dom.mobilePageTitle) {
        const navGroups = getNavGroups();
        const allNavItems = navGroups.flatMap((g) =>
            g.items.flatMap((i) => (i.type === 'submenu' ? i.items : i))
        );
        const currentTab = allNavItems.find((item) => item.key === activeTab);
        dom.mobilePageTitle.textContent = currentTab ? currentTab.label : '';
        dom.mobileHeader.classList.toggle('hidden', !activeStream);
    }

    document.body.classList.toggle(
        'primary-sidebar-open',
        activeSidebar === 'primary'
    );
    document.body.classList.toggle(
        'contextual-sidebar-open',
        activeSidebar === 'contextual'
    );

    render(sidebarNavTemplate(), dom.sidebarNav);
    render(globalControlsTemplate(), dom.sidebarFooter);
    render(renderContextSwitcher(), dom.sidebarContextSwitchers);
    render(mainContentControlsTemplate(), dom.contextHeader);

    if (
        activeStream &&
        activeStream.manifest.type === 'dynamic' &&
        activeStream.protocol === 'hls' &&
        activeTab === 'explorer'
    ) {
        startLiveSegmentHighlighter(dom.mainContent, activeStream);
    }
}
