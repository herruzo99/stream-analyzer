import {
    createEffectiveSourceFingerprint,
    projectPersistableEffectiveSource,
} from './effective-source-configuration.js';
import {
    createStagingBaseline,
    hasStagingConflict,
    projectStagingState,
} from './staging-contract.js';
import {
    createStagingWorkflow,
    deriveRestingStagingPhase,
    transitionStagingWorkflow,
} from './staging-workflow-contract.js';

export class StagingCommandError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'StagingCommandError';
        this.code = code;
    }
}

/**
 * Create the application boundary for staging intentions. UI confirmation and
 * overlay placement remain presentation concerns; all state/effect sequencing
 * after confirmation lives here.
 */
export function createStagingCommandService(dependencies) {
    const {
        getAnalysisState,
        getUiState,
        analysisActions,
        uiActions,
        persistWorkspace,
        createShareUrl,
        writeClipboard,
        requestAnalysis,
        requestSegmentAnalysis = () => {},
        requestPresetSave = () => {},
        previewWorkspaceImport = async () => null,
        mergeWorkspaceSources = (_current, incoming) => incoming,
        exportWorkspaceFile = () => {},
        deleteLibraryRecord = () => {},
        restoreDeletedWorkspace = () => false,
        notify = () => {},
    } = dependencies;

    const model = () => {
        const analysis = getAnalysisState();
        return projectStagingState({
            streamInputs: analysis.streamInputs,
            activeStreamInputId: analysis.activeStreamInputId,
            loadedWorkspaceName: getUiState().loadedWorkspaceName,
            activeMobilePage: getUiState().stagingActivePage,
            selectedSourceIds: analysis.selectedStreamInputIds ?? new Set(),
            queueFilter: getUiState().stagingQueueFilter,
            baseline: getUiState().stagingBaseline,
        });
    };

    const captureBaseline = () => {
        uiActions.setStagingBaseline?.(
            createStagingBaseline(getAnalysisState().streamInputs)
        );
    };

    const requireCurrentRevision = (expectedRevision) => {
        const current = model();
        if (
            expectedRevision &&
            hasStagingConflict(
                expectedRevision,
                getAnalysisState().streamInputs
            )
        ) {
            throw new StagingCommandError(
                'stale-draft',
                'The queue changed. Review the latest sources and try again.'
            );
        }
        return current;
    };

    const setWorkflow = (phase, details = {}) => {
        if (!uiActions.setStagingWorkflow) return;
        const current = getUiState().stagingWorkflow ?? createStagingWorkflow();
        uiActions.setStagingWorkflow(
            transitionStagingWorkflow(current, phase, details)
        );
    };

    const setRestingWorkflow = () => {
        setWorkflow(deriveRestingStagingPhase(getAnalysisState().streamInputs));
    };

    const run = async (operation) => {
        try {
            return await operation();
        } catch (error) {
            const message =
                error instanceof StagingCommandError
                    ? error.message
                    : 'The staging action could not be completed.';
            notify({ message, type: 'warn' });
            setWorkflow('recovery', { operation: 'command', error: message });
            return Object.freeze({
                status: 'rejected',
                code:
                    error instanceof StagingCommandError
                        ? error.code
                        : 'unexpected',
                error,
            });
        }
    };

    return Object.freeze({
        addSources(sources) {
            const establishesDraft =
                getAnalysisState().streamInputs.length === 0 &&
                getUiState().stagingBaseline == null;
            const valid = (Array.isArray(sources) ? sources : []).filter(
                (source) => source?.url || source?.file
            );
            if (valid.length === 0) {
                return Object.freeze({
                    status: 'rejected',
                    code: 'source-location-required',
                });
            }
            const existing = new Map(
                model().sources.map(({ input }) => [
                    createEffectiveSourceFingerprint(input),
                    input.id,
                ])
            );
            const accepted = [];
            const duplicates = [];
            for (const source of valid) {
                const fingerprint = createEffectiveSourceFingerprint(source);
                if (existing.has(fingerprint)) {
                    duplicates.push({
                        source,
                        existingId: existing.get(fingerprint),
                    });
                    continue;
                }
                existing.set(fingerprint, null);
                accepted.push(source);
            }
            accepted.forEach((source) =>
                analysisActions.addStreamInputFromPreset(source)
            );
            if (establishesDraft && accepted.length > 0) captureBaseline();
            if (accepted.length === 0 && duplicates[0]?.existingId != null) {
                analysisActions.setActiveStreamInputId(
                    duplicates[0].existingId
                );
            }
            setRestingWorkflow();
            notify({
                message: accepted.length
                    ? `${accepted.length} source${accepted.length === 1 ? '' : 's'} added${
                          duplicates.length
                              ? `; ${duplicates.length} duplicate${duplicates.length === 1 ? '' : 's'} skipped`
                              : ''
                      }`
                    : 'This source configuration is already in the queue.',
                type: accepted.length ? 'pass' : 'warn',
            });
            return Object.freeze({
                status: accepted.length ? 'completed' : 'unchanged',
                sourceCount: accepted.length,
                duplicateCount: duplicates.length,
            });
        },

        addSource(source) {
            return this.addSources([source]);
        },

        analyzeSegmentFiles(files) {
            const valid = (Array.isArray(files) ? files : []).filter(Boolean);
            if (valid.length === 0) {
                return Object.freeze({
                    status: 'rejected',
                    code: 'segment-file-required',
                });
            }
            requestSegmentAnalysis(valid);
            return Object.freeze({
                status: 'completed',
                fileCount: valid.length,
            });
        },

        replaceAndAnalyzeSources(sources) {
            return run(async () => {
                const valid = (Array.isArray(sources) ? sources : []).filter(
                    (source) => source?.url || source?.file
                );
                if (valid.length === 0) {
                    throw new StagingCommandError(
                        'source-location-required',
                        'Choose at least one URL, manifest, or local file to analyze.'
                    );
                }
                const previous = getAnalysisState();
                const previousBaseline = getUiState().stagingBaseline;
                analysisActions.setStreamInputs(valid);
                captureBaseline();
                setWorkflow('analyzing', { operation: 'analyze' });
                try {
                    await requestAnalysis(getAnalysisState().streamInputs);
                } catch (error) {
                    analysisActions.setStreamInputs(previous.streamInputs);
                    analysisActions.setActiveStreamInputId(
                        previous.activeStreamInputId
                    );
                    uiActions.setStagingBaseline?.(previousBaseline);
                    throw error;
                }
                return Object.freeze({
                    status: 'completed',
                    sourceCount: valid.length,
                });
            });
        },

        resumeSource(source) {
            return this.replaceAndAnalyzeSources([source]);
        },

        selectSource(sourceId) {
            const current = model();
            const source = current.sources.find(
                ({ input }) => input.id === sourceId
            );
            if (!source) {
                return Object.freeze({
                    status: 'rejected',
                    code: 'source-not-found',
                });
            }
            if (
                !current.visibleSources.some(
                    ({ input }) => input.id === sourceId
                )
            ) {
                uiActions.setStagingQueueFilter('');
            }
            analysisActions.setActiveStreamInputId(sourceId);
            return Object.freeze({ status: 'completed', sourceId });
        },

        beginSourceAddition() {
            analysisActions.setActiveStreamInputId(null);
            setRestingWorkflow();
            return Object.freeze({ status: 'completed' });
        },

        setActivePage(page) {
            const normalized = page === 'configure' ? 'configure' : 'queue';
            uiActions.setStagingActivePage(normalized);
            return Object.freeze({ status: 'completed', page: normalized });
        },

        setQueueFilter(term) {
            uiActions.setStagingQueueFilter(String(term ?? ''));
            return Object.freeze({ status: 'completed' });
        },

        toggleBulkSourceSelection(sourceId) {
            const current = model();
            if (!current.sources.some(({ input }) => input.id === sourceId)) {
                return Object.freeze({
                    status: 'rejected',
                    code: 'source-not-found',
                });
            }
            const selected = new Set(current.selectedSourceIds);
            if (selected.has(sourceId)) selected.delete(sourceId);
            else selected.add(sourceId);
            analysisActions.setSelectedStreamInputIds(selected);
            return Object.freeze({
                status: 'completed',
                selectedCount: selected.size,
            });
        },

        selectAllVisibleSources() {
            const selected = model().visibleSources.map(
                ({ input }) => input.id
            );
            analysisActions.setSelectedStreamInputIds(selected);
            return Object.freeze({
                status: 'completed',
                selectedCount: selected.length,
            });
        },

        clearBulkSourceSelection() {
            analysisActions.setSelectedStreamInputIds([]);
            return Object.freeze({ status: 'completed' });
        },

        retrySelectedSources() {
            const retrying = model().sources.filter(
                ({ bulkSelected, status }) =>
                    bulkSelected && status.state === 'blocked'
            );
            if (retrying.length === 0) {
                return Object.freeze({ status: 'unchanged' });
            }
            for (const { input } of retrying) {
                analysisActions.updateStreamInput(input.id, 'tier0', null);
                analysisActions.updateStreamInput(
                    input.id,
                    'isTier0AnalysisLoading',
                    true
                );
            }
            setWorkflow('validating', { operation: 'bulk-preflight' });
            return Object.freeze({
                status: 'completed',
                retriedCount: retrying.length,
            });
        },

        removeSelectedSources() {
            const selected = model().selectedSourceIds;
            if (selected.length === 0) {
                return Object.freeze({ status: 'unchanged' });
            }
            analysisActions.removeStreamInputs(selected);
            setRestingWorkflow();
            notify({
                message: `${selected.length} selected source${selected.length === 1 ? '' : 's'} removed`,
                type: 'info',
            });
            return Object.freeze({
                status: 'completed',
                removedCount: selected.length,
            });
        },

        removeDuplicateSources() {
            const duplicates = model()
                .sources.filter(({ duplicateOf }) => duplicateOf !== null)
                .map(({ input }) => input.id);
            if (duplicates.length === 0) {
                return Object.freeze({ status: 'unchanged' });
            }
            analysisActions.removeStreamInputs(duplicates);
            setRestingWorkflow();
            notify({
                message: `${duplicates.length} duplicate source${duplicates.length === 1 ? '' : 's'} removed`,
                type: 'info',
            });
            return Object.freeze({
                status: 'completed',
                removedCount: duplicates.length,
            });
        },

        applyRequestHeaderToSelected({ key, value }) {
            const selected = model().selectedSourceIds;
            if (!key?.trim() || selected.length === 0) {
                return Object.freeze({
                    status: 'rejected',
                    code: selected.length
                        ? 'header-name-required'
                        : 'source-selection-required',
                });
            }
            const baseId = Date.now();
            analysisActions.patchStreamInputs(selected, (input, index) => ({
                auth: {
                    ...input.auth,
                    headers: [
                        ...(input.auth?.headers ?? []),
                        {
                            id: baseId + index,
                            key: key.trim(),
                            value: String(value ?? ''),
                        },
                    ],
                },
            }));
            notify({
                message: `Request header applied to ${selected.length} source${selected.length === 1 ? '' : 's'}`,
                type: 'pass',
            });
            return Object.freeze({
                status: 'completed',
                updatedCount: selected.length,
            });
        },

        applyPresetToSelected(preset) {
            const selected = model().selectedSourceIds;
            if (selected.length === 0 || !preset) {
                return Object.freeze({
                    status: 'rejected',
                    code: 'source-selection-required',
                });
            }
            analysisActions.patchStreamInputs(selected, (input) => ({
                ...(preset.auth ? { auth: structuredClone(preset.auth) } : {}),
                ...(preset.drmAuth
                    ? { drmAuth: structuredClone(preset.drmAuth) }
                    : {}),
                tier0: input.tier0,
            }));
            notify({
                message: `${preset.name || 'Preset'} applied to ${selected.length} source${selected.length === 1 ? '' : 's'}`,
                type: 'pass',
            });
            return Object.freeze({
                status: 'completed',
                updatedCount: selected.length,
            });
        },

        reorderSource(sourceId, direction) {
            const current = model();
            const source = current.sources.find(
                ({ input }) => input.id === sourceId
            );
            const target = source ? source.index + direction : -1;
            if (
                !source ||
                ![-1, 1].includes(direction) ||
                target < 0 ||
                target >= current.sources.length
            ) {
                return Object.freeze({ status: 'unchanged' });
            }
            analysisActions.reorderStreamInput(sourceId, direction);
            return Object.freeze({ status: 'completed', sourceId, direction });
        },

        retryPreflight(sourceId) {
            const source = model().sources.find(
                ({ input }) => input.id === sourceId
            );
            if (!source) {
                return Object.freeze({
                    status: 'rejected',
                    code: 'source-not-found',
                });
            }
            analysisActions.updateStreamInput(sourceId, 'tier0', null);
            analysisActions.updateStreamInput(
                sourceId,
                'isTier0AnalysisLoading',
                true
            );
            setWorkflow('validating', { operation: 'preflight' });
            return Object.freeze({ status: 'completed', sourceId });
        },

        updateSource(sourceId, field, value) {
            const source = model().sources.find(
                ({ input }) => input.id === sourceId
            );
            if (!source) {
                return Object.freeze({
                    status: 'rejected',
                    code: 'source-not-found',
                });
            }
            analysisActions.updateStreamInput(sourceId, field, value);
            return Object.freeze({ status: 'completed', sourceId, field });
        },

        addPolicyParameter(sourceId, scope, type) {
            const action =
                scope === 'license'
                    ? analysisActions.addDrmAuthParam
                    : analysisActions.addAuthParam;
            action(sourceId, type);
            return Object.freeze({ status: 'completed', sourceId });
        },

        updatePolicyParameter(
            sourceId,
            scope,
            type,
            parameterId,
            field,
            value
        ) {
            const action =
                scope === 'license'
                    ? analysisActions.updateDrmAuthParam
                    : analysisActions.updateAuthParam;
            action(sourceId, type, parameterId, field, value);
            return Object.freeze({ status: 'completed', sourceId });
        },

        removePolicyParameter(sourceId, scope, type, parameterId) {
            const action =
                scope === 'license'
                    ? analysisActions.removeDrmAuthParam
                    : analysisActions.removeAuthParam;
            action(sourceId, type, parameterId);
            return Object.freeze({ status: 'completed', sourceId });
        },

        saveSourcePreset({ sourceId, name, isPreset = false }) {
            const source = model().sources.find(
                ({ input }) => input.id === sourceId
            );
            if (!source) {
                return Object.freeze({
                    status: 'rejected',
                    code: 'source-not-found',
                });
            }
            requestPresetSave({
                name: name || source.effective.identity.name,
                url: source.effective.identity.url,
                isPreset,
            });
            return Object.freeze({ status: 'completed', sourceId });
        },

        removeSource(sourceId) {
            const source = model().sources.find(
                ({ input }) => input.id === sourceId
            );
            if (!source) {
                return Object.freeze({
                    status: 'rejected',
                    code: 'source-not-found',
                });
            }
            analysisActions.removeStreamInput(sourceId);
            setRestingWorkflow();
            notify({ message: 'Source removed from queue', type: 'info' });
            return Object.freeze({ status: 'completed', sourceId });
        },

        clearDraft() {
            analysisActions.clearAllStreamInputs();
            uiActions.setStagingBaseline?.(null);
            setWorkflow('landing');
            notify({ message: 'Source queue cleared', type: 'info' });
            return Object.freeze({ status: 'completed' });
        },

        openLibrary(kind) {
            uiActions.loadWorkspaces?.();
            uiActions.openStreamLibrary(kind || 'workspaces');
            return Object.freeze({ status: 'completed', kind });
        },

        closeLibrary() {
            uiActions.setLibraryModalOpen(false);
            uiActions.resetStreamLibraryWorkflow?.();
            return Object.freeze({ status: 'completed' });
        },

        setLibraryTab(kind) {
            uiActions.setStreamLibraryTab(kind || 'workspaces');
            return Object.freeze({ status: 'completed', kind });
        },

        setLibrarySearch(term) {
            uiActions.setStreamLibrarySearchTerm(term || '');
            return Object.freeze({ status: 'completed' });
        },

        setLibraryImportError(message) {
            uiActions.setStreamLibraryWorkflow({
                status: 'error',
                preview: null,
                notice: '',
                error: message || 'The workspace file is not valid.',
            });
            return Object.freeze({ status: 'completed' });
        },

        previewLibraryWorkspace(workspace, options = {}) {
            uiActions.setStreamLibraryWorkflow({
                status: 'previewing',
                preview: {
                    workspace,
                    imported: options.imported === true,
                    summary: options.summary ?? null,
                },
                notice: '',
                error: '',
            });
            return Object.freeze({ status: 'completed' });
        },

        cancelLibraryPreview() {
            uiActions.setStreamLibraryWorkflow({
                status: 'idle',
                preview: null,
                error: '',
            });
            return Object.freeze({ status: 'completed' });
        },

        importLibraryWorkspace(file) {
            return run(async () => {
                uiActions.setStreamLibraryWorkflow({
                    status: 'importing',
                    error: '',
                    notice: '',
                });
                try {
                    const imported = await previewWorkspaceImport(file);
                    uiActions.setStreamLibraryWorkflow({
                        status: 'previewing',
                        preview: {
                            workspace: imported.workspace,
                            imported: true,
                            summary: imported.summary ?? null,
                        },
                    });
                    return Object.freeze({
                        status: 'completed',
                        preview: imported,
                    });
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : 'Workspace import could not be previewed.';
                    uiActions.setStreamLibraryWorkflow({
                        status: 'error',
                        preview: null,
                        error: message,
                    });
                    throw new StagingCommandError(
                        'invalid-workspace-import',
                        message
                    );
                }
            });
        },

        applyLibraryWorkspace(mode) {
            return run(async () => {
                const preview = getUiState().streamLibraryWorkflow?.preview;
                if (!preview?.workspace) {
                    throw new StagingCommandError(
                        'workspace-preview-required',
                        'Preview a workspace before applying it.'
                    );
                }
                const { workspace, imported } = preview;
                setWorkflow('restoring', { operation: 'workspace' });
                if (imported) {
                    await persistWorkspace(workspace);
                    uiActions.loadWorkspaces?.();
                }
                const inputs =
                    mode === 'merge'
                        ? mergeWorkspaceSources(
                              getAnalysisState().streamInputs,
                              workspace.inputs
                          )
                        : workspace.inputs;
                analysisActions.setStreamInputs(inputs);
                captureBaseline();
                setRestingWorkflow();
                uiActions.setLoadedWorkspaceName(workspace.name);
                uiActions.setStreamLibraryWorkflow({
                    status: 'idle',
                    preview: null,
                    error: '',
                    notice: `${workspace.name} applied with ${
                        mode === 'merge' ? 'merge' : 'replace'
                    } mode.`,
                });
                return Object.freeze({
                    status: 'completed',
                    sourceCount: inputs.length,
                });
            });
        },

        saveImportedLibraryWorkspace() {
            return run(async () => {
                const preview = getUiState().streamLibraryWorkflow?.preview;
                if (!preview?.imported || !preview.workspace) {
                    throw new StagingCommandError(
                        'import-preview-required',
                        'Preview an imported workspace before saving it.'
                    );
                }
                await persistWorkspace(preview.workspace);
                uiActions.loadWorkspaces?.();
                uiActions.setStreamLibraryWorkflow({
                    status: 'idle',
                    preview: null,
                    error: '',
                    notice: `${preview.workspace.name} saved without changing the current queue.`,
                });
                return Object.freeze({ status: 'completed' });
            });
        },

        exportLibraryWorkspace(name) {
            try {
                const filename = exportWorkspaceFile(name);
                notify({
                    message: filename
                        ? `Workspace exported as ${filename}`
                        : 'Workspace exported',
                    type: 'pass',
                });
                return Object.freeze({ status: 'completed', name, filename });
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'The workspace could not be exported.';
                notify({ message, type: 'warn' });
                setWorkflow('recovery', {
                    operation: 'workspace-export',
                    error: message,
                });
                return Object.freeze({
                    status: 'rejected',
                    code: 'workspace-export-failed',
                    error,
                });
            }
        },

        deleteLibraryItem(kind, identity) {
            deleteLibraryRecord(kind, identity);
            uiActions.loadWorkspaces?.();
            if (
                kind === 'workspaces' &&
                getUiState().loadedWorkspaceName === identity
            ) {
                uiActions.setLoadedWorkspaceName(null);
            }
            uiActions.setStreamLibraryWorkflow({
                status: 'idle',
                notice:
                    kind === 'workspaces'
                        ? `${identity} moved to recoverable deletion.`
                        : 'Library item deleted.',
                error: '',
            });
            return Object.freeze({ status: 'completed' });
        },

        restoreLastDeletedLibraryWorkspace() {
            const restored = restoreDeletedWorkspace();
            if (restored) {
                uiActions.loadWorkspaces?.();
                uiActions.setStreamLibraryWorkflow({
                    status: 'idle',
                    notice: 'Last deleted workspace restored.',
                    error: '',
                });
            }
            return Object.freeze({
                status: restored ? 'completed' : 'unchanged',
            });
        },

        saveWorkspace({ expectedRevision, name }) {
            return run(async () => {
                const current = requireCurrentRevision(expectedRevision);
                const normalizedName = name?.trim();
                if (!normalizedName) {
                    throw new StagingCommandError(
                        'workspace-name-required',
                        'Enter a workspace name.'
                    );
                }
                const workspace = {
                    name: normalizedName,
                    inputs: current.sources.map(({ effective }) =>
                        projectPersistableEffectiveSource(effective)
                    ),
                };
                await persistWorkspace(workspace);
                uiActions.setLoadedWorkspaceName(normalizedName);
                captureBaseline();
                uiActions.loadWorkspaces?.();
                notify({
                    message: `Workspace “${normalizedName}” saved`,
                    type: 'pass',
                });
                return Object.freeze({
                    status: 'completed',
                    workspace,
                });
            });
        },

        shareDraft({ expectedRevision }) {
            return run(async () => {
                requireCurrentRevision(expectedRevision);
                const url = createShareUrl();
                await writeClipboard(url);
                notify({
                    message: 'Shareable link copied to clipboard',
                    type: 'pass',
                });
                return Object.freeze({ status: 'completed', url });
            });
        },

        analyzeDraft({ expectedRevision }) {
            return run(async () => {
                const current = requireCurrentRevision(expectedRevision);
                if (!current.canAnalyze) {
                    throw new StagingCommandError(
                        'draft-not-ready',
                        current.blockingReasons.join(' ')
                    );
                }
                setWorkflow('analyzing', { operation: 'analyze' });
                await requestAnalysis(current.analyzableInputs);
                return Object.freeze({
                    status: 'completed',
                    sourceCount: current.analyzableInputs.length,
                });
            });
        },

        recordPreflightCompletion() {
            setRestingWorkflow();
            return Object.freeze({ status: 'completed' });
        },

        recoverDraft() {
            setRestingWorkflow();
            return Object.freeze({ status: 'completed' });
        },
    });
}
