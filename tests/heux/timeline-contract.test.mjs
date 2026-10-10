import assert from 'node:assert/strict';
import test from 'node:test';
import {
    TIMELINE_CONTRACT_LIMITS,
    buildTimelineModel,
} from '../../src/features/timeline/application/timeline-contract.js';

function fixtureStream(overrides = {}) {
    return {
        id: 'stream-a',
        protocol: 'dash',
        activeManifestUpdateId: 'update-1',
        manifest: { type: 'dynamic' },
        ...overrides,
    };
}

function fixtureProjection() {
    return {
        isLive: true,
        chartBounds: { min: 10, max: 30 },
        driftHistory: [{ timestamp: 1, drift: 2.5 }],
        tracks: [
            {
                id: 'video',
                label: 'Video',
                items: [
                    {
                        id: 'segment-1',
                        type: 'segment',
                        label: 'Segment 1',
                        start: 12,
                        end: 16,
                        duration: 4,
                    },
                    {
                        id: 'segment-2',
                        type: 'segment',
                        label: 'Segment 2',
                        start: 16,
                        end: 20,
                        duration: 4,
                    },
                ],
            },
        ],
    };
}

test('AT-F023-01 creates deterministic versioned bounded timing identities', () => {
    const stream = fixtureStream();
    const projection = fixtureProjection();
    const first = buildTimelineModel(stream, projection);
    const second = buildTimelineModel(stream, projection);

    assert.equal(first.status, 'ready');
    assert.equal(first.rows.length, 2);
    assert.deepEqual(
        first.rows.map(({ id }) => id),
        second.rows.map(({ id }) => id)
    );
    assert.match(first.rows[0].id, /^sa-timeline:v1:[a-z0-9]+:[a-z0-9]+$/);
    assert.deepEqual(first.bounds, { min: 10, max: 30, duration: 20 });
    assert.equal(first.drift, 2.5);
    assert.equal(TIMELINE_CONTRACT_LIMITS.version, 1);
});

test('AT-F023-02 rejects stale generation selection and labels connection truth', () => {
    const projection = fixtureProjection();
    const initial = buildTimelineModel(fixtureStream(), projection);
    const selected = {
        _timelineContractId: initial.rows[0].id,
        _timelineGeneration: initial.generation,
    };
    const current = buildTimelineModel(fixtureStream(), projection, {
        selected,
        connectionState: 'current',
    });
    const reconnected = buildTimelineModel(
        fixtureStream({ activeManifestUpdateId: 'update-2' }),
        projection,
        { selected, connectionState: 'reconnecting' }
    );

    assert.equal(current.selectedId, initial.rows[0].id);
    assert.equal(reconnected.selectedId, null);
    assert.notEqual(reconnected.generation, initial.generation);
    assert.equal(reconnected.connectionState, 'reconnecting');
    assert.equal(
        buildTimelineModel(
            fixtureStream({ wasStoppedByInactivity: true }),
            projection
        ).connectionState,
        'stale'
    );
});

test('AT-F023-03 keeps empty/error/live states explicit and values finite', () => {
    const empty = buildTimelineModel(null, null);
    const error = buildTimelineModel(fixtureStream(), null, {
        connectionState: 'error',
    });
    const malformed = buildTimelineModel(fixtureStream(), {
        isLive: true,
        chartBounds: { min: Number.NaN, max: Number.POSITIVE_INFINITY },
        driftHistory: [{ drift: Number.NaN }],
        tracks: [
            {
                id: 'video',
                items: [
                    {
                        id: 'bad',
                        start: Number.NaN,
                        end: Number.POSITIVE_INFINITY,
                    },
                ],
            },
        ],
    });

    assert.equal(empty.status, 'empty');
    assert.equal(error.status, 'error');
    assert.equal(error.connectionState, 'error');
    assert.equal(malformed.status, 'ready');
    assert.ok(Number.isFinite(malformed.rows[0].start));
    assert.ok(Number.isFinite(malformed.rows[0].end));
    assert.equal(malformed.drift, null);
});

test('AT-F023-04 caps tracks/items and strips unsafe display content', () => {
    const oversized = Array.from(
        { length: TIMELINE_CONTRACT_LIMITS.maxItems + 10 },
        (_, index) => ({
            id: `item-${index}`,
            label:
                '<img src=x onerror=alert(1)>\n' +
                'x'.repeat(TIMELINE_CONTRACT_LIMITS.maxLabelLength + 20),
            type: 'event',
            start: index,
            end: index + 1,
            duration: 1,
        })
    );
    const model = buildTimelineModel(fixtureStream(), {
        chartBounds: { min: 0, max: oversized.length },
        tracks: [{ id: 'video', label: 'Video\nTrack', items: oversized }],
    });

    assert.equal(model.rows.length, TIMELINE_CONTRACT_LIMITS.maxItems);
    assert.equal(model.truncated, true);
    assert.ok(
        model.rows.every(
            ({ label }) =>
                label.length <= TIMELINE_CONTRACT_LIMITS.maxLabelLength &&
                !label.includes('\n')
        )
    );
    assert.equal(model.groups[0].label, 'Video Track');
    assert.ok(!model.rows[0].id.includes('onerror'));
});
