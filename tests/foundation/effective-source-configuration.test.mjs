import assert from 'node:assert/strict';
import test from 'node:test';
import {
    createEffectiveWorkerInput,
    createEffectiveWorkerInputs,
    createEffectiveSourceFingerprint,
    deriveEffectiveSourceConfiguration,
    EFFECTIVE_SOURCE_CONFIGURATION_VERSION,
    projectEffectiveConfigurationSnapshot,
    projectPersistableEffectiveSource,
    projectPrivacyRedactedConfigurationSnapshot,
    projectShareableEffectiveSource,
} from '../../src/features/streamInput/application/effective-source-configuration.js';
import { projectStagingState } from '../../src/features/streamInput/application/staging-contract.js';
import { createLibraryEnvelope } from '../../src/features/streamInput/application/library-contract.js';

function source(overrides = {}) {
    return {
        id: 7,
        name: 'Primary',
        url: 'https://media.example.test/manifest.mpd',
        file: null,
        auth: {
            headers: [{ id: 1, key: 'Authorization', value: 'Bearer test' }],
            queryParams: [{ id: 2, key: 'region', value: 'eu' }],
        },
        drmAuth: {
            licenseServerUrl: {
                'com.widevine.alpha': 'https://license.example.test/wv',
            },
            serverCertificate: {
                'com.widevine.alpha': 'https://license.example.test/cert',
            },
            headers: [{ id: 3, key: 'X-License', value: 'test' }],
            queryParams: [],
        },
        detectedDrm: ['Widevine', 'PlayReady', 'Widevine'],
        tier0: {
            status: 200,
            protocol: 'DASH',
            type: 'LIVE',
            isEncrypted: true,
            isLowLatency: true,
            server: 'edge.example.test',
            duration: 120,
        },
        isTier0AnalysisLoading: false,
        ...overrides,
    };
}

test('effective source separates detection, configured policy, and readiness', () => {
    const effective = deriveEffectiveSourceConfiguration(source());

    assert.equal(effective.version, EFFECTIVE_SOURCE_CONFIGURATION_VERSION);
    assert.deepEqual(effective.readiness, {
        state: 'ready',
        label: 'Ready',
    });
    assert.deepEqual(effective.detection.drmSystems, ['Widevine', 'PlayReady']);
    assert.equal(effective.contentProtection.detectedSystemCount, 2);
    assert.equal(effective.contentProtection.configuredSystemCount, 1);
    assert.deepEqual(effective.contentProtection.configuredSystems, [
        { keySystem: 'com.widevine.alpha', label: 'Widevine' },
    ]);
    assert.equal(effective.review.requestHeaderCount, 1);
    assert.equal(effective.review.requestQueryParamCount, 1);
    assert.equal(effective.review.licenseHeaderCount, 1);
    assert.equal(effective.detection.responseLabel, 'HTTP 200');
});

test('effective source supplies complete defaults without mutating the draft', async () => {
    const draft = source({ auth: undefined, drmAuth: undefined });
    const effective = deriveEffectiveSourceConfiguration(draft);
    const worker = await createEffectiveWorkerInput(effective, {
        isDebug: true,
    });

    assert.deepEqual(effective.requestPolicy.headers, []);
    assert.deepEqual(effective.contentProtection.licenseHeaders, []);
    assert.deepEqual(worker.auth, { headers: [], queryParams: [] });
    assert.deepEqual(worker.drmAuth, {
        licenseServerUrl: null,
        serverCertificate: null,
        headers: [],
        queryParams: [],
    });
    assert.equal(worker.isDebug, true);
    assert.equal(draft.auth, undefined);
    assert.equal(draft.drmAuth, undefined);
});

test('effective fingerprints ignore labels but preserve executable policy differences', () => {
    const base = source();
    assert.equal(
        createEffectiveSourceFingerprint(base),
        createEffectiveSourceFingerprint({ ...base, name: 'Renamed' })
    );
    assert.notEqual(
        createEffectiveSourceFingerprint(base),
        createEffectiveSourceFingerprint({
            ...base,
            auth: {
                ...base.auth,
                headers: [
                    { id: 1, key: 'Authorization', value: 'Bearer changed' },
                ],
            },
        })
    );
});

test('worker transport materializes certificate files and never mutates source policy', async () => {
    const OriginalFile = globalThis.File;
    class TestFile {
        constructor(name, bytes) {
            this.name = name;
            this.bytes = bytes;
        }

        async arrayBuffer() {
            return Uint8Array.from(this.bytes).buffer;
        }
    }
    globalThis.File = TestFile;

    try {
        const certificate = new TestFile('widevine.der', [1, 2, 3]);
        const draft = source({
            drmAuth: {
                licenseServerUrl: {
                    'com.widevine.alpha': 'https://license.example.test/wv',
                },
                serverCertificate: {
                    'com.widevine.alpha': certificate,
                },
                headers: [],
                queryParams: [],
            },
        });
        const [fromDraft] = await createEffectiveWorkerInputs([draft]);
        const fromEffective = await createEffectiveWorkerInput(
            deriveEffectiveSourceConfiguration(draft)
        );

        assert.deepEqual(
            new Uint8Array(
                fromDraft.drmAuth.serverCertificate['com.widevine.alpha']
            ),
            Uint8Array.from([1, 2, 3])
        );
        assert.deepEqual(fromDraft, fromEffective);
        assert.equal(
            draft.drmAuth.serverCertificate['com.widevine.alpha'],
            certificate
        );
        assert.notEqual(fromDraft.auth, draft.auth);
        assert.notEqual(fromDraft.drmAuth, draft.drmAuth);
    } finally {
        if (OriginalFile === undefined) delete globalThis.File;
        else globalThis.File = OriginalFile;
    }
});

test('staging projection carries the same effective model used for execution', () => {
    const input = source();
    const staging = projectStagingState({
        streamInputs: [input],
        activeStreamInputId: input.id,
        loadedWorkspaceName: null,
    });

    assert.equal(staging.sources[0].input, input);
    assert.equal(staging.sources[0].selected, true);
    assert.equal(staging.sources[0].effective.review.requestHeaderCount, 1);
    assert.equal(
        staging.sources[0].status,
        staging.sources[0].effective.readiness
    );
    assert.deepEqual(staging.analyzableInputs, [input]);
});

test('staging projection identifies executable duplicates while ignoring labels and transient ids', () => {
    const first = source({ id: 1, name: 'First' });
    const duplicate = source({
        id: 2,
        name: 'Renamed',
        auth: {
            headers: [{ id: 999, key: 'Authorization', value: 'Bearer test' }],
            queryParams: [{ id: 998, key: 'region', value: 'eu' }],
        },
    });
    const staging = projectStagingState({
        streamInputs: [first, duplicate],
        activeStreamInputId: 1,
    });

    assert.equal(staging.duplicateGroupCount, 1);
    assert.equal(staging.duplicateSourceCount, 1);
    assert.equal(staging.sources[0].isDuplicate, true);
    assert.equal(staging.sources[1].duplicateOf, 1);
});

test('persistence and share projections originate from the effective model', () => {
    const input = source({
        url: 'https://user:pass@media.example.test/manifest.mpd?token=secret&lang=en',
    });
    const effective = deriveEffectiveSourceConfiguration(input);
    const persisted = projectPersistableEffectiveSource(effective);
    const shared = projectShareableEffectiveSource(effective);

    assert.equal(persisted.url, input.url);
    assert.equal(
        persisted.effectiveSourceVersion,
        EFFECTIVE_SOURCE_CONFIGURATION_VERSION
    );
    assert.deepEqual(persisted.auth, input.auth);
    assert.notEqual(persisted.auth, input.auth);
    assert.equal(shared.url, 'https://media.example.test/manifest.mpd?lang=en');
    assert.deepEqual(shared.privacy, {
        status: 'redacted',
        fields: ['url.credentials', 'url.query.token'],
    });
    assert.doesNotMatch(JSON.stringify(shared), /pass|secret/);
    assert.equal(projectShareableEffectiveSource(source({ url: null })), null);
});

test('Review, worker, local persistence, library restore, and share agree after explicit privacy projection', async () => {
    const input = source({
        url: 'https://user:pass@media.example.test/manifest.mpd?token=secret&lang=en',
    });
    const effective = deriveEffectiveSourceConfiguration(input);
    const review = projectEffectiveConfigurationSnapshot(effective);
    const worker = await createEffectiveWorkerInput(effective);
    const persisted = projectPersistableEffectiveSource(effective);
    const library = createLibraryEnvelope('workspaces', [
        { name: 'Operations', inputs: [persisted] },
    ]).records[0].inputs[0];
    const shared = projectShareableEffectiveSource(effective);

    assert.deepEqual(projectEffectiveConfigurationSnapshot(worker), review);
    assert.deepEqual(projectEffectiveConfigurationSnapshot(persisted), review);
    assert.deepEqual(
        projectEffectiveConfigurationSnapshot(library),
        projectPrivacyRedactedConfigurationSnapshot(effective)
    );
    assert.deepEqual(
        projectEffectiveConfigurationSnapshot(shared),
        projectPrivacyRedactedConfigurationSnapshot(effective)
    );
});
