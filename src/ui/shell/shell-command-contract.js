import { eventBus } from '@/application/event-bus';
import { resetApplicationState } from '@/application/use_cases/resetApplicationState';
import { playerService } from '@/features/playerSimulation/application/playerService';
import { EVENTS } from '@/types/events';
import { uiActions } from '@/state/uiStore';
import { isShellRouteAvailable } from './navigation-contract.js';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { openModalWithContent } from '@/ui/services/modalService';
import { copyShareUrlToClipboard } from '@/ui/services/shareService';
import { toggleAllPolling } from '@/ui/services/streamActionsService';

function newSession() {
    // No native confirm(): callers that need confirmation use the
    // two-tap footer button. Programmatic callers reset directly.
    resetApplicationState();
    uiActions.setActiveTab('summary');
    return true;
}

function selectSegmentFiles(event) {
    const files = Array.from(event?.target?.files || []);
    if (files.length > 0) {
        eventBus.dispatch(EVENTS.UI.SEGMENT_ANALYSIS_REQUESTED, { files });
    }
    if (event?.target) event.target.value = '';
}

function navigateToRoute(routeId) {
    if (!isShellRouteAvailable(routeId)) return false;
    uiActions.setActiveTab(routeId);
    return true;
}

export const shellCommands = Object.freeze({
    newSession,
    navigateToRoute,
    selectSegmentFiles,
    openSearch: () => eventBus.dispatch('ui:search:open'),
    togglePolling: () => toggleAllPolling(),
    share: () => copyShareUrlToClipboard(),
    openDropdown: (anchor, template, event) =>
        toggleDropdown(anchor, template, event),
    closeDropdown: () => closeDropdown(),
    destroyPlayer: () => playerService.destroy(),
    showDashTiming: (streamId) =>
        eventBus.dispatch(EVENTS.UI.SHOW_DASH_TIMING_CALCULATOR, {
            streamId,
        }),
    openChaosTools: () =>
        openModalWithContent({
            title: 'Chaos Tools',
            url: 'Network Interventions',
            content: { type: 'networkIntervention', data: {} },
            isFullWidth: false,
        }),
    openSegmentInspector: () =>
        document.getElementById('global-segment-upload')?.click(),
    openDrmInspector: () => eventBus.dispatch('ui:drm-inspector:open'),
    openManifestPatcher: () =>
        eventBus.dispatch(EVENTS.UI.SHOW_MANIFEST_PATCHER),
});
