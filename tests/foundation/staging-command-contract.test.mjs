import assert from 'node:assert/strict';
import test from 'node:test';
import { createStagingCommandService } from '../../src/features/streamInput/application/staging-command-contract.js';
import {
    createStagingConfigurationRevision,
    createStagingRevision,
} from '../../src/features/streamInput/application/staging-contract.js';

function input(id = 1, overrides = {}) {
    return {
        id,
        name: `Source ${id}`,
        url: `https://media.example.test/${id}.mpd`,
        file: null,
        auth: { headers: [], queryParams: [] },
        drmAuth: {
            licenseServerUrl: null,
            serverCertificate: null,
            headers: [],
            queryParams: [],
        },
        detectedDrm: [],
        tier0: { status: 200, protocol: 'DASH', type: 'VOD' },
        isTier0AnalysisLoading: false,
        ...overrides,
    };
}

function harness(inputs = [input()]) {
    const state = {
        streamInputs: inputs,
        activeStreamInputId: inputs[0]?.id ?? null,
        selectedStreamInputIds: new Set(),
    };
    const uiState = {
        loadedWorkspaceName: null,
        streamLibraryWorkflow: {
            status: 'idle',
            preview: null,
            notice: '',
            error: '',
        },
        stagingWorkflow: {
            phase: inputs.length ? 'staging' : 'landing',
            operation: null,
            error: null,
        },
        stagingQueueFilter: '',
        stagingBaseline: null,
    };
    const calls = [];
    const notifications = [];
    const analysisActions = {
        addStreamInputFromPreset: (source) => calls.push(['add', source]),
        setStreamInputs: (inputs) => {
            calls.push(['replace', inputs]);
            state.streamInputs = inputs;
            state.activeStreamInputId = inputs[0]?.id ?? null;
        },
        setActiveStreamInputId: (id) => {
            calls.push(['select', id]);
            state.activeStreamInputId = id;
        },
        reorderStreamInput: (id, direction) =>
            calls.push(['reorder', id, direction]),
        updateStreamInput: (id, field, value) =>
            calls.push(['update', id, field, value]),
        addAuthParam: (...args) => calls.push(['add-request-param', ...args]),
        updateAuthParam: (...args) =>
            calls.push(['update-request-param', ...args]),
        removeAuthParam: (...args) =>
            calls.push(['remove-request-param', ...args]),
        addDrmAuthParam: (...args) =>
            calls.push(['add-license-param', ...args]),
        updateDrmAuthParam: (...args) =>
            calls.push(['update-license-param', ...args]),
        removeDrmAuthParam: (...args) =>
            calls.push(['remove-license-param', ...args]),
        removeStreamInput: (id) => calls.push(['remove', id]),
        setSelectedStreamInputIds: (ids) => {
            state.selectedStreamInputIds = new Set(ids);
            calls.push(['bulk-select', [...ids]]);
        },
        removeStreamInputs: (ids) => calls.push(['bulk-remove', [...ids]]),
        patchStreamInputs: (ids, patcher) =>
            calls.push(['bulk-patch', [...ids], patcher]),
        clearAllStreamInputs: () => calls.push(['clear']),
    };
    const uiActions = {
        openStreamLibrary: (kind) => calls.push(['library', kind]),
        setLoadedWorkspaceName: (name) => {
            calls.push(['workspace-name', name]);
            uiState.loadedWorkspaceName = name;
        },
        setStagingActivePage: (page) => {
            calls.push(['page', page]);
            uiState.stagingActivePage = page;
        },
        setStagingWorkflow: (workflow) => {
            uiState.stagingWorkflow = workflow;
        },
        setStagingBaseline: (baseline) => {
            uiState.stagingBaseline = baseline;
        },
        setStagingQueueFilter: (term) => {
            uiState.stagingQueueFilter = term;
            calls.push(['queue-filter', term]);
        },
        setLibraryModalOpen: (open) => calls.push(['library-open', open]),
        setStreamLibraryTab: (kind) => calls.push(['library-tab', kind]),
        setStreamLibrarySearchTerm: (term) =>
            calls.push(['library-search', term]),
        setStreamLibraryWorkflow: (patch) => {
            calls.push(['library-workflow', patch]);
            uiState.streamLibraryWorkflow = {
                ...uiState.streamLibraryWorkflow,
                ...patch,
            };
        },
        resetStreamLibraryWorkflow: () =>
            calls.push(['library-workflow-reset']),
    };
    const service = createStagingCommandService({
        getAnalysisState: () => state,
        getUiState: () => uiState,
        analysisActions,
        uiActions,
        persistWorkspace: async (workspace) =>
            calls.push(['persist', workspace]),
        createShareUrl: () => 'https://app.example.test/#state=redacted',
        writeClipboard: async (url) => calls.push(['clipboard', url]),
        requestAnalysis: async (sources) => calls.push(['analyze', sources]),
        requestSegmentAnalysis: (files) => calls.push(['segments', files]),
        requestPresetSave: (detail) => calls.push(['preset', detail]),
        previewWorkspaceImport: async (file) => ({
            workspace: { name: file.name, inputs: [input(3)] },
            summary: { redactedInputCount: 0 },
        }),
        mergeWorkspaceSources: (current, incoming) => [...current, ...incoming],
        exportWorkspaceFile: (name) => calls.push(['export', name]),
        deleteLibraryRecord: (kind, identity) =>
            calls.push(['delete-library', kind, identity]),
        restoreDeletedWorkspace: () => true,
        notify: (notification) => notifications.push(notification),
    });
    return { state, uiState, calls, notifications, service };
}

test('staging commands analyze the same ready inputs represented by the draft', async () => {
    const first = input(1);
    const second = input(2);
    const { calls, service, state } = harness([first, second]);
    const result = await service.analyzeDraft({
        expectedRevision: createStagingRevision(state.streamInputs),
    });

    assert.deepEqual(result, { status: 'completed', sourceCount: 2 });
    assert.deepEqual(calls, [['analyze', [first, second]]]);
});

test('stale draft rejection is atomic and produces actionable feedback', async () => {
    const { calls, notifications, service, state, uiState } = harness();
    const expectedRevision = createStagingRevision(state.streamInputs);
    state.streamInputs = [
        { ...state.streamInputs[0], name: 'Changed elsewhere' },
    ];

    const result = await service.saveWorkspace({
        expectedRevision,
        name: 'Workspace',
    });

    assert.equal(result.status, 'rejected');
    assert.equal(result.code, 'stale-draft');
    assert.deepEqual(calls, []);
    assert.match(notifications[0].message, /queue changed/i);
    assert.equal(uiState.stagingWorkflow.phase, 'recovery');
});

test('save command persists only the effective configuration before committing UI state', async () => {
    const source = input(1, {
        auth: {
            headers: [{ id: 1, key: 'Authorization', value: 'Bearer test' }],
            queryParams: [],
        },
    });
    const { calls, service, state, uiState } = harness([source]);
    const result = await service.saveWorkspace({
        expectedRevision: createStagingRevision(state.streamInputs),
        name: '  Operations  ',
    });

    assert.equal(result.status, 'completed');
    assert.deepEqual(calls[0], [
        'persist',
        {
            name: 'Operations',
            inputs: [
                {
                    effectiveSourceVersion: 1,
                    url: source.url,
                    name: source.name,
                    auth: source.auth,
                    drmAuth: source.drmAuth,
                },
            ],
        },
    ]);
    assert.deepEqual(calls[1], ['workspace-name', 'Operations']);
    assert.equal(
        uiState.stagingBaseline.revision,
        createStagingConfigurationRevision(state.streamInputs)
    );
});

test('selection, ordering, retry, removal, library and clear use one command surface', () => {
    const { calls, service } = harness([input(1), input(2)]);

    service.selectSource(2);
    service.setActivePage('configure');
    service.reorderSource(2, -1);
    service.retryPreflight(2);
    service.removeSource(2);
    service.openLibrary('examples');
    service.clearDraft();

    assert.deepEqual(calls, [
        ['select', 2],
        ['page', 'configure'],
        ['reorder', 2, -1],
        ['update', 2, 'tier0', null],
        ['update', 2, 'isTier0AnalysisLoading', true],
        ['remove', 2],
        ['library', 'examples'],
        ['clear'],
    ]);
});

test('source creation, editing, request policy, preset, and resume use the command boundary', async () => {
    const first = input(1);
    const second = input(2);
    const { calls, service } = harness([first]);

    service.addSource(second);
    service.analyzeSegmentFiles(['segment.m4s']);
    service.updateSource(1, 'name', 'Primary');
    service.addPolicyParameter(1, 'request', 'headers');
    service.updatePolicyParameter(1, 'license', 'headers', 9, 'value', 'token');
    service.removePolicyParameter(1, 'request', 'headers', 7);
    service.saveSourcePreset({ sourceId: 1, name: 'Saved', isPreset: true });
    await service.resumeSource(second);

    assert.deepEqual(calls, [
        ['add', second],
        ['segments', ['segment.m4s']],
        ['update', 1, 'name', 'Primary'],
        ['add-request-param', 1, 'headers'],
        ['update-license-param', 1, 'headers', 9, 'value', 'token'],
        ['remove-request-param', 1, 'headers', 7],
        ['preset', { name: 'Saved', url: first.url, isPreset: true }],
        ['replace', [second]],
        ['analyze', [second]],
    ]);
});

test('batch add rejects existing and intra-batch duplicate configurations atomically', () => {
    const first = input(1);
    const second = input(2);
    const duplicateSecond = { ...second, name: 'Same configuration' };
    const { calls, notifications, service } = harness([first]);

    const result = service.addSources([first, second, duplicateSecond]);

    assert.deepEqual(result, {
        status: 'completed',
        sourceCount: 1,
        duplicateCount: 2,
    });
    assert.deepEqual(calls, [['add', second]]);
    assert.match(notifications[0].message, /2 duplicates skipped/);
});

test('bulk selection, filtering, removal, header, and preset operations are explicit commands', () => {
    const first = input(1);
    const second = input(2);
    const { calls, service, state } = harness([first, second]);

    service.setQueueFilter('Source');
    service.selectAllVisibleSources();
    const header = service.applyRequestHeaderToSelected({
        key: 'Authorization',
        value: 'Bearer test',
    });
    const preset = service.applyPresetToSelected({
        name: 'Policy',
        auth: { headers: [], queryParams: [] },
    });
    const removed = service.removeSelectedSources();

    assert.equal(state.selectedStreamInputIds.size, 2);
    assert.deepEqual(header, { status: 'completed', updatedCount: 2 });
    assert.deepEqual(preset, { status: 'completed', updatedCount: 2 });
    assert.deepEqual(removed, { status: 'completed', removedCount: 2 });
    assert.equal(calls[0][0], 'queue-filter');
    assert.deepEqual(calls[1], ['bulk-select', [1, 2]]);
    assert.equal(calls[2][0], 'bulk-patch');
    assert.equal(calls[3][0], 'bulk-patch');
    assert.deepEqual(calls[4], ['bulk-remove', [1, 2]]);
});

test('bulk retry targets only selected blocked sources', () => {
    const readySource = input(1);
    const blockedSource = input(2, { tier0: { status: 503 } });
    const unselectedBlocked = input(3, { tier0: { status: 404 } });
    const { calls, service } = harness([
        readySource,
        blockedSource,
        unselectedBlocked,
    ]);

    service.toggleBulkSourceSelection(1);
    service.toggleBulkSourceSelection(2);
    calls.length = 0;
    const result = service.retrySelectedSources();

    assert.deepEqual(result, { status: 'completed', retriedCount: 1 });
    assert.deepEqual(calls, [
        ['update', 2, 'tier0', null],
        ['update', 2, 'isTier0AnalysisLoading', true],
    ]);
});

test('library import is preview-first and replace applies one explicit transaction', async () => {
    const { calls, service, state, uiState } = harness([input(1)]);

    const imported = await service.importLibraryWorkspace({
        name: 'Imported',
    });
    assert.equal(imported.status, 'completed');
    assert.equal(uiState.streamLibraryWorkflow.status, 'previewing');
    assert.equal(state.streamInputs.length, 1);

    calls.length = 0;
    const applied = await service.applyLibraryWorkspace('replace');

    assert.deepEqual(applied, { status: 'completed', sourceCount: 1 });
    assert.equal(state.streamInputs[0].id, 3);
    assert.equal(
        uiState.stagingBaseline.revision,
        createStagingConfigurationRevision(state.streamInputs)
    );
    assert.equal(calls[0][0], 'persist');
    assert.equal(calls[1][0], 'replace');
    assert.deepEqual(calls[2], ['workspace-name', 'Imported']);
    assert.equal(calls[3][0], 'library-workflow');
});

test('library search, add, export, delete, and recovery remain application commands', () => {
    const { calls, service } = harness();

    service.setLibraryTab('examples');
    service.setLibrarySearch('dash');
    service.exportLibraryWorkspace('Operations');
    service.deleteLibraryItem('workspaces', 'Operations');
    service.restoreLastDeletedLibraryWorkspace();
    service.closeLibrary();

    assert.deepEqual(calls, [
        ['library-tab', 'examples'],
        ['library-search', 'dash'],
        ['export', 'Operations'],
        ['delete-library', 'workspaces', 'Operations'],
        [
            'library-workflow',
            {
                status: 'idle',
                notice: 'Operations moved to recoverable deletion.',
                error: '',
            },
        ],
        [
            'library-workflow',
            {
                status: 'idle',
                notice: 'Last deleted workspace restored.',
                error: '',
            },
        ],
        ['library-open', false],
        ['library-workflow-reset'],
    ]);
});
