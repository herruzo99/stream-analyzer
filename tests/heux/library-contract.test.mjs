import assert from 'node:assert/strict';
import test from 'node:test';
import {
    createLibraryEnvelope,
    createWorkspaceExport,
    LIBRARY_SCHEMA_VERSION,
    mergeWorkspaceInputs,
    parseLibraryEnvelope,
    previewWorkspaceImport,
    restoreLastDeletedLibraryRecord,
    softDeleteLibraryRecord,
} from '../../src/features/streamInput/application/library-contract.js';

const privateWorkspace = {
    name: 'Private source',
    inputs: [
        {
            name: 'Live',
            url: 'https://user:pass@example.test/live.mpd?token=secret&lang=en',
            auth: {
                headers: [{ name: 'Authorization', value: 'Bearer secret' }],
            },
            drmAuth: { licenseServerUrl: 'https://license.test/private' },
        },
    ],
};

test('AT-F003-01 migrates legacy collections into bounded versioned envelopes', () => {
    const { envelope, migrated } = parseLibraryEnvelope(
        'workspaces',
        JSON.stringify([privateWorkspace])
    );
    assert.equal(migrated, true);
    assert.equal(envelope.version, LIBRARY_SCHEMA_VERSION);
    assert.equal(envelope.records.length, 1);
    assert.equal(
        envelope.records[0].inputs[0].url,
        'https://example.test/live.mpd?lang=en'
    );
    assert.deepEqual(envelope.records[0].inputs[0].privacy.fields, [
        'auth',
        'drmAuth',
        'url.credentials',
        'url.query.token',
    ]);
    assert.doesNotMatch(
        JSON.stringify(envelope),
        /secret|Bearer|license\.test/
    );
    const normalizedAgain = createLibraryEnvelope(
        'workspaces',
        envelope.records
    );
    assert.deepEqual(
        normalizedAgain.records[0].inputs[0].privacy,
        envelope.records[0].inputs[0].privacy
    );
    assert.deepEqual(
        normalizedAgain.records[0].privacy,
        envelope.records[0].privacy
    );
});

test('AT-F003-02 rejects corrupt, future, hostile, oversized, and overfull records', () => {
    assert.throws(() => parseLibraryEnvelope('workspaces', '{bad'), /JSON/);
    assert.throws(
        () => previewWorkspaceImport('{"token":"do-not-echo"'),
        (error) => {
            assert.equal(error.message, 'Workspace import is not valid JSON.');
            assert.doesNotMatch(error.message, /token|do-not-echo/);
            return true;
        }
    );
    assert.throws(
        () =>
            parseLibraryEnvelope('workspaces', {
                version: 99,
                type: 'stream-analyzer-library-collection',
                kind: 'workspaces',
                records: [],
                tombstones: [],
            }),
        /Unsupported/
    );
    assert.throws(
        () =>
            createLibraryEnvelope('workspaces', [
                {
                    name: 'Too many',
                    inputs: Array.from({ length: 51 }, () => ({
                        url: 'https://example.test/a.mpd',
                    })),
                },
            ]),
        /50 inputs/
    );
    assert.throws(
        () => previewWorkspaceImport('x'.repeat(1024 * 1024 + 1)),
        /1 MiB/
    );
    const hostile = JSON.parse(
        '{"name":"Unsafe","inputs":[],"__proto__":{"polluted":true}}'
    );
    assert.throws(
        () => createLibraryEnvelope('workspaces', [hostile]),
        /unsafe key/
    );
});

test('AT-F003-03 previews imports and applies explicit duplicate-safe merge or replace data', () => {
    const preview = previewWorkspaceImport(
        JSON.stringify({
            version: 1,
            type: 'stream-analyzer-workspace',
            data: privateWorkspace,
        }),
        ['Private source']
    );
    assert.equal(preview.workspace.name, 'Private source (Imported 1)');
    assert.equal(preview.summary.redactedInputCount, 1);
    const merged = mergeWorkspaceInputs(
        [{ url: 'https://example.test/a.mpd' }],
        [
            { url: 'https://example.test/a.mpd' },
            { url: 'https://example.test/b.mpd' },
        ]
    );
    assert.deepEqual(
        merged.map(({ url }) => url),
        ['https://example.test/a.mpd', 'https://example.test/b.mpd']
    );
});

test('AT-F003-04 makes deletion recoverable and exports only normalized version-2 data', () => {
    const initial = createLibraryEnvelope('workspaces', [privateWorkspace]);
    const deleted = softDeleteLibraryRecord(
        'workspaces',
        initial,
        ({ name }) => name === 'Private source'
    );
    assert.equal(deleted.records.length, 0);
    assert.equal(deleted.tombstones.length, 1);
    const restored = restoreLastDeletedLibraryRecord('workspaces', deleted);
    assert.equal(restored.records[0].name, 'Private source');
    const exported = createWorkspaceExport(restored.records[0]);
    assert.equal(exported.version, LIBRARY_SCHEMA_VERSION);
    assert.doesNotMatch(
        JSON.stringify(exported),
        /secret|Bearer|license\.test/
    );
});
