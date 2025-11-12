import { createStore } from 'zustand/vanilla';
import {
    getWorkspaces,
    getPresets,
    getHistory,
    deletePreset,
    deleteHistoryItem,
    deleteWorkspace,
} from '@/infrastructure/persistence/streamStorage';
import { useAnalysisStore } from './analysisStore.js';
import { eventBus } from '@/application/event-bus.js';

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

/** @typedef {import('@/types.ts').ConditionalPollingState} ConditionalPollingState */
/** @typedef {import('@/types.ts').UiState} UiState */
/** @typedef {import('@/types.ts').UiActions} UiActions */

const createInitialUiState = () => ({
    _viewMap: null,
    viewState: 'input',
    activeTab: 'summary',
    activeSidebar: 'contextual',
    multiPlayerActiveTab: 'event-log',
    multiPlayerViewMode: 'grid',
    activeSegmentUrl: null,
    activeSegmentHighlightRange: null,
    activeSegmentIsIFrame: false,
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
    presets: [],
    history: [],
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
    segmentPollingSelectorState: {
        expandedStreamIds: new Set(),
        tabState: new Map(), // Maps streamId to active tab key ('video' or 'audio')
    },
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

            const newState = {
                activeTab: tabName,
                activeSidebar: newSidebarState,
                interactiveManifestCurrentPage: 1,
                interactiveManifestHoveredItem: null,
                interactiveManifestSelectedItem: null,
                activeSegmentHighlightRange: null, // Clear highlight on tab change
            };

            if (tabName === 'explorer') {
                const { streams, activeStreamId } =
                    useAnalysisStore.getState();
                const activeStream = streams.find(
                    (s) => s.id === activeStreamId
                );
                const { segmentExplorerActiveRepId, segmentExplorerActiveTab } =
                    get();

                if (activeStream && !segmentExplorerActiveRepId) {
                    let defaultRepId = null;
                    if (activeStream.protocol === 'dash') {
                        const firstPeriod = activeStream.manifest.periods[0];
                        const firstAs =
                            firstPeriod?.adaptationSets.find(
                                (as) =>
                                    as.contentType === segmentExplorerActiveTab
                            ) || firstPeriod?.adaptationSets[0];
                        const firstRep = firstAs?.representations[0];

                        if (firstPeriod && firstRep) {
                            defaultRepId = `${
                                firstPeriod.id || 0
                            }-${firstRep.id}`;
                        }
                    } else if (
                        activeStream.protocol === 'hls' &&
                        activeStream.manifest?.isMaster
                    ) {
                        const asContentType =
                            segmentExplorerActiveTab === 'text'
                                ? 'subtitles'
                                : segmentExplorerActiveTab;

                        const allAdaptationSetsForType =
                            activeStream.manifest.periods[0].adaptationSets.filter(
                                (as) => as.contentType === asContentType
                            );

                        const primaryAdaptationSets =
                            allAdaptationSetsForType.filter((as) =>
                                (as.roles || []).every(
                                    (r) => r.value !== 'trick'
                                )
                            );

                        const firstAs =
                            primaryAdaptationSets[0] ||
                            allAdaptationSetsForType[0];
                        const firstRendition = firstAs?.representations[0];

                        defaultRepId =
                            firstRendition?.__variantUri ||
                            firstRendition?.serializedManifest.resolvedUri;
                    } else if (
                        activeStream.protocol === 'hls' &&
                        !activeStream.manifest?.isMaster
                    ) {
                        defaultRepId = activeStream.originalUrl;
                    }

                    if (defaultRepId) {
                        newState.segmentExplorerActiveRepId = defaultRepId;

                        if (
                            activeStream.protocol === 'hls' &&
                            !activeStream.mediaPlaylists.has(defaultRepId)
                        ) {
                            setTimeout(
                                () =>
                                    eventBus.dispatch(
                                        'hls:media-playlist-fetch-request',
                                        {
                                            streamId: activeStream.id,
                                            variantUri: defaultRepId,
                                            isBackground: false,
                                        }
                                    ),
                                0
                            );
                        }
                    }
                }
            }

            return newState;
        });
    },
    setActiveSidebar: (sidebar) => set({ activeSidebar: sidebar }),
    setMultiPlayerActiveTab: (tab) => set({ multiPlayerActiveTab: tab }),
    toggleMultiPlayerViewMode: () =>
        set((state) => ({
            multiPlayerViewMode:
                state.multiPlayerViewMode === 'grid' ? 'immersive' : 'grid',
        })),
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
    navigateToInteractiveSegment: (
        segmentUniqueId,
        { highlightRange = null, isIFrame = false } = {}
    ) =>
        set({
            activeSegmentUrl: segmentUniqueId,
            activeSegmentHighlightRange: highlightRange,
            activeSegmentIsIFrame: isIFrame,
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
    loadWorkspaces: () => {
        set({
            workspaces: getWorkspaces(),
            presets: getPresets(),
            history: getHistory(),
        });
    },
    loadPresets: () => set({ presets: getPresets() }),
    loadHistory: () => set({ history: getHistory() }),
    deleteAndReloadPreset: (url) => {
        deletePreset(url);
        get().loadPresets();
    },
    deleteAndReloadHistoryItem: (url) => {
        deleteHistoryItem(url);
        get().loadHistory();
    },
    deleteAndReloadWorkspace: (name) => {
        deleteWorkspace(name);
        get().loadWorkspaces();
    },
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

            if (
                target.targetStreamId !== undefined &&
                target.targetStreamId !== currentTarget.targetStreamId
            ) {
                newTarget.targetFeatureName = null;
            }

            return { conditionalPolling: newTarget };
        });
    },
    setInactivityTimeoutOverride: (durationMs) =>
        set({ inactivityTimeoutOverride: durationMs }),
    toggleShowAllDrmFields: () =>
        set((state) => ({ showAllDrmFields: !state.showAllDrmFields })),
    toggleSegmentPollingSelectorGroup: (streamId) => {
        set((state) => {
            const newSet = new Set(
                state.segmentPollingSelectorState.expandedStreamIds
            );
            if (newSet.has(streamId)) {
                newSet.delete(streamId);
            } else {
                newSet.add(streamId);
            }
            return {
                segmentPollingSelectorState: {
                    ...state.segmentPollingSelectorState,
                    expandedStreamIds: newSet,
                },
            };
        });
    },
    setSegmentPollingTab: (streamId, tab) => {
        set((state) => {
            const newTabState = new Map(
                state.segmentPollingSelectorState.tabState
            );
            newTabState.set(streamId, tab);
            return {
                segmentPollingSelectorState: {
                    ...state.segmentPollingSelectorState,
                    tabState: newTabState,
                },
            };
        });
    },
    reset: () => set(createInitialUiState()),
}));

export const uiActions = useUiStore.getState();