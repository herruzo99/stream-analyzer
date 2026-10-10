import assert from 'node:assert/strict';
import test from 'node:test';
import {
    SEGMENT_EXPLORER_CONTRACT_LIMITS,
    buildSegmentExplorerModel,
} from '../../src/features/segmentExplorer/application/segment-explorer-contract.js';

function projection(segments, overrides = {}) {
    return {
        tracks: [
            {
                id: 'video-main',
                label: 'Video main',
                bandwidth: 1200000,
                segments,
            },
        ],
        timeBounds: { start: 0, end: 20, duration: 20 },
        isLive: false,
        ...overrides,
    };
}

function segment(overrides = {}) {
    return {
        timelineId: '1-segment',
        uniqueId: 'https://private.example/segment.m4s?token=secret',
        number: 1,
        type: 'Media',
        start: 0,
        durationSec: 4,
        ...overrides,
    };
}

test('AT-F021-01 creates stable versioned IDs without exposing source URLs', () => {
    const stream = { id: 'stream-1' };
    const first = buildSegmentExplorerModel(stream, projection([segment()]));
    const second = buildSegmentExplorerModel(stream, projection([segment()]));

    assert.equal(first.status, 'ready');
    assert.equal(first.rows[0].id, second.rows[0].id);
    assert.match(first.rows[0].id, /^sa-inspection:v1:/);
    assert.doesNotMatch(first.rows[0].id, /private|token|segment\\.m4s/);
});

test('AT-F021-02 distinguishes stale, missing, fetching, partial, ready and error', () => {
    const states = new Map([
        ['missing', undefined],
        ['fetching', { status: -1 }],
        ['partial', { status: 200 }],
        ['ready', { status: 200, parsedData: { format: 'isobmff' } }],
        ['error', { status: 503 }],
    ]);
    const segments = Array.from(states.keys(), (state, index) =>
        segment({
            timelineId: state,
            uniqueId: state,
            number: index,
            _isStale: state === 'missing',
        })
    );
    const model = buildSegmentExplorerModel(
        { id: 'stream-1' },
        projection(segments),
        { cacheEntry: (id) => states.get(id) }
    );

    assert.deepEqual(
        model.rows.map((row) => row.state),
        ['missing', 'fetching', 'partial', 'ready', 'error']
    );
    assert.equal(model.rows[0].stale, true);
});

test('AT-F021-03 synchronizes selection, representation and time context', () => {
    const segments = [
        segment({ timelineId: 'one', uniqueId: 'one', start: 2 }),
        segment({ timelineId: 'two', uniqueId: 'two', number: 2, start: 12 }),
    ];
    const model = buildSegmentExplorerModel(
        { id: 'stream-1' },
        projection(segments),
        {
            activeRepresentationId: 'video-main',
            selected: { uniqueId: 'two', repId: 'video-main' },
            targetTime: new Date(11000),
        }
    );

    assert.equal(model.activeRepresentationId, 'video-main');
    assert.equal(model.selectedId, model.rows[1].id);
    assert.equal(model.targetIndex, 1);
});

test('AT-F021-04 bounds rows and distinguishes empty from unavailable', () => {
    assert.equal(buildSegmentExplorerModel(null, null).status, 'empty');
    assert.equal(
        buildSegmentExplorerModel({ id: 'stream-1' }, null).status,
        'error'
    );
    const segments = Array.from(
        { length: SEGMENT_EXPLORER_CONTRACT_LIMITS.maxSegments + 1 },
        (_, index) =>
            segment({
                timelineId: String(index),
                uniqueId: String(index),
                number: index,
            })
    );
    const bounded = buildSegmentExplorerModel(
        { id: 'stream-1' },
        projection(segments)
    );
    assert.equal(
        bounded.rows.length,
        SEGMENT_EXPLORER_CONTRACT_LIMITS.maxSegments
    );
    assert.equal(bounded.truncated, true);
});
