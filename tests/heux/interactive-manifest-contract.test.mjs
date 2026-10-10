import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInteractiveManifestModel } from '../../src/features/interactiveManifest/application/interactive-manifest-contract.js';

function dashStream(manifest) {
    return {
        id: 'dash-1',
        protocol: 'dash',
        rawManifest: '<MPD/>',
        manifest: { serializedManifest: manifest },
    };
}

test('AT-F020 contract builds bounded stable semantic DASH nodes', () => {
    const representation = {
        ':@': { id: 'video-main', bandwidth: '1200000' },
        BaseURL: 'video-$Number$.m4s',
    };
    const first = buildInteractiveManifestModel(
        dashStream({ Period: { AdaptationSet: { Representation: [representation] } } })
    );
    const second = buildInteractiveManifestModel(
        dashStream({
            Period: {
                AdaptationSet: {
                    Representation: [
                        { ':@': { id: 'audio-main' } },
                        representation,
                    ],
                },
            },
        })
    );
    const firstId = first.rows.find((row) => row.id.includes('video-main')).id;
    const secondId = second.rows.find((row) => row.id.includes('video-main')).id;

    assert.equal(first.status, 'ready');
    assert.equal(firstId, secondId);
    assert.ok(first.rows.every((row) => row.preview.length <= 96));
});

test('AT-F020 contract preserves HLS substitution, search and stable line identity', () => {
    const stream = {
        id: 'hls-1',
        protocol: 'hls',
        rawManifest: '#EXTM3U\n#EXT-X-DEFINE:NAME="token",VALUE="demo"\nsegment-$token$.m4s',
    };
    const original = buildInteractiveManifestModel(stream, {
        substituted: false,
    });
    const substituted = buildInteractiveManifestModel(stream, {
        substituted: true,
        query: 'segment',
    });

    assert.equal(original.status, 'ready');
    assert.equal(substituted.total, 1);
    assert.match(substituted.rows[0].preview, /segment-\[token\]\.m4s/);
    assert.equal(
        original.rows.find((row) => row.preview.includes('segment-')).id,
        substituted.rows[0].id
    );
});

test('AT-F020 contract distinguishes unavailable, empty and malformed outcomes', () => {
    assert.equal(buildInteractiveManifestModel(null).status, 'empty');
    assert.equal(
        buildInteractiveManifestModel({
            protocol: 'hls',
            activeMediaPlaylistId: 'missing',
            mediaPlaylists: new Map(),
        }).status,
        'error'
    );
    const malformed = buildInteractiveManifestModel({
        protocol: 'dash',
        rawManifest: '<MPD>',
        manifest: null,
    });
    assert.equal(malformed.status, 'error');
    assert.doesNotMatch(malformed.message, /<MPD>|rawManifest/);
});

test('AT-F020 contract bounds page, depth and node count', () => {
    const representations = Array.from({ length: 700 }, (_, index) => ({
        ':@': { id: `representation-${index}` },
    }));
    const model = buildInteractiveManifestModel(
        dashStream({ Period: { AdaptationSet: { Representation: representations } } }),
        { page: 999, pageSize: 18 }
    );

    assert.equal(model.status, 'ready');
    assert.equal(model.truncated, true);
    assert.ok(model.total <= 500);
    assert.equal(model.page, model.pageCount - 1);
    assert.ok(model.rows.length <= 18);
});
