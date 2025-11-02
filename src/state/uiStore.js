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

/**
 * @typedef {object} UiState
 * @property {object | null} _viewMap - Internal reference to the application's view map.
 * @property {'input' | 'results'} viewState
 * @property {string} activeTab
 * @property {'primary' | 'contextual' | null} activeSidebar
 * @property {'event-log' | 'graphs' | 'controls'} multiPlayerActiveTab
 * @property {string | null} activeSegmentUrl
 * @property {ModalState} modalState
 * @property {boolean} isCmafSummaryExpanded
 * @property {number} interactiveManifestCurrentPage
 * @property {boolean} interactiveManifestShowSubstituted
 * @property {InteractiveManifestHoverItem | null} interactiveManifestHoveredItem
 * @property {InteractiveManifestHoverItem | null} interactiveManifestSelectedItem
 * @property {number} interactiveSegmentCurrentPage
 * @property {'inspector' | 'hex'} interactiveSegmentActiveTab
 * @property {{ item: any } | null} interactiveSegmentSelectedItem
 * @property {{ item: any; field: string } | null} interactiveSegmentHighlightedItem
 * @property {boolean} isByteMapLoading
 * @property {'all' | 'fail' | 'warn'} complianceActiveFilter
 * @property {number} complianceStandardVersion
 * @property {number} featureAnalysisStandardVersion
 * @property {string | null} segmentExplorerActiveRepId
 * @property {string} segmentExplorerActiveTab
 * @property {Set<string>} segmentExplorerClosedGroups
 * @property {'asc' | 'desc'} segmentExplorerSortOrder
 * @property {Date | null} segmentExplorerTargetTime
 * @property {boolean} segmentExplorerScrollToTarget
 * @property {string | null} highlightedCompliancePathId
 * @property {boolean} comparisonHideSameRows
 * @property {Set<string>} expandedComparisonTables
 * @property {Set<string>} expandedComparisonFlags
 * @property {'tabular' | 'structural'} segmentComparisonActiveTab
 * @property {'standard' | 'advanced'} playerControlMode
 * @property {'workspaces' | 'presets' | 'history' | 'examples'} streamLibraryActiveTab
 * @property {string} streamLibrarySearchTerm
 * @property {'library' | 'workspace' | 'inspector'} streamInputActiveMobileTab
 * @property {any[]} workspaces
 * @property {string | null} loadedWorkspaceName
 * @property {boolean} isRestoringSession
 */

/**
 * @typedef {object} UiActions
 * @property {(viewMap: object) => void} injectViewMap
 * @property {(view: 'input' | 'results') => void} setViewState
 * @property {(tabName: string) => void} setActiveTab
 * @property {(sidebar: 'primary' | 'contextual' | null) => void} setActiveSidebar
 * @property {(tab: 'event-log' | 'graphs' | 'controls') => void} setMultiPlayerActiveTab
 * @property {(modalState: Partial<ModalState>) => void} setModalState
 * @property {() => void} toggleCmafSummary
 * @property {(page: number) => void} setInteractiveManifestPage
 * @property {() => void} toggleInteractiveManifestSubstitution
 * @property {(item: InteractiveManifestHoverItem | null) => void} setInteractiveManifestHoveredItem
 * @property {(item: InteractiveManifestHoverItem | null) => void} setInteractiveManifestSelectedItem
 * @property {(page: number) => void} setInteractiveSegmentPage
 * @property {(tab: 'inspector' | 'hex') => void} setInteractiveSegmentActiveTab
 * @property {(item: any) => void} setInteractiveSegmentSelectedItem
 * @property {(item: any, field: string) => void} setInteractiveSegmentHighlightedItem
 * @property {(isLoading: boolean) => void} setIsByteMapLoading
 * @property {(filter: 'all' | 'fail' | 'warn') => void} setComplianceFilter
 * @property {(version: number) => void} setComplianceStandardVersion
 * @property {(version: number) => void} setFeatureAnalysisStandardVersion
 * @property {(repId: string | null) => void} setSegmentExplorerActiveRepId
 * @property {(tab: string) => void} setSegmentExplorerActiveTab
 * @property {(groupId: string) => void} toggleSegmentExplorerGroup
 * @property {() => void} toggleSegmentExplorerSortOrder
 * @property {(target: Date | null) => void} setSegmentExplorerTargetTime
 * @property {() => void} clearSegmentExplorerTargetTime
 * @property {() => void} clearSegmentExplorerScrollTrigger
 * @property {(pathId: string | null) => void} setHighlightedCompliancePathId
 * @property {(tableId: string) => void} toggleComparisonTable
 * @property {(rowName: string) => void} toggleComparisonFlags
 * @property {() => void} toggleComparisonHideSameRows
 * @property {(tab: 'tabular' | 'structural') => void} setSegmentComparisonActiveTab
 * @property {(mode: 'standard' | 'advanced') => void} setPlayerControlMode
 * @property {(segmentUniqueId: string) => void} navigateToInteractiveSegment
 * @property {(tab: 'workspaces' | 'presets' | 'history' | 'examples') => void} setStreamLibraryTab
 * @property {(term: string) => void} setStreamLibrarySearchTerm
 * @property {(tab: 'library' | 'workspace' | 'inspector') => void} setStreamInputActiveMobileTab
 * @property {() => void} loadWorkspaces
 * @property {(workspaces: any[]) => void} setWorkspaces
 * @property {(name: string | null) => void} setLoadedWorkspaceName
 * @property {(isRestoring: boolean) => void} setIsRestoringSession
 * @property {() => void} reset
 */

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
        set({ segmentExplorerActiveTab: tab }),
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
    reset: () => set(createInitialUiState()),
}));

export const uiActions = useUiStore.getState();