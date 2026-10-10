import assert from 'node:assert/strict';
import test from 'node:test';
import {
    NETWORK_CONTRACT_LIMITS,
    createNetworkModel,
    createRedactedHar,
    projectNetworkEvent,
    redactNetworkHeaders,
    redactNetworkUrl,
} from '../../src/features/networkAnalysis/application/network-contract.js';

const event = (overrides = {}) => ({
    id: 'request-1',
    url: 'https://user:pass@example.test/video.m4s?token=secret&quality=hd#part',
    resourceType: 'video',
    streamId: 7,
    request: {
        method: 'GET',
        headers: { Authorization: 'Bearer secret', Range: 'bytes=0-99' },
    },
    response: {
        status: 200,
        statusText: 'OK',
        headers: { 'Set-Cookie': 'sid=secret', 'Content-Type': 'video/mp4' },
        contentLength: 100,
        contentType: 'video/mp4',
        body: new Uint8Array(5000).buffer,
    },
    timing: { startTime: 100, endTime: 120, duration: 20 },
    ...overrides,
});

test('AT-F024-01 central redaction removes URL credentials and private headers', () => {
    const url = redactNetworkUrl(event().url);
    assert.equal(
        url,
        'https://example.test/video.m4s?token=%5Bredacted%5D&quality=hd'
    );
    const headers = redactNetworkHeaders(event().request.headers);
    assert.deepEqual(headers, [
        { name: 'Authorization', value: '[redacted]', redacted: true },
        { name: 'Range', value: 'bytes=0-99', redacted: false },
    ]);
    assert.doesNotMatch(`${url}\n${JSON.stringify(headers)}`, /pass|secret/);
});

test('AT-F024-02 projection has stable identity, finite timing and bounded body rows', () => {
    const first = projectNetworkEvent(event());
    const updated = projectNetworkEvent(
        event({ response: { ...event().response, status: 206 } })
    );
    assert.equal(first.id, updated.id);
    assert.match(first.id, /^sa-network:v1:/);
    assert.equal(first.response.displayedBytes, 4096);
    assert.equal(first.response.rows.length, 256);
    assert.equal(first.response.truncated, true);
    assert.equal(first.response.rows[0].address, '0x00000000');

    const malformed = projectNetworkEvent(
        event({ timing: { startTime: NaN, endTime: -10, duration: Infinity } })
    );
    assert.deepEqual(malformed.timing, {
        startTime: 0,
        endTime: 0,
        duration: 0,
    });
});

test('AT-F024-03 model distinguishes empty, filtered-empty and ready selection', () => {
    const base = {
        events: [],
        selectedEventId: null,
        filters: { type: 'all', search: '' },
        visibleStreamIds: new Set([7]),
    };
    assert.equal(createNetworkModel(base).state, 'empty');
    assert.equal(
        createNetworkModel({
            ...base,
            events: [event()],
            filters: { type: 'audio', search: '' },
        }).state,
        'filtered-empty'
    );
    const ready = createNetworkModel({
        ...base,
        events: [event()],
        selectedEventId: 'request-1',
    });
    assert.equal(ready.state, 'ready');
    assert.equal(ready.selected?.sourceId, 'request-1');
    assert.equal(ready.summary.total, 1);
    assert.equal(ready.rows[0].widthPercent, 100);

    const unmanaged = createNetworkModel({
        ...base,
        events: [event({ id: 'unmanaged', streamId: null })],
    });
    assert.equal(unmanaged.rows.length, 1);
    assert.equal(unmanaged.rows[0].streamId, null);
});

test('AT-F024-04 redacted HAR and record bounds cannot reintroduce secrets', () => {
    const events = Array.from(
        { length: NETWORK_CONTRACT_LIMITS.records + 20 },
        (_, index) =>
            event({
                id: `request-${index}`,
                timing: { startTime: index, endTime: index + 1, duration: 1 },
            })
    );
    const model = createNetworkModel({
        events,
        selectedEventId: null,
        filters: { type: 'all', search: '' },
        visibleStreamIds: new Set([7]),
    });
    assert.equal(model.rows.length, NETWORK_CONTRACT_LIMITS.records);
    const har = createRedactedHar(model, [
        {
            id: 7,
            originalUrl:
                'https://user:pass@example.test/manifest.mpd?sig=secret',
        },
    ]);
    const serialized = JSON.stringify(har);
    assert.doesNotMatch(serialized, /Bearer|sid=|user|pass|secret/);
    assert.match(serialized, /redacted/);
    assert.equal(har.log.entries.length, NETWORK_CONTRACT_LIMITS.records);
});
