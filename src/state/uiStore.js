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
 * @property {number} interactiveSegmentCurrentPage
 */

/**
 * @typedef {object} UiActions
 * @property {(view: 'input' | 'results') => void} setViewState
 * @property {(tabName: string) => void} setActiveTab
 * @property {(modalState: Partial<ModalState>) => void} setModalState
 * @property {() => void} toggleCmafSummary
 * @property {(page: number) => void} setInteractiveManifestPage
 * @property {(page: number) => void} setInteractiveSegmentPage
 * @property {() => void} reset
 */

/**
 * Creates the initial state for the UI store.
 * @returns {UiState}
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
    interactiveSegmentCurrentPage: 1,
});

/**
 * A dedicated store for managing UI state.
 * @type {import('zustand/vanilla').StoreApi<UiState & UiActions>}
 */
export const useUiStore = createStore((set) => ({
    ...createInitialUiState(),

    // --- Actions ---
    setViewState: (view) => set({ viewState: view }),
    setActiveTab: (tabName) => set({ activeTab: tabName }),
    setModalState: (newModalState) => {
        set((state) => ({
            modalState: { ...state.modalState, ...newModalState },
        }));
    },
    toggleCmafSummary: () => {
        set((state) => ({
            isCmafSummaryExpanded: !state.isCmafSummaryExpanded,
        }));
    },
    setInteractiveManifestPage: (page) =>
        set({ interactiveManifestCurrentPage: page }),
    setInteractiveSegmentPage: (page) =>
        set({ interactiveSegmentCurrentPage: page }),
    reset: () => set(createInitialUiState()),
}));

export const uiActions = {
    setViewState: (view) => useUiStore.getState().setViewState(view),
    setActiveTab: (tabName) => useUiStore.getState().setActiveTab(tabName),
    setModalState: (state) => useUiStore.getState().setModalState(state),
    toggleCmafSummary: () => useUiStore.getState().toggleCmafSummary(),
    setInteractiveManifestPage: (page) =>
        useUiStore.getState().setInteractiveManifestPage(page),
    setInteractiveSegmentPage: (page) =>
        useUiStore.getState().setInteractiveSegmentPage(page),
    reset: () => useUiStore.getState().reset(),
};
