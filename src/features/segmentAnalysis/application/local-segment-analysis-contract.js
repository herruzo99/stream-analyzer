export const LOCAL_SEGMENT_ANALYSIS_VERSION = 'sa-local-segment-analysis/1';
export const LOCAL_SEGMENT_ITEM_VERSION = 'sa-local-segment-item/1';

export const LOCAL_SEGMENT_LIMITS = Object.freeze({
    files: 8,
    fileBytes: 16 * 1024 * 1024,
    totalBytes: 64 * 1024 * 1024,
    projectedNodes: 8_000,
    projectedDepth: 24,
    projectedArrayItems: 2_000,
    textLength: 512,
});

function stableHash(value) {
    let hash = 0x811c9dc5;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}

/** @param {unknown} value @param {number} [maximum] */
function boundedText(value, maximum = LOCAL_SEGMENT_LIMITS.textLength) {
    return String(value ?? '')
        .replace(/[\r\n\t]+/g, ' ')
        .trim()
        .slice(0, maximum);
}

function failure(code, message) {
    return Object.freeze({
        contractVersion: LOCAL_SEGMENT_ANALYSIS_VERSION,
        state: 'rejected',
        code,
        message,
        generationId: null,
        items: Object.freeze([]),
        totalBytes: 0,
    });
}

/**
 * Validates local-file authority before any bytes are read.
 * @param {File[]} input
 */
export function createLocalSegmentSelection(input) {
    const files = Array.from(input ?? []);
    if (files.length === 0)
        return failure('empty', 'Select one or more local segment files.');
    if (files.length > LOCAL_SEGMENT_LIMITS.files)
        return failure(
            'too-many-files',
            `Select at most ${LOCAL_SEGMENT_LIMITS.files} files.`
        );

    let totalBytes = 0;
    for (const file of files) {
        if (!Number.isSafeInteger(file?.size) || file.size < 0)
            return failure(
                'invalid-size',
                'A selected file has an invalid size.'
            );
        if (file.size > LOCAL_SEGMENT_LIMITS.fileBytes)
            return failure(
                'file-too-large',
                `Each file must be ${LOCAL_SEGMENT_LIMITS.fileBytes} bytes or smaller.`
            );
        totalBytes += file.size;
        if (totalBytes > LOCAL_SEGMENT_LIMITS.totalBytes)
            return failure(
                'selection-too-large',
                `The selection must be ${LOCAL_SEGMENT_LIMITS.totalBytes} bytes or smaller.`
            );
    }

    const seed = files
        .map(
            (file, index) =>
                `${index}:${file.name}:${file.size}:${file.lastModified ?? 0}`
        )
        .join('|');
    const generationId = `sa-local-run-${stableHash(seed)}`;
    const items = files.map((file, index) =>
        Object.freeze({
            contractVersion: LOCAL_SEGMENT_ITEM_VERSION,
            itemId: `sa-local-item-${stableHash(`${generationId}:${index}`)}`,
            cacheKey: `local-segment-${stableHash(`${generationId}:${index}:${file.name}`)}`,
            label: boundedText(file.name, 160) || `Local segment ${index + 1}`,
            byteLength: file.size,
            index,
            file,
        })
    );
    return Object.freeze({
        contractVersion: LOCAL_SEGMENT_ANALYSIS_VERSION,
        state: 'accepted',
        code: '',
        message: '',
        generationId,
        items: Object.freeze(items),
        totalBytes,
    });
}

/**
 * Builds a bounded, cycle-safe parser projection for cache and presentation.
 * ArrayBuffer views and scalar values remain scalar; raw bytes are held only in
 * the cache entry owned by the active run.
 * @param {unknown} input
 */
export function projectLocalParsedData(input) {
    const seen = new WeakSet();
    let nodes = 0;
    let truncated = false;

    const visit = (value, depth) => {
        if (value === null || typeof value !== 'object') {
            if (typeof value === 'string') return boundedText(value);
            return value;
        }
        if (ArrayBuffer.isView(value)) {
            truncated = true;
            return Object.freeze({
                byteLength: Math.min(value.byteLength, 0xffffffff),
                type: value.constructor?.name ?? 'ArrayBufferView',
            });
        }
        if (value instanceof ArrayBuffer) {
            truncated = true;
            return Object.freeze({
                byteLength: value.byteLength,
                type: 'ArrayBuffer',
            });
        }
        if (seen.has(value)) {
            truncated = true;
            return '[Circular]';
        }
        if (
            depth > LOCAL_SEGMENT_LIMITS.projectedDepth ||
            nodes >= LOCAL_SEGMENT_LIMITS.projectedNodes
        ) {
            truncated = true;
            return '[Bounded]';
        }
        seen.add(value);
        nodes += 1;
        if (Array.isArray(value)) {
            if (value.length > LOCAL_SEGMENT_LIMITS.projectedArrayItems)
                truncated = true;
            return Object.freeze(
                value
                    .slice(0, LOCAL_SEGMENT_LIMITS.projectedArrayItems)
                    .map((entry) => visit(entry, depth + 1))
            );
        }
        const output = {};
        for (const [key, entry] of Object.entries(value)) {
            if (nodes >= LOCAL_SEGMENT_LIMITS.projectedNodes) {
                truncated = true;
                break;
            }
            output[boundedText(key, 96)] = visit(entry, depth + 1);
        }
        return Object.freeze(output);
    };

    return Object.freeze({
        value: visit(input, 0),
        projectedNodes: nodes,
        truncated,
    });
}

export function localAnalysisProgress(
    selection,
    completed,
    state,
    message = ''
) {
    return Object.freeze({
        contractVersion: LOCAL_SEGMENT_ANALYSIS_VERSION,
        generationId: selection.generationId,
        state,
        completed,
        total: selection.items.length,
        percent:
            selection.items.length === 0
                ? 0
                : Math.round((completed / selection.items.length) * 100),
        message: boundedText(message, 240),
    });
}
