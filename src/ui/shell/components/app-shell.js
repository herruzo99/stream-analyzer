import { html, render } from 'lit-html';
import { until } from 'lit-html/directives/until.js';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { sidebarNavTemplate } from './sidebar-nav.js';
import { renderContextSwitcher } from './context-switcher.js';
import { globalControlsTemplate } from './global-controls.js';
import { mainContentControlsTemplate } from './main-content-controls.js';
import { getComparisonTemplate } from '@/features/comparison/ui/index';
import { getGlobalSummaryTemplate } from '@/features/summary/ui/index';
import { getIntegratorsReportTemplate } from '@/features/integratorsReport/ui/index';
import { getTimelineAndVisualsTemplate } from '@/features/timelineVisuals/ui/index';
import { getFeaturesAnalysisTemplate } from '@/features/featureAnalysis/ui/index';
import { getComplianceReportTemplate } from '@/features/compliance/ui/index';
import { getSegmentExplorerTemplate } from '@/features/segmentExplorer/ui/index';
import { getInteractiveSegmentTemplate } from '@/features/interactiveSegment/ui/index';
import { getInteractiveManifestTemplate } from '@/features/interactiveManifest/ui/index';
import { manifestUpdatesTemplate } from '@/features/manifestUpdates/ui/index';
import { getParserCoverageTemplate } from '@/features/parserCoverage/ui/index';
import { stopLiveSegmentHighlighter, startLiveSegmentHighlighter } from '@/features/segmentExplorer/ui/components/hls/index';
import { isDebugMode } from '@/application/utils/env';
import { cleanupSegmentViewInteractivity } from '@/features/interactiveSegment/ui/components/interaction-logic';

let dom;
let keyboardNavigationListener = null;

const NAV_ITEMS = [
    { key: 'summary', label: 'Summary' },
    { key: 'comparison', label: 'Comparison' },
    { key: 'integrators-report', label: "Integrator's Report" },
    { key: 'timeline-visuals', label: 'Timeline' },
    { key: 'features', label: 'Features' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'explorer', label: 'Explorer' },
    { key: 'interactive-segment', label: 'Segment Inspector' },
    { key: 'interactive-manifest', label: 'Manifest' },
    { key: 'updates', label: 'Updates' },
    { key: 'parser-coverage', label: 'Coverage', debug: true },
];

const renderMainContent = (activeStream, activeTab) => {
    let mainContentTemplate = null;
    let contextualContentTemplate = null;

    if (!activeStream) {
        mainContentTemplate = html`<p class="text-gray-500">No active stream selected.</p>`;
        return { mainContentTemplate, contextualContentTemplate };
    }

    const { streams } = useAnalysisStore.getState();
    if (activeTab === 'comparison' && streams.length > 1) {
        mainContentTemplate = getComparisonTemplate(streams);
    } else {
        switch (activeTab) {
            case 'summary':
                mainContentTemplate = getGlobalSummaryTemplate(activeStream);
                break;
            case 'integrators-report':
                mainContentTemplate = getIntegratorsReportTemplate(activeStream);
                break;
            case 'features':
                mainContentTemplate = getFeaturesAnalysisTemplate(activeStream);
                break;
            case 'compliance': {
                const { main, contextual } = getComplianceReportTemplate(activeStream);
                mainContentTemplate = main;
                contextualContentTemplate = contextual;
                break;
            }
            case 'interactive-manifest':
                mainContentTemplate = getInteractiveManifestTemplate(activeStream);
                break;
            case 'updates':
                mainContentTemplate = manifestUpdatesTemplate(activeStream);
                break;
            case 'parser-coverage':
                mainContentTemplate = getParserCoverageTemplate(activeStream);
                break;
            case 'explorer':
                mainContentTemplate = getSegmentExplorerTemplate(activeStream);
                break;
            case 'interactive-segment':
                mainContentTemplate = getInteractiveSegmentTemplate(dom);
                break;
            case 'timeline-visuals': {
                const loadingTemplate = html`<div class="text-center py-8 text-gray-400">Loading timeline data...</div>`;
                mainContentTemplate = until(getTimelineAndVisualsTemplate(activeStream), loadingTemplate);
                break;
            }
            default:
                 mainContentTemplate = html`<p class="text-gray-500">Select a view from the sidebar.</p>`;
        }
    }

    return { mainContentTemplate, contextualContentTemplate };
};

const handleTabClick = (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const targetTab = /** @type {HTMLElement} */ (target.closest('[data-tab]'));
    if (!targetTab) return;
    
    e.preventDefault();
    const tabKey = targetTab.dataset.tab;
    const { activeTab } = useUiStore.getState();
    const previousTab = activeTab;
    
    if (activeTab === tabKey) {
        uiActions.setActiveSidebar(null);
        return;
    }

    stopLiveSegmentHighlighter();
    if (keyboardNavigationListener) {
        document.removeEventListener('keydown', keyboardNavigationListener);
        keyboardNavigationListener = null;
    }

    if (previousTab === 'interactive-segment') {
        cleanupSegmentViewInteractivity(dom);
    }

    uiActions.setActiveTab(tabKey);
    uiActions.setActiveSidebar(null);

    if (tabKey === 'updates') {
        import('@/features/manifestUpdates/ui/index').then(
            ({ navigateManifestUpdates }) => {
                keyboardNavigationListener = (event) => {
                    if (event.key === 'ArrowRight') navigateManifestUpdates(1);
                    if (event.key === 'ArrowLeft') navigateManifestUpdates(-1);
                };
                document.addEventListener('keydown', keyboardNavigationListener);
            }
        );
    }
}

export function renderAppShell(domContext) {
    dom = domContext;
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const { activeTab, activeSidebar } = useUiStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);

    if (dom.sidebarNav && !dom.sidebarNav.dataset.listenerAttached) {
        dom.sidebarNav.addEventListener('click', handleTabClick);
        dom.sidebarNav.dataset.listenerAttached = 'true';
    }

    if (dom.sidebarToggleBtn && !dom.sidebarToggleBtn.dataset.listenerAttached) {
        dom.sidebarToggleBtn.addEventListener('click', () => uiActions.setActiveSidebar('primary'));
        dom.sidebarOverlay.addEventListener('click', () => uiActions.setActiveSidebar(null));
        dom.sidebarToggleBtn.dataset.listenerAttached = 'true';
    }

    if(dom.mobilePageTitle) {
        const currentTab = NAV_ITEMS.find(item => item.key === activeTab);
        dom.mobilePageTitle.textContent = currentTab ? currentTab.label : '';
        dom.mobileHeader.classList.toggle('hidden', !activeStream);
    }

    document.body.classList.toggle('primary-sidebar-open', activeSidebar === 'primary');
    document.body.classList.toggle('contextual-sidebar-open', activeSidebar === 'contextual');

    render(sidebarNavTemplate(), dom.sidebarNav);
    render(globalControlsTemplate(), dom.sidebarFooter);
    render(renderContextSwitcher(), dom.sidebarContextSwitchers);
    render(mainContentControlsTemplate(), dom.contextHeader);
    
    const { mainContentTemplate, contextualContentTemplate } = renderMainContent(activeStream, activeTab);
    
    if (mainContentTemplate) {
        render(mainContentTemplate, dom.mainContent);
    }
    
    render(contextualContentTemplate || html``, dom.contextualSidebar);
    dom.contextualSidebar.classList.toggle('hidden', !contextualContentTemplate);


    if (activeStream && activeStream.manifest.type === 'dynamic' && activeStream.protocol === 'hls' && activeTab === 'explorer') {
        startLiveSegmentHighlighter(dom.mainContent, activeStream);
    }
}