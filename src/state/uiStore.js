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
 * @property {ModalState} modalState
 * @property {boolean} isCmafSummaryExpanded
 * @property {number} interactiveManifestCurrentPage
 * @property {boolean} interactiveManifestShowSubstituted
 * @property {number} interactiveSegmentCurrentPage
 * @property {'all' | 'fail' | 'warn'} complianceActiveFilter
 * @property {number} complianceStandardVersion
 * @property {number} featureAnalysisStandardVersion
 * @property {'first' | 'last'} segmentExplorerDashMode
 * @property {string | null} highlightedCompliancePathId
 */

/**
 * @typedef {object} UiActions
 * @property {(view: 'input' | 'results') => void} setViewState
 * @property {(tabName: string) => void} setActiveTab
 * @property {(modalState: Partial<ModalState>) => void} setModalState
 * @property {() => void} toggleCmafSummary
 * @property {(page: number) => void} setInteractiveManifestPage
 * @property {() => void} toggleInteractiveManifestSubstitution
 * @property {(page: number) => void} setInteractiveSegmentPage
 * @property {(filter: 'all' | 'fail' | 'warn') => void} setComplianceFilter
 * @property {(version: number) => void} setComplianceStandardVersion
 * @property {(version: number) => void} setFeatureAnalysisStandardVersion
 * @property {(mode: 'first' | 'last') => void} setSegmentExplorerDashMode
 * @property {(pathId: string | null) => void} setHighlightedCompliancePathId
 * @property {() => void} reset
 */

const createInitialUiState = () => ({
    viewState: 'input',
    activeTab: 'summary',
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
    complianceActiveFilter: 'all',
    complianceStandardVersion: 13,
    featureAnalysisStandardVersion: 13,
    segmentExplorerDashMode: 'first',
    highlightedCompliancePathId: null,
});

export const useUiStore = createStore((set) => ({
    ...createInitialUiState(),

    setViewState: (view) => set({ viewState: view }),
    setActiveTab: (tabName) => set({ activeTab: tabName }),
    setModalState: (newModalState) => {
        set((state) => ({
            modalState: { ...state.modalState, ...newModalState },
        }));
    },
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
    setComplianceFilter: (filter) => set({ complianceActiveFilter: filter }),
    setComplianceStandardVersion: (version) =>
        set({ complianceStandardVersion: version }),
    setFeatureAnalysisStandardVersion: (version) =>
        set({ featureAnalysisStandardVersion: version }),
    setSegmentExplorerDashMode: (mode) =>
        set({ segmentExplorerDashMode: mode }),
    setHighlightedCompliancePathId: (pathId) =>
        set({ highlightedCompliancePathId: pathId }),
    reset: () => set(createInitialUiState()),
}));

export const uiActions = {
    setViewState: (view) => useUiStore.getState().setViewState(view),
    setActiveTab: (tabName) => useUiStore.getState().setActiveTab(tabName),
    setModalState: (state) => useUiStore.getState().setModalState(state),
    toggleCmafSummary: () => useUiStore.getState().toggleCmafSummary(),
    setInteractiveManifestPage: (page) =>
        useUiStore.getState().setInteractiveManifestPage(page),
    toggleInteractiveManifestSubstitution: () =>
        useUiStore.getState().toggleInteractiveManifestSubstitution(),
    setInteractiveSegmentPage: (page) =>
        useUiStore.getState().setInteractiveSegmentPage(page),
    setComplianceFilter: (filter) =>
        useUiStore.getState().setComplianceFilter(filter),
    setComplianceStandardVersion: (version) =>
        useUiStore.getState().setComplianceStandardVersion(version),
    setFeatureAnalysisStandardVersion: (version) =>
        useUiStore.getState().setFeatureAnalysisStandardVersion(version),
    setSegmentExplorerDashMode: (mode) =>
        useUiStore.getState().setSegmentExplorerDashMode(mode),
    setHighlightedCompliancePathId: (pathId) =>
        useUiStore.getState().setHighlightedCompliancePathId(pathId),
    reset: () => useUiStore.getState().reset(),
};
