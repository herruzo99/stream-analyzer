import assert from 'node:assert/strict';
import test from 'node:test';
import {
    MANIFEST_UPDATES_LIMITS,
    createManifestUpdatesModel,
} from '../../src/features/manifestUpdates/application/manifest-updates-contract.js';

function update(id, count = 1) {
    return {
        id,
        sequenceNumber: count,
        timestamp: '12:00:00',
        rawManifest: '#'.repeat(MANIFEST_UPDATES_LIMITS.copyCharacters + 10),
        changes: { additions: 1, removals: 2, modifications: 3 },
        diffModel: Array.from(
            { length: MANIFEST_UPDATES_LIMITS.diffRows + 2 },
            (_, index) => ({
                type: index % 2 ? 'removed' : 'added',
                indentation: '',
                content: `<hostile-${index}>${'x'.repeat(600)}`,
            })
        ),
    };
}

function stream(overrides = {}) {
    return {
        id: 7,
        name: '<Hostile stream>',
        protocol: 'dash',
        manifest: { type: 'dynamic' },
        isPolling: true,
        smartPollingInterval: 1000,
        manifestUpdates: [update('latest', 2), update('older', 1)],
        activeManifestUpdateId: 'older',
        mediaPlaylists: new Map(),
        ...overrides,
    };
}

test('AT-F026-01 projects selected DASH and HLS histories with source identity', () => {
    const dash = createManifestUpdatesModel(stream(), { now: 10_000 });
    assert.equal(dash.streamId, 7);
    assert.equal(dash.selected.id, 'older');

    const hlsUpdate = update('variant-update');
    const hls = createManifestUpdatesModel(
        stream({
            protocol: 'hls',
            activeMediaPlaylistId: 'variant-a',
            mediaPlaylists: new Map([
                [
                    'variant-a',
                    { updates: [hlsUpdate], activeUpdateId: hlsUpdate.id },
                ],
            ]),
        })
    );
    assert.equal(hls.selected.id, 'variant-update');

    const direct = createManifestUpdatesModel(
        stream({
            protocol: 'hls',
            mediaPlaylists: new Map([
                [
                    'https://media.example/live.m3u8',
                    { updates: [hlsUpdate], activeUpdateId: hlsUpdate.id },
                ],
            ]),
        })
    );
    assert.equal(direct.selected.id, 'variant-update');
});

test('AT-F026-02 bounds history, diff rows, lines and copied manifest before projection', () => {
    const updates = Array.from({ length: 105 }, (_, index) =>
        update(`update-${index}`, index)
    );
    const model = createManifestUpdatesModel(
        stream({ manifestUpdates: updates, activeManifestUpdateId: null })
    );
    assert.equal(model.updates.length, MANIFEST_UPDATES_LIMITS.history);
    assert.equal(model.historyTruncated, true);
    assert.equal(model.selected.diffRows.length, MANIFEST_UPDATES_LIMITS.diffRows);
    assert.equal(model.selected.diffTruncated, true);
    assert.equal(
        model.selected.rawManifest.length,
        MANIFEST_UPDATES_LIMITS.copyCharacters
    );
    assert.ok(
        model.selected.diffRows.every(
            (row) => row.text.length <= MANIFEST_UPDATES_LIMITS.lineCharacters
        )
    );
});

test('AT-F026-03 distinguishes active, retrying, offline, stale, canceled and VOD states', () => {
    const now = 100_000;
    const state = (pollingStatus, overrides = {}) =>
        createManifestUpdatesModel(stream({ pollingStatus, ...overrides }), {
            now,
        }).status.state;
    assert.equal(state({ state: 'active', lastSuccessAt: now }), 'active');
    assert.equal(state({ state: 'retrying', retryCount: 2 }), 'retrying');
    assert.equal(state({ state: 'offline' }), 'offline');
    assert.equal(
        state({ state: 'active', lastSuccessAt: 1 }),
        'stale'
    );
    assert.equal(
        state({ state: 'canceled' }, { isPolling: false }),
        'canceled'
    );
    assert.equal(
        state({ state: 'active' }, { manifest: { type: 'static' } }),
        'vod'
    );
});

test('AT-F026-04 keeps hostile text literal and finite without HTML generation', () => {
    const model = createManifestUpdatesModel(stream());
    assert.match(model.streamName, /^<Hostile stream>$/);
    assert.match(model.updates[0].diffRows[0].text, /^<hostile-0>/);
    assert.deepEqual(
        new Set(model.updates[0].diffRows.map((row) => row.marker)),
        new Set(['+', '-'])
    );
});
