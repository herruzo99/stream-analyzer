import { createStore } from 'zustand/vanilla';

/**
 * @typedef {object} ModalState
 * @property {boolean} isModalOpen
 * @property {string} modalTitle
 * @property {string} modalUrl
 * @property {{ type: string; data: any; } | null} modalContent
 */

/**
 * @typedef {object} UiState
 * @property {'input' | 'results'} viewState
 * @property {string} activeTab
 * @property {'event-log' | 'graphs' | 'controls'} multiPlayerActiveTab
 * @property {string | null} activeSegmentUrl
 * @property {'primary' | 'contextual' | null} activeSidebar
 * @property {ModalState} modalState
 * @property {boolean} isCmafSummaryExpanded
 * @property {number} interactiveManifestCurrentPage
 * @property {boolean} interactiveManifestShowSubstituted
 * @property {number} interactiveSegmentCurrentPage
 * @property {'inspector' | 'hex'} interactiveSegmentActiveTab
 * @property {{ item: any } | null} interactiveSegmentSelectedItem
 * @property {{ item: any; field: string } | null} interactiveSegmentHighlightedItem
 * @property {Map<number, object> | null} fullByteMap
 * @property {boolean} isByteMapLoading
 * @property {'all' | 'fail' | 'warn'} complianceActiveFilter
 * @property {number} complianceStandardVersion
 * @property {number} featureAnalysisStandardVersion
 * @property {'first' | 'last'} segmentExplorerDashMode
 * @property {string} segmentExplorerActiveTab
 * @property {'asc' | 'desc'} segmentExplorerSortOrder
 * @property {Date | null} segmentExplorerTargetTime
 * @property {boolean} segmentExplorerScrollToTarget
 * @property {string | null} highlightedCompliancePathId
 * @property {boolean} segmentComparisonHideSame
 * @property {Set<string>} expandedComparisonTables
 * @property {Set<string>} expandedComparisonFlags
 * @property {'standard' | 'advanced'} playerControlMode
 * @property {'presets' | 'history' | 'examples'} streamLibraryActiveTab
 * @property {string} streamLibrarySearchTerm
 */

/**
 * @typedef {object} UiActions
 * @property {(view: 'input' | 'results') => void} setViewState
 * @property {(tabName: string) => void} setActiveTab
 * @property {(tab: 'event-log' | 'graphs' | 'controls') => void} setMultiPlayerActiveTab
 * @property {(sidebar: 'primary' | 'contextual' | null) => void} setActiveSidebar
 * @property {(modalState: Partial<ModalState>) => void} setModalState
 * @property {() => void} toggleCmafSummary
 * @property {(page: number) => void} setInteractiveManifestPage
 * @property {() => void} toggleInteractiveManifestSubstitution
 * @property {(page: number) => void} setInteractiveSegmentPage
 * @property {(tab: 'inspector' | 'hex') => void} setInteractiveSegmentActiveTab
 * @property {(item: any) => void} setInteractiveSegmentSelectedItem
 * @property {(item: any, field: string) => void} setInteractiveSegmentHighlightedItem
 * @property {(mapArray: [number, object][] | null) => void} setFullByteMap
 * @property {(isLoading: boolean) => void} setIsByteMapLoading
 * @property {(filter: 'all' | 'fail' | 'warn') => void} setComplianceFilter
 * @property {(version: number) => void} setComplianceStandardVersion
 * @property {(version: number) => void} setFeatureAnalysisStandardVersion
 * @property {(mode: 'first' | 'last') => void} setSegmentExplorerDashMode
 * @property {(tab: string) => void} setSegmentExplorerActiveTab
 * @property {() => void} toggleSegmentExplorerSortOrder
 * @property {(target: Date | null) => void} setSegmentExplorerTargetTime
 * @property {() => void} clearSegmentExplorerTargetTime
 * @property {() => void} clearSegmentExplorerScrollTrigger
 * @property {(pathId: string | null) => void} setHighlightedCompliancePathId
 * @property {() => void} toggleSegmentComparisonHideSame
 * @property {(tableId: string) => void} toggleComparisonTable
 * @property {(rowName: string) => void} toggleComparisonFlags
 * @property {(mode: 'standard' | 'advanced') => void} setPlayerControlMode
 * @property {(segmentUniqueId: string) => void} navigateToInteractiveSegment
 * @property {(tab: 'presets' | 'history' | 'examples') => void} setStreamLibraryTab
 * @property {(term: string) => void} setStreamLibrarySearchTerm
 * @property {() => void} reset
 */

const createInitialUiState = () => ({
    viewState: 'input',
    activeTab: 'summary',
    multiPlayerActiveTab: 'event-log',
    activeSegmentUrl: null,
    activeSidebar: null,
    modalState: {
        isModalOpen: false,
        modalTitle: '',
        modalUrl: '',
        modalContent: null,
    },
    isCmafSummaryExpanded: false,
    interactiveManifestCurrentPage: 1,
    interactiveManifestShowSubstituted: true,
    interactiveSegmentCurrentPage: 1,
    interactiveSegmentActiveTab: 'inspector',
    interactiveSegmentSelectedItem: null,
    interactiveSegmentHighlightedItem: null,
    fullByteMap: null,
    isByteMapLoading: false,
    complianceActiveFilter: 'all',
    complianceStandardVersion: 13,
    featureAnalysisStandardVersion: 13,
    segmentExplorerDashMode: 'first',
    segmentExplorerActiveTab: 'video',
    segmentExplorerSortOrder: 'desc',
    segmentExplorerTargetTime: null,
    segmentExplorerScrollToTarget: false,
    highlightedCompliancePathId: null,
    segmentComparisonHideSame: false,
    expandedComparisonTables: new Set(),
    expandedComparisonFlags: new Set(),
    playerControlMode: 'standard',
    streamLibraryActiveTab: 'presets',
    streamLibrarySearchTerm: '',
});

export const useUiStore = createStore((set) => ({
    ...createInitialUiState(),

    setViewState: (view) => set({ viewState: view }),
    setActiveTab: (tabName) => set({ activeTab: tabName }),
    setMultiPlayerActiveTab: (tab) => set({ multiPlayerActiveTab: tab }),
    setActiveSidebar: (sidebar) => set({ activeSidebar: sidebar }),
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
    setFullByteMap: (mapArray) =>
        set({ fullByteMap: mapArray ? new Map(mapArray) : null }),
    setIsByteMapLoading: (isLoading) => set({ isByteMapLoading: isLoading }),
    setComplianceFilter: (filter) => set({ complianceActiveFilter: filter }),
    setComplianceStandardVersion: (version) =>
        set({ complianceStandardVersion: version }),
    setFeatureAnalysisStandardVersion: (version) =>
        set({ featureAnalysisStandardVersion: version }),
    setSegmentExplorerDashMode: (mode) =>
        set({ segmentExplorerDashMode: mode }),
    setSegmentExplorerActiveTab: (tab) =>
        set({ segmentExplorerActiveTab: tab }),
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
    toggleSegmentComparisonHideSame: () =>
        set((state) => ({
            segmentComparisonHideSame: !state.segmentComparisonHideSame,
        })),
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
    setPlayerControlMode: (mode) => set({ playerControlMode: mode }),
    navigateToInteractiveSegment: (segmentUniqueId) =>
        set({
            activeSegmentUrl: segmentUniqueId,
            activeTab: 'interactive-segment',
            interactiveSegmentCurrentPage: 1,
            fullByteMap: null,
            isByteMapLoading: false,
            interactiveSegmentSelectedItem: null,
            interactiveSegmentHighlightedItem: null,
        }),
    setStreamLibraryTab: (tab) => set({ streamLibraryActiveTab: tab }),
    setStreamLibrarySearchTerm: (term) =>
        set({ streamLibrarySearchTerm: term }),
    reset: () => set(createInitialUiState()),
}));

export const uiActions = useUiStore.getState();
