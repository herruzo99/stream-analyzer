import assert from 'node:assert/strict';
import test from 'node:test';
import {
    BITSTREAM_CONTRACT_LIMITS,
    buildBitstreamModel,
} from '../../src/features/interactiveSegment/application/bitstream-contract.js';

function buffer(values) {
    return Uint8Array.from(values).buffer;
}

function isoEntry(overrides = {}) {
    return {
        status: 200,
        data: buffer([0x66, 0x74, 0x79, 0x70, 0x00, 0xff, 0x20, 0x41]),
        parsedData: {
            format: 'isobmff',
            data: {
                boxes: [
                    {
                        type: 'ftyp',
                        offset: 0,
                        size: 8,
                        children: [],
                    },
                ],
            },
        },
        ...overrides,
    };
}

test('AT-F022-01 creates deterministic versioned byte/tree correlation', () => {
    const first = buildBitstreamModel('segment-a', isoEntry(), {
        analysisState: 'ready',
    });
    const second = buildBitstreamModel('segment-a', isoEntry(), {
        analysisState: 'ready',
    });

    assert.equal(first.status, 'ready');
    assert.equal(first.structureRows.length, 1);
    assert.equal(first.hexRows.length, 1);
    assert.equal(first.structureRows[0].offset, 0);
    assert.equal(first.hexRows[0].label, '0x00000000');
    assert.equal(first.hexRows[0].hex, '66 74 79 70 00 FF 20 41');
    assert.equal(first.hexRows[0].ascii, 'ftyp.. A');
    assert.deepEqual(
        first.structureRows.map(({ id }) => id),
        second.structureRows.map(({ id }) => id)
    );
    assert.match(
        first.structureRows[0].id,
        /^sa-bitstream:v1:[a-z0-9]+:[a-z0-9]+$/
    );
});

test('AT-F022-02 preserves fetching, malformed, worker and unsupported truth', () => {
    assert.equal(buildBitstreamModel(null, undefined).status, 'empty');
    assert.equal(buildBitstreamModel('a', undefined).status, 'fetching');
    assert.equal(
        buildBitstreamModel('a', { status: 404, data: null }).status,
        'error'
    );
    assert.equal(
        buildBitstreamModel(
            'a',
            isoEntry({ parsedData: { format: 'isobmff', error: 'bad' } }),
            { analysisState: 'ready' }
        ).status,
        'error'
    );
    assert.equal(buildBitstreamModel('a', isoEntry()).status, 'analyzing');
    assert.equal(
        buildBitstreamModel('a', isoEntry(), { analysisState: 'error' }).status,
        'error'
    );
    assert.equal(
        buildBitstreamModel('a', {
            status: 200,
            data: buffer([1]),
            parsedData: { format: 'unknown', data: {} },
        }).status,
        'unsupported'
    );
});

test('AT-F022-03 rejects oversized analysis and caps displayed bytes/rows', () => {
    const oversized = {
        status: 200,
        data: { byteLength: BITSTREAM_CONTRACT_LIMITS.maxAnalysisBytes + 1 },
        parsedData: { format: 'isobmff', data: { boxes: [] } },
    };
    assert.equal(buildBitstreamModel('large', oversized).status, 'too-large');

    const displayBuffer = new ArrayBuffer(
        BITSTREAM_CONTRACT_LIMITS.maxHexBytes + 32
    );
    const packets = Array.from(
        { length: BITSTREAM_CONTRACT_LIMITS.maxStructureRows + 5 },
        (_, index) => ({ offset: index * 188, pid: index, payloadType: 'TS' })
    );
    const bounded = buildBitstreamModel(
        'bounded',
        {
            status: 200,
            data: displayBuffer,
            parsedData: { format: 'ts', data: { packets } },
        },
        { analysisState: 'ready' }
    );
    assert.equal(
        bounded.hexRows.length,
        BITSTREAM_CONTRACT_LIMITS.maxHexBytes / 16
    );
    assert.equal(
        bounded.structureRows.length,
        BITSTREAM_CONTRACT_LIMITS.maxStructureRows
    );
    assert.equal(bounded.truncatedHex, true);
    assert.equal(bounded.truncatedStructure, true);
});

test('AT-F022-04 invalidates stale selection and bounds unsafe labels', () => {
    const initial = buildBitstreamModel('segment-a', isoEntry(), {
        analysisState: 'ready',
    });
    const selected = {
        _bitstreamContractId: initial.structureRows[0].id,
    };
    assert.equal(
        buildBitstreamModel('segment-a', isoEntry(), {
            analysisState: 'ready',
            selected,
        }).selectedId,
        initial.structureRows[0].id
    );
    assert.equal(
        buildBitstreamModel(
            'segment-b',
            isoEntry({
                parsedData: {
                    format: 'isobmff',
                    data: {
                        boxes: [
                            {
                                type:
                                    '<img onerror=alert(1)>\n' +
                                    'x'.repeat(200),
                                offset: 0,
                                size: 8,
                            },
                        ],
                    },
                },
            }),
            { analysisState: 'ready', selected }
        ).selectedId,
        null
    );
    const hostile = buildBitstreamModel(
        'segment-b',
        isoEntry({
            parsedData: {
                format: 'isobmff',
                data: {
                    boxes: [
                        {
                            type: '<img onerror=alert(1)>\n' + 'x'.repeat(200),
                            offset: 0,
                            size: 8,
                        },
                    ],
                },
            },
        }),
        { analysisState: 'ready' }
    );
    assert.ok(
        hostile.structureRows[0].label.length <=
            BITSTREAM_CONTRACT_LIMITS.maxLabelLength
    );
    assert.ok(!hostile.structureRows[0].label.includes('\n'));
    assert.ok(!hostile.structureRows[0].id.includes('onerror'));
});
