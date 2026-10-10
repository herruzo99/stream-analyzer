import assert from 'node:assert/strict';
import test from 'node:test';
import {
    commitSettings,
    createSettingsUpdate,
    decodeSettingsRecord,
    encodeSettingsRecord,
    projectHealthState,
    SETTINGS_DEFAULTS,
    SETTINGS_PRESETS,
    SETTINGS_SCHEMA_VERSION,
} from '../../src/features/settings/application/settings-contract.js';

test('AT-F054-01 versions current records and migrates bounded legacy settings', () => {
    const legacy = decodeSettingsRecord(
        JSON.stringify({ networkLogLimit: 750, segmentCacheLimit: 75 })
    );
    assert.equal(legacy.state, 'migrated');
    assert.equal(legacy.settings.networkLogLimit, 750);
    assert.equal(legacy.settings.segmentCacheLimit, 75);
    assert.equal(
        legacy.settings.eventLogLimit,
        SETTINGS_DEFAULTS.eventLogLimit
    );

    const encoded = encodeSettingsRecord(legacy.settings);
    assert.equal(
        JSON.parse(encoded.serialized).version,
        SETTINGS_SCHEMA_VERSION
    );
    assert.equal(decodeSettingsRecord(encoded.serialized).state, 'loaded');
});

test('AT-F054-02 rejects corrupt, future, and out-of-bounds records', () => {
    assert.equal(decodeSettingsRecord('{broken').state, 'recovered');
    assert.equal(
        decodeSettingsRecord(
            JSON.stringify({ version: 99, settings: SETTINGS_DEFAULTS })
        ).state,
        'recovered'
    );
    assert.equal(
        decodeSettingsRecord(
            JSON.stringify({ networkLogLimit: Number.MAX_SAFE_INTEGER })
        ).state,
        'recovered'
    );
    assert.equal(
        createSettingsUpdate(SETTINGS_DEFAULTS, {
            segmentCacheLimit: -1,
        }).error,
        'segmentCacheLimit must be an integer from 10 to 500.'
    );
});

test('AT-F054-03 commits once and preserves the last valid schema on failure', () => {
    const writes = [];
    const success = commitSettings(
        { setItem: (...args) => writes.push(args) },
        'settings',
        SETTINGS_DEFAULTS,
        { ...SETTINGS_DEFAULTS, ...SETTINGS_PRESETS.high }
    );
    assert.equal(success.ok, true);
    assert.equal(writes.length, 1);
    assert.equal(success.settings.networkLogLimit, 1000);

    const failure = commitSettings(
        {
            setItem() {
                throw new Error('quota');
            },
        },
        'settings',
        success.settings,
        SETTINGS_DEFAULTS
    );
    assert.equal(failure.ok, false);
    assert.deepEqual(failure.settings, success.settings);
    assert.match(failure.error, /last valid values remain active/);
});

test('AT-F054-04 projects explicit degraded health without private diagnostics', () => {
    assert.deepEqual(projectHealthState({ status: 'nominal' }, {}), {
        status: 'nominal',
        message: null,
        browserMetricsAvailable: true,
        browserMessage: null,
    });
    const degraded = projectHealthState(
        { status: 'critical', message: 'Application data exceeds 800MB.' },
        null
    );
    assert.equal(degraded.status, 'critical');
    assert.equal(degraded.browserMetricsAvailable, false);
    assert.match(degraded.browserMessage, /unavailable/);
    assert.doesNotMatch(JSON.stringify(degraded), /url|credential|token|auth/i);
});
