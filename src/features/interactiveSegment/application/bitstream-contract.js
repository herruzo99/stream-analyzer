const CONTRACT_VERSION = 1;
const MAX_ANALYSIS_BYTES = 16 * 1024 * 1024;
const MAX_HEX_BYTES = 64 * 1024;
const MAX_STRUCTURE_ROWS = 5000;
const MAX_LABEL_LENGTH = 96;

function boundedText(value, fallback = '') {
    return String(value ?? fallback)
        .replace(/[\r\n\t]+/g, ' ')
        .trim()
        .slice(0, MAX_LABEL_LENGTH);
}

function finiteOffset(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function stableHash(value) {
    let hash = 0x811c9dc5;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}

function generationId(segmentKey, format, byteLength) {
    return stableHash(`${segmentKey}:${format}:${byteLength}`);
}

function rowId(generation, kind, offset, sourceId) {
    return `sa-bitstream:v${CONTRACT_VERSION}:${generation}:${stableHash(
        `${kind}:${offset}:${sourceId}`
    )}`;
}

function flattenBoxes(nodes, generation, rows, depth = 0) {
    if (!Array.isArray(nodes)) return;
    for (const [index, node] of nodes.entries()) {
        if (rows.length >= MAX_STRUCTURE_ROWS) return;
        const offset = finiteOffset(node.offset);
        const size = finiteOffset(node.size);
        rows.push({
            id: rowId(generation, 'box', offset, node.type ?? index),
            generation,
            kind: 'box',
            label: boundedText(node.type, 'box'),
            offset,
            size,
            depth: Math.min(32, depth),
            source: node,
        });
        flattenBoxes(node.children, generation, rows, depth + 1);
    }
}

function packetRows(packets, generation) {
    if (!Array.isArray(packets)) return [];
    return packets.slice(0, MAX_STRUCTURE_ROWS).map((packet, index) => {
        const offset = finiteOffset(packet.offset ?? index * 188);
        return {
            id: rowId(generation, 'packet', offset, packet.pid ?? index),
            generation,
            kind: 'packet',
            label: boundedText(
                packet.payloadType,
                `PID ${packet.pid ?? 'unknown'}`
            ),
            offset,
            size: 188,
            depth: 0,
            source: packet,
        };
    });
}

function hexRows(buffer, generation) {
    const view = new Uint8Array(
        buffer,
        0,
        Math.min(buffer.byteLength, MAX_HEX_BYTES)
    );
    const rows = [];
    for (let offset = 0; offset < view.length; offset += 16) {
        const bytes = view.subarray(offset, Math.min(offset + 16, view.length));
        rows.push({
            id: rowId(generation, 'bytes', offset, bytes.length),
            generation,
            kind: 'bytes',
            label: `0x${offset.toString(16).padStart(8, '0').toUpperCase()}`,
            offset,
            size: bytes.length,
            hex: Array.from(bytes, (byte) =>
                byte.toString(16).padStart(2, '0').toUpperCase()
            ).join(' '),
            ascii: Array.from(bytes, (byte) =>
                byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'
            ).join(''),
            source: null,
        });
    }
    return rows;
}

/**
 * Builds the bounded application-owned F-022 view contract.
 * Raw bytes, cache, parser and worker state remain outside HEUX.
 *
 * @param {string | null} segmentKey
 * @param {object | undefined} entry
 * @param {{ analysisState?: string, selected?: object | null }} [options]
 */
export function buildBitstreamModel(segmentKey, entry, options = {}) {
    const empty = {
        version: CONTRACT_VERSION,
        generation: null,
        status: 'empty',
        message: 'Select a segment in Segment Explorer.',
        format: null,
        byteLength: 0,
        structureRows: [],
        hexRows: [],
        selectedId: null,
        truncatedHex: false,
        truncatedStructure: false,
    };
    if (!segmentKey) return empty;
    if (!entry || entry.status === -1) {
        return {
            ...empty,
            status: 'fetching',
            message: 'Fetching and parsing the selected segment.',
        };
    }
    if (entry.status >= 400 || !entry.data) {
        return {
            ...empty,
            status: 'error',
            message: `Segment request failed with HTTP ${finiteOffset(entry.status)}.`,
        };
    }

    const byteLength = finiteOffset(entry.data.byteLength);
    const format = boundedText(
        entry.parsedData?.format,
        'unknown'
    ).toLowerCase();
    const generation = generationId(segmentKey, format, byteLength);
    if (byteLength > MAX_ANALYSIS_BYTES) {
        return {
            ...empty,
            generation,
            status: 'too-large',
            message: `Segment is ${byteLength} bytes; the ${MAX_ANALYSIS_BYTES}-byte analysis limit prevents unbounded work.`,
            format,
            byteLength,
        };
    }
    if (entry.parsedData?.error) {
        return {
            ...empty,
            generation,
            status: 'error',
            message: 'The segment parser reported malformed data.',
            format,
            byteLength,
        };
    }
    if (!['isobmff', 'ts', 'vtt', 'ttml'].includes(format)) {
        return {
            ...empty,
            generation,
            status: 'unsupported',
            message: `Bitstream inspection is unavailable for ${format}.`,
            format,
            byteLength,
        };
    }

    const needsWorker = format === 'isobmff' || format === 'ts';
    if (needsWorker && options.analysisState !== 'ready') {
        const failed = options.analysisState === 'error';
        return {
            ...empty,
            generation,
            status: failed ? 'error' : 'analyzing',
            message: failed
                ? 'Worker analysis failed for the selected segment.'
                : 'Building the bounded byte correlation index.',
            format,
            byteLength,
        };
    }

    let structureRows = [];
    if (format === 'isobmff') {
        flattenBoxes(entry.parsedData?.data?.boxes, generation, structureRows);
    } else if (format === 'ts') {
        structureRows = packetRows(entry.parsedData?.data?.packets, generation);
    } else {
        structureRows = [
            {
                id: rowId(generation, 'text', 0, format),
                generation,
                kind: 'text',
                label: `${format.toUpperCase()} text payload`,
                offset: 0,
                size: byteLength,
                depth: 0,
                source: entry.parsedData?.data ?? null,
            },
        ];
    }
    const bytes = hexRows(entry.data, generation);
    const selectedContractId = options.selected?._bitstreamContractId;
    const selectedId = [...structureRows, ...bytes].some(
        (row) => row.id === selectedContractId
    )
        ? selectedContractId
        : null;

    return {
        version: CONTRACT_VERSION,
        generation,
        status: 'ready',
        message: '',
        format,
        byteLength,
        structureRows,
        hexRows: bytes,
        selectedId,
        truncatedHex: byteLength > MAX_HEX_BYTES,
        truncatedStructure:
            (format === 'isobmff' &&
                structureRows.length >= MAX_STRUCTURE_ROWS) ||
            (format === 'ts' &&
                (entry.parsedData?.data?.packets?.length ?? 0) >
                    MAX_STRUCTURE_ROWS),
    };
}

export const BITSTREAM_CONTRACT_LIMITS = Object.freeze({
    version: CONTRACT_VERSION,
    maxAnalysisBytes: MAX_ANALYSIS_BYTES,
    maxHexBytes: MAX_HEX_BYTES,
    maxStructureRows: MAX_STRUCTURE_ROWS,
    maxLabelLength: MAX_LABEL_LENGTH,
});
