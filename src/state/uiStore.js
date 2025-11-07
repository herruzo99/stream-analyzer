import { createStore } from 'zustand/vanilla';
import { getWorkspaces } from '@/infrastructure/persistence/streamStorage';

/**
 * @typedef {object} ModalState
 * @property {boolean} isModalOpen
 * @property {string} modalTitle
 * @property {string} modalUrl
 * @property {{ type: string; data: any; } | null} modalContent
 */

/**
 * @typedef {object} InteractiveManifestHoverItem
 * @property {'tag' | 'attribute'} type - The type of the hovered element.
 * @property {string} name - The name of the tag or attribute (e.g., 'MPD' or 'MPD@type').
 * @property {object} info - The tooltip/metadata object for the item.
 * @property {string} path - The unique path identifier for the element.
 */

/** @typedef {import('@/types').ConditionalPollingState} ConditionalPollingState */
/** @typedef {import('@/types').UiState} UiState */
/** @typedef {import('@/types').UiActions} UiActions */

const createInitialUiState = () => ({
    _viewMap: null,
    viewState: 'input',
    activeTab: 'summary',
    activeSidebar: 'contextual',
    multiPlayerActiveTab: 'event-log',
    activeSegmentUrl: null,
    modalState: {
        isModalOpen: false,
        modalTitle: '',
        modalUrl: '',
        modalContent: null,
    },
    isCmafSummaryExpanded: false,
    interactiveManifestCurrentPage: 1,
    interactiveManifestShowSubstituted: true,
    interactiveManifestHoveredItem: null,
    interactiveManifestSelectedItem: null,
    interactiveSegmentCurrentPage: 1,
    interactiveSegmentActiveTab: 'inspector',
    interactiveSegmentSelectedItem: null,
    interactiveSegmentHighlightedItem: null,
    isByteMapLoading: false,
    complianceActiveFilter: 'all',
    complianceStandardVersion: 13,
    featureAnalysisStandardVersion: 13,
    segmentExplorerActiveRepId: null,
    segmentExplorerActiveTab: 'video',
    segmentExplorerClosedGroups: new Set(),
    segmentExplorerSortOrder: 'desc',
    segmentExplorerTargetTime: null,
    segmentExplorerScrollToTarget: false,
    highlightedCompliancePathId: null,
    comparisonHideSameRows: false,
    expandedComparisonTables: new Set(),
    expandedComparisonFlags: new Set(),
    segmentComparisonActiveTab: 'tabular',
    playerControlMode: 'standard',
    streamLibraryActiveTab: 'workspaces',
    streamLibrarySearchTerm: '',
    streamInputActiveMobileTab: 'workspace',
    workspaces: [],
    loadedWorkspaceName: null,
    isRestoringSession: false,
    segmentAnalysisActiveTab: 'structure',
    conditionalPolling: {
        streamId: null,
        featureName: null,
        status: 'idle',
        targetStreamId: null,
        targetFeatureName: null,
    },
    inactivityTimeoutOverride: null,
    showAllDrmFields: false,
});

export const useUiStore = createStore((set, get) => ({
    ...createInitialUiState(),

    injectViewMap: (viewMap) => set({ _viewMap: viewMap }),
    setViewState: (view) => set({ viewState: view }),
    setActiveTab: (tabName) => {
        set((state) => {
            const newView = state._viewMap ? state._viewMap[tabName] : null;
            const newSidebarState = newView?.hasContextualSidebar
                ? 'contextual'
                : state.activeSidebar === 'contextual'
                  ? null
                  : state.activeSidebar;

            return {
                activeTab: tabName,
                activeSidebar: newSidebarState,
                interactiveManifestCurrentPage: 1,
                interactiveManifestHoveredItem: null,
                interactiveManifestSelectedItem: null,
            };
        });
    },
    setActiveSidebar: (sidebar) => set({ activeSidebar: sidebar }),
    setMultiPlayerActiveTab: (tab) => set({ multiPlayerActiveTab: tab }),
    setModalState: (newModalState) =>
        set((state) => ({
            modalState: { ...state.modalState, ...newModalState },
        })),
    toggleCmafSummary: () =>
        set((state) => ({
            isCmafSummaryExpanded: !state.isCmafSummaryExpanded,
        })),
    setInteractiveManifestPage: (page) =>
        set({ interactiveManifestCurrentPage: page }),
    toggleInteractiveManifestSubstitution: () =>
        set((state) => ({
            interactiveManifestShowSubstituted:
                !state.interactiveManifestShowSubstituted,
        })),
    setInteractiveManifestHoveredItem: (item) =>
        set({ interactiveManifestHoveredItem: item }),
    setInteractiveManifestSelectedItem: (item) =>
        set({ interactiveManifestSelectedItem: item }),
    setInteractiveSegmentPage: (page) =>
        set({ interactiveSegmentCurrentPage: page }),
    setInteractiveSegmentActiveTab: (tab) =>
        set({ interactiveSegmentActiveTab: tab }),
    setInteractiveSegmentSelectedItem: (item) =>
        set({ interactiveSegmentSelectedItem: item ? { item } : null }),
    setInteractiveSegmentHighlightedItem: (item, field) =>
        set({
            interactiveSegmentHighlightedItem: item ? { item, field } : null,
        }),
    setIsByteMapLoading: (isLoading) => set({ isByteMapLoading: isLoading }),
    setComplianceFilter: (filter) => set({ complianceActiveFilter: filter }),
    setComplianceStandardVersion: (version) =>
        set({ complianceStandardVersion: version }),
    setFeatureAnalysisStandardVersion: (version) =>
        set({ featureAnalysisStandardVersion: version }),
    setSegmentExplorerActiveRepId: (repId) => {
        if (get().segmentExplorerActiveRepId === repId) return;
        set({ segmentExplorerActiveRepId: repId });
    },
    setSegmentExplorerActiveTab: (tab) =>
        set({
            segmentExplorerActiveTab: tab,
            segmentExplorerActiveRepId: null,
        }),
    toggleSegmentExplorerGroup: (groupId) =>
        set((state) => {
            const newSet = new Set(state.segmentExplorerClosedGroups);
            if (newSet.has(groupId)) newSet.delete(groupId);
            else newSet.add(groupId);
            return { segmentExplorerClosedGroups: newSet };
        }),
    toggleSegmentExplorerSortOrder: () =>
        set((state) => ({
            segmentExplorerSortOrder:
                state.segmentExplorerSortOrder === 'asc' ? 'desc' : 'asc',
        })),
    setSegmentExplorerTargetTime: (target) =>
        set({
            segmentExplorerTargetTime: target,
            segmentExplorerScrollToTarget: true,
        }),
    clearSegmentExplorerTargetTime: () =>
        set({
            segmentExplorerTargetTime: null,
            segmentExplorerScrollToTarget: false,
        }),
    clearSegmentExplorerScrollTrigger: () =>
        set({ segmentExplorerScrollToTarget: false }),
    setHighlightedCompliancePathId: (pathId) =>
        set({ highlightedCompliancePathId: pathId }),
    toggleComparisonTable: (tableId) => {
        set((state) => {
            const newSet = new Set(state.expandedComparisonTables);
            if (newSet.has(tableId)) newSet.delete(tableId);
            else newSet.add(tableId);
            return { expandedComparisonTables: newSet };
        });
    },
    toggleComparisonFlags: (rowName) => {
        set((state) => {
            const newSet = new Set(state.expandedComparisonFlags);
            if (newSet.has(rowName)) newSet.delete(rowName);
            else newSet.add(rowName);
            return { expandedComparisonFlags: newSet };
        });
    },
    toggleComparisonHideSameRows: () =>
        set((state) => ({
            comparisonHideSameRows: !state.comparisonHideSameRows,
        })),
    setSegmentComparisonActiveTab: (tab) =>
        set({ segmentComparisonActiveTab: tab }),
    setPlayerControlMode: (mode) => set({ playerControlMode: mode }),
    navigateToInteractiveSegment: (segmentUniqueId) =>
        set({
            activeSegmentUrl: segmentUniqueId,
            activeTab: 'interactive-segment',
            interactiveSegmentCurrentPage: 1,
            isByteMapLoading: false,
            interactiveSegmentSelectedItem: null,
            interactiveSegmentHighlightedItem: null,
        }),
    setStreamLibraryTab: (tab) => set({ streamLibraryActiveTab: tab }),
    setStreamLibrarySearchTerm: (term) =>
        set({ streamLibrarySearchTerm: term }),
    setStreamInputActiveMobileTab: (tab) =>
        set({ streamInputActiveMobileTab: tab }),
    loadWorkspaces: () => set({ workspaces: getWorkspaces() }),
    setWorkspaces: (workspaces) => set({ workspaces }),
    setLoadedWorkspaceName: (name) => set({ loadedWorkspaceName: name }),
    setIsRestoringSession: (isRestoring) =>
        set({ isRestoringSession: isRestoring }),
    setSegmentAnalysisActiveTab: (tab) =>
        set({ segmentAnalysisActiveTab: tab }),
    startConditionalPolling: (streamId, featureName) =>
        set({
            conditionalPolling: {
                streamId,
                featureName,
                status: 'active',
                targetStreamId: streamId,
                targetFeatureName: featureName,
            },
        }),
    clearConditionalPolling: () =>
        set((state) => ({
            conditionalPolling: {
                ...createInitialUiState().conditionalPolling,
                // Preserve the user's last selection for convenience
                targetStreamId: state.conditionalPolling.targetStreamId,
                targetFeatureName: state.conditionalPolling.targetFeatureName,
            },
        })),
    setConditionalPollingStatus: (status) =>
        set((state) => ({
            conditionalPolling: { ...state.conditionalPolling, status },
        })),
    setConditionalPollingTarget: (target) => {
        set((state) => {
            const currentTarget = state.conditionalPolling;
            const newTarget = { ...currentTarget, ...target };
            // --- FIX: Do NOT reset feature name when stream changes ---
            // The UI component is responsible for filtering the feature list,
            // so we can safely preserve the user's feature selection here.
            return { conditionalPolling: newTarget };
        });
    },
    setInactivityTimeoutOverride: (durationMs) =>
        set({ inactivityTimeoutOverride: durationMs }),
    toggleShowAllDrmFields: () =>
        set((state) => ({ showAllDrmFields: !state.showAllDrmFields })),
    reset: () => set(createInitialUiState()),
}));

export const uiActions = useUiStore.getState();
