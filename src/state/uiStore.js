import {
    deleteHistoryItem,
    deletePreset,
    deleteWorkspace,
    getHistory,
    getPresets,
    getWorkspaces,
} from '@/infrastructure/persistence/streamStorage';
import { createStore } from 'zustand/vanilla';
import { useAnalysisStore } from './analysisStore.js';

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
        isModalFullWidth: false,
        modalTitle: '',
        modalUrl: '',
        modalContent: null,
    },
    isLibraryModalOpen: false,
    isCmafSummaryExpanded: false,
    interactiveManifestCurrentPage: 1,
    interactiveManifestShowSubstituted: true,
    interactiveManifestHoveredItem: null,
    interactiveManifestSelectedItem: null,
    // --- Manifest Search State ---
    manifestSearch: {
        term: '',
        matchIndices: [],
        currentResultIndex: -1, // The index within matchIndices array (0 to N-1)
    },
    // -----------------------------
    interactiveSegmentCurrentPage: 1,
    interactiveSegmentActiveTab: 'inspector',
    interactiveSegmentSelectedItem: null,
    interactiveSegmentHighlightedItem: null,
    isByteMapLoading: false,
    complianceActiveFilter: 'all',
    complianceStandardVersion: 13,
    comparisonReferenceStreamId: null,
    comparisonReferenceVariantId: null,
    comparisonCandidateStreamId: null,
    comparisonCandidateVariantId: null,
    featureAnalysisStandardVersion: 13,
    segmentExplorerActiveRepId: null,
    segmentExplorerActiveTab: 'video',
    segmentExplorerClosedGroups: new Set(),
    segmentExplorerSortOrder: 'desc',
    segmentExplorerTargetTime: null,
    segmentExplorerScrollToTarget: false,
    segmentMatrixClickMode: 'inspect',
    highlightedCompliancePathId: null,
    highlightedComplianceCategory: null,
    highlightedQcMetric: null,
    highlightedTimeRange: null, // { start: number, end: number } | null
    highlightedIssueId: null, // Specific issue UUID for precise QC highlighting
    comparisonHideSameRows: false,
    comparisonHideUnusedFeatures: true,
    expandedComparisonTables: new Set(),
    expandedComparisonFlags: new Set(),
    segmentComparisonActiveTab: 'tabular',
    segmentComparisonSelection: {
        idA: null,
        idB: null,
    },
    playerControlMode: 'standard',
    streamLibraryActiveTab: 'workspaces',
    streamLibrarySearchTerm: '',
    streamInputActiveMobileTab: 'library',
    inspectorActiveTab: 'stream',
    presetSaveStatus: 'idle',
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
    globalPollingIntervalOverride: null,
    pollingMode: 'smart',
    showAllDrmFields: false,
    segmentPollingSelectorState: {
        expandedStreamIds: new Set(),
        tabState: new Map(),
    },
    debugCopySelections: {
        analysisState: true,
        uiState: true,
        rawManifests: true,
        parsedSegments: true,
    },
    manifestUpdatesHideDeleted: false,
    timelineHoveredItem: null,
    timelineSelectedItem: null,
    timelineActiveTab: 'overview',
    isSignalMonitorOpen: false,
    signalMonitorSize: 'normal',
    manifestComparisonViewMode: 'table',
    playerTelemetrySidebarOpen: true,
    pendingPlayerRequest: null,
});

export const useUiStore = createStore((set, get) => ({
    ...createInitialUiState(),

    injectViewMap: (viewMap) => set({ _viewMap: viewMap }),
    setViewState: (view) => set({ viewState: view }),
    toggleSignalMonitor: () =>
        set((state) => ({ isSignalMonitorOpen: !state.isSignalMonitorOpen })),
    setSignalMonitorSize: (size) => set({ signalMonitorSize: size }),
    setManifestComparisonViewMode: (mode) =>
        set({ manifestComparisonViewMode: mode }),
    togglePlayerTelemetrySidebar: () =>
        set((state) => ({
            playerTelemetrySidebarOpen: !state.playerTelemetrySidebarOpen,
        })),

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
                activeSegmentHighlightRange: null,
            };
        });

        // ... existing explorer tab logic ...
        const { streams, activeStreamId } = useAnalysisStore.getState();
        if (tabName === 'explorer' && streams) {
            const activeStream = streams.find((s) => s.id === activeStreamId);
            if (activeStream) {
                let defaultRepId = get().segmentExplorerActiveRepId;
                const isHls = activeStream.protocol === 'hls';
                const isDash = activeStream.protocol === 'dash';
                let isValidRep = false;
                if (isHls)
                    isValidRep = activeStream.hlsVariantState.has(defaultRepId);
                else if (isDash)
                    isValidRep =
                        activeStream.dashRepresentationState.has(defaultRepId);

                if (!defaultRepId || !isValidRep) {
                    if (isDash) {
                        const firstPeriod = activeStream.manifest.periods[0];
                        const firstAs = firstPeriod?.adaptationSets[0];
                        if (firstAs?.representations[0])
                            set({
                                segmentExplorerActiveRepId: `${firstPeriod.id || 0}-${firstAs.representations[0].id}`,
                            });
                    } else if (isHls) {
                        if (activeStream.manifest?.isMaster) {
                            const firstAs =
                                activeStream.manifest.periods[0]
                                    ?.adaptationSets[0];
                            if (firstAs?.representations[0])
                                set({
                                    segmentExplorerActiveRepId:
                                        firstAs.representations[0].id,
                                });
                        } else {
                            set({
                                segmentExplorerActiveRepId:
                                    activeStream.originalUrl,
                            });
                        }
                    }
                }
            }
        }
    },

    // --- Manifest Search Actions ---
    setManifestSearchTerm: (term) =>
        set((state) => ({
            manifestSearch: {
                ...state.manifestSearch,
                term,
            },
        })),
    setManifestSearchMatches: (indices) =>
        set((state) => ({
            manifestSearch: {
                ...state.manifestSearch,
                matchIndices: indices,
                currentResultIndex: indices.length > 0 ? 0 : -1,
            },
        })),
    nextManifestSearchResult: () =>
        set((state) => {
            const { matchIndices, currentResultIndex } = state.manifestSearch;
            if (matchIndices.length === 0) return {};
            const nextIndex =
                currentResultIndex >= matchIndices.length - 1
                    ? 0
                    : currentResultIndex + 1;
            return {
                manifestSearch: {
                    ...state.manifestSearch,
                    currentResultIndex: nextIndex,
                },
            };
        }),
    prevManifestSearchResult: () =>
        set((state) => {
            const { matchIndices, currentResultIndex } = state.manifestSearch;
            if (matchIndices.length === 0) return {};
            const prevIndex =
                currentResultIndex <= 0
                    ? matchIndices.length - 1
                    : currentResultIndex - 1;
            return {
                manifestSearch: {
                    ...state.manifestSearch,
                    currentResultIndex: prevIndex,
                },
            };
        }),
    // ---------------------------------

    setActiveSidebar: (sidebar) => set({ activeSidebar: sidebar }),

    // ... rest of actions unchanged
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
    setLibraryModalOpen: (isOpen) => set({ isLibraryModalOpen: isOpen }),
    toggleCmafSummary: () =>
        set((state) => ({
            isCmafSummaryExpanded: !state.isCmafSummaryExpanded,
        })),
    setInteractiveManifestPage: (page) =>
        set({ interactiveManifestCurrentPage: page }),
    setComparisonReferenceStreamId: (id) =>
        set({
            comparisonReferenceStreamId: id,
            comparisonReferenceVariantId: null,
        }),
    setComparisonReferenceVariantId: (id) =>
        set({ comparisonReferenceVariantId: id }),
    setComparisonCandidateStreamId: (id) =>
        set({
            comparisonCandidateStreamId: id,
            comparisonCandidateVariantId: null,
        }),
    setComparisonCandidateVariantId: (id) =>
        set({ comparisonCandidateVariantId: id }),
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
    setSegmentExplorerActiveRepId: (repId) => {
        if (get().segmentExplorerActiveRepId === repId) return;
        set({ segmentExplorerActiveRepId: repId });
    },
    setSegmentExplorerActiveTab: (tab) =>
        set({ segmentExplorerActiveTab: tab }),
    setSegmentMatrixClickMode: (mode) => set({ segmentMatrixClickMode: mode }),
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
    setComplianceFilter: (filter) => set({ complianceActiveFilter: filter }),
    setComplianceStandardVersion: (version) =>
        set({ complianceStandardVersion: version }),
    setFeatureAnalysisStandardVersion: (version) =>
        set({ featureAnalysisStandardVersion: version }),
    setHighlightedCompliancePathId: (pathId) =>
        set({ highlightedCompliancePathId: pathId }),
    setHighlightedComplianceCategory: (category) =>
        set({ highlightedComplianceCategory: category }),
    setHighlightedQcMetric: (metric) => set({ highlightedQcMetric: metric }),
    setHighlightedTimeRange: (range) => set({ highlightedTimeRange: range }),
    setHighlightedIssueId: (id) => set({ highlightedIssueId: id }),
    toggleComparisonTable: (tableId) =>
        set((state) => {
            const newSet = new Set(state.expandedComparisonTables);
            if (newSet.has(tableId)) newSet.delete(tableId);
            else newSet.add(tableId);
            return { expandedComparisonTables: newSet };
        }),
    toggleComparisonFlags: (rowName) =>
        set((state) => {
            const newSet = new Set(state.expandedComparisonFlags);
            if (newSet.has(rowName)) newSet.delete(rowName);
            else newSet.add(rowName);
            return { expandedComparisonFlags: newSet };
        }),
    toggleComparisonHideSameRows: () =>
        set((state) => ({
            comparisonHideSameRows: !state.comparisonHideSameRows,
        })),
    toggleComparisonHideUnusedFeatures: () =>
        set((state) => ({
            comparisonHideUnusedFeatures: !state.comparisonHideUnusedFeatures,
        })),
    setSegmentComparisonActiveTab: (tab) =>
        set({ segmentComparisonActiveTab: tab }),
    setSegmentComparisonSelection: (selection) =>
        set((state) => ({
            segmentComparisonSelection: {
                ...state.segmentComparisonSelection,
                ...selection,
            },
        })),
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
    setInspectorActiveTab: (tab) => set({ inspectorActiveTab: tab }),
    setPresetSaveStatus: (status) => set({ presetSaveStatus: status }),
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
        const { loadedWorkspaceName } = get();
        deleteWorkspace(name);
        const newWorkspaces = getWorkspaces();
        const newState = { workspaces: newWorkspaces };
        if (loadedWorkspaceName === name) {
            newState.loadedWorkspaceName = null;
        }
        set(newState);
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
                targetStreamId: state.conditionalPolling.targetStreamId,
                targetFeatureName: state.conditionalPolling.targetFeatureName,
            },
        })),
    setConditionalPollingStatus: (status) =>
        set((state) => ({
            conditionalPolling: { ...state.conditionalPolling, status },
        })),
    setConditionalPollingTarget: (target) =>
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
        }),
    setInactivityTimeoutOverride: (durationMs) =>
        set({ inactivityTimeoutOverride: durationMs }),
    setGlobalPollingIntervalOverride: (interval) =>
        set({ globalPollingIntervalOverride: interval }),
    setPollingMode: (mode) => set({ pollingMode: mode }),
    toggleShowAllDrmFields: () =>
        set((state) => ({ showAllDrmFields: !state.showAllDrmFields })),
    setDebugCopySelection: (selection, value) =>
        set((state) => ({
            debugCopySelections: {
                ...state.debugCopySelections,
                [selection]: value,
            },
        })),
    toggleSegmentPollingSelectorGroup: (streamId) =>
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
        }),
    setSegmentPollingTab: (streamId, tab) =>
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
        }),
    toggleManifestUpdatesHideDeleted: () =>
        set((state) => ({
            manifestUpdatesHideDeleted: !state.manifestUpdatesHideDeleted,
        })),
    setTimelineHoveredItem: (item) => set({ timelineHoveredItem: item }),
    setTimelineSelectedItem: (item) => set({ timelineSelectedItem: item }),
    setTimelineActiveTab: (tab) => set({ timelineActiveTab: tab }),

    requestPlayerPlayback: ({ startTime, autoPlay }) => {
        set({
            pendingPlayerRequest: { startTime, autoPlay },
            activeTab: 'player-simulation',
        });
    },
    clearPendingPlayerRequest: () => {
        set({ pendingPlayerRequest: null });
    },

    reset: () => set(createInitialUiState()),
}));

export const uiActions = useUiStore.getState();
