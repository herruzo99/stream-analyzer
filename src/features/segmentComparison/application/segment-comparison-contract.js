import { createComparisonModel } from '../domain/comparisonEngine.js';

export const SEGMENT_COMPARISON_VERSION = 'sa-segment-comparison/1';
export const COMPARISON_SEGMENT_VERSION = 'sa-comparison-segment/1';
export const COMPARISON_ROW_VERSION = 'sa-comparison-row/1';
export const COMPARISON_NODE_VERSION = 'sa-comparison-node/1';

export const SEGMENT_COMPARISON_LIMITS = Object.freeze({
    segments: 2,
    inputNodes: 8_000,
    inputDepth: 32,
    sections: 64,
    rows: 512,
    structuralNodes: 1_024,
    structuralDepth: 24,
    valueCharacters: 500,
});

function hashText(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

const stableId = (prefix, value) => `${prefix}-${hashText(value)}`;

function boundedValue(value) {
    if (value === null || value === undefined) return String(value ?? 'null');
    if (typeof value === 'string')
        return value.slice(0, SEGMENT_COMPARISON_LIMITS.valueCharacters);
    if (typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    try {
        return JSON.stringify(value).slice(
            0,
            SEGMENT_COMPARISON_LIMITS.valueCharacters
        );
    } catch {
        return '[unavailable]';
    }
}

function inspectInput(value) {
    const seen = new WeakSet();
    const stack = [{ value, depth: 0 }];
    let count = 0;
    while (stack.length) {
        const current = stack.pop();
        if (!current || !current.value || typeof current.value !== 'object')
            continue;
        if (seen.has(current.value)) continue;
        seen.add(current.value);
        count += 1;
        if (
            count > SEGMENT_COMPARISON_LIMITS.inputNodes ||
            current.depth > SEGMENT_COMPARISON_LIMITS.inputDepth
        )
            return Object.freeze({ safe: false, count });
        const values =
            current.value instanceof Map || current.value instanceof Set
                ? [...current.value.values()]
                : Object.values(current.value);
        for (const child of values)
            stack.push({ value: child, depth: current.depth + 1 });
    }
    return Object.freeze({ safe: true, count });
}

const empty = (state, reason) =>
    Object.freeze({
        contractVersion: SEGMENT_COMPARISON_VERSION,
        segmentVersion: COMPARISON_SEGMENT_VERSION,
        rowVersion: COMPARISON_ROW_VERSION,
        nodeVersion: COMPARISON_NODE_VERSION,
        state,
        reason,
        comparisonId: '',
        format: '',
        truncated: false,
        segments: Object.freeze([]),
        sections: Object.freeze([]),
        structuralNodes: Object.freeze([]),
        totalRowCount: 0,
        visibleRowCount: 0,
        totalNodeCount: 0,
        visibleNodeCount: 0,
    });

function projectNodes(nodes, comparisonId) {
    const projected = [];
    let total = 0;
    let truncated = false;
    const visit = (items, depth, parentSeed) => {
        if (!Array.isArray(items)) return Object.freeze([]);
        const children = [];
        for (let index = 0; index < items.length; index += 1) {
            total += 1;
            if (
                projected.length >= SEGMENT_COMPARISON_LIMITS.structuralNodes ||
                depth > SEGMENT_COMPARISON_LIMITS.structuralDepth
            ) {
                truncated = true;
                break;
            }
            const item = items[index] ?? {};
            const name = boundedValue(
                item.name ?? item.type ?? `Node ${index + 1}`
            );
            const nodeId = stableId(
                'sa-comparison-node',
                `${comparisonId}:${parentSeed}:${index}:${name}`
            );
            const node = Object.freeze({
                contractVersion: COMPARISON_NODE_VERSION,
                nodeId,
                name,
                status: ['same', 'different', 'missing'].includes(item.status)
                    ? item.status
                    : 'different',
                values: Object.freeze(
                    (Array.isArray(item.values) ? item.values : []).map(
                        boundedValue
                    )
                ),
                children: visit(item.children, depth + 1, nodeId),
            });
            projected.push(node);
            children.push(node);
        }
        return Object.freeze(children);
    };
    const roots = visit(nodes, 0, 'root');
    return Object.freeze({ roots, total, truncated });
}

/** @param {object[]} segments */
export function createSegmentComparison(segments) {
    if (!Array.isArray(segments) || segments.length < 2)
        return empty('unavailable', 'Select two cached segments to compare.');
    const selected = segments.slice(0, SEGMENT_COMPARISON_LIMITS.segments);
    if (selected.some((segment) => !inspectInput(segment).safe))
        return Object.freeze({
            ...empty(
                'partial',
                'Segment data exceeds the bounded comparison input.'
            ),
            truncated: true,
        });

    let model;
    try {
        model = createComparisonModel(selected);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Comparison failed.';
        return empty(
            /different formats|Unsupported segment format/.test(message)
                ? 'incompatible'
                : 'error',
            boundedValue(message)
        );
    }

    const format = boundedValue(selected[0]?.format);
    const segmentProjection = selected.map((segment, index) => {
        const segmentKey = boundedValue(
            segment?.segment?.uniqueId ?? `segment-${index + 1}`
        );
        return Object.freeze({
            contractVersion: COMPARISON_SEGMENT_VERSION,
            segmentId: stableId(
                'sa-comparison-segment',
                `${segment?.stream?.id ?? 'stream'}:${segmentKey}:${format}`
            ),
            label: boundedValue(
                segment?.stream?.name ?? `Segment ${index + 1}`
            ),
            number: boundedValue(segment?.segment?.number ?? 'init'),
        });
    });
    const comparisonId = stableId(
        'sa-segment-comparison',
        `${segmentProjection.map(({ segmentId }) => segmentId).join(':')}:${format}`
    );

    let totalRows = 0;
    const rows = [];
    const sections = (Array.isArray(model.sections) ? model.sections : [])
        .slice(0, SEGMENT_COMPARISON_LIMITS.sections)
        .map((section, sectionIndex) => {
            const sourceRows = Array.isArray(section.rows) ? section.rows : [];
            totalRows += sourceRows.length;
            const visibleRows = sourceRows
                .slice(
                    0,
                    Math.max(0, SEGMENT_COMPARISON_LIMITS.rows - rows.length)
                )
                .map((row, rowIndex) => {
                    const name = boundedValue(row.name);
                    const projected = Object.freeze({
                        contractVersion: COMPARISON_ROW_VERSION,
                        rowId: stableId(
                            'sa-comparison-row',
                            `${comparisonId}:${sectionIndex}:${rowIndex}:${name}`
                        ),
                        name,
                        status: ['same', 'different', 'missing'].includes(
                            row.status
                        )
                            ? row.status
                            : 'different',
                        values: Object.freeze(
                            (Array.isArray(row.values) ? row.values : []).map(
                                boundedValue
                            )
                        ),
                    });
                    rows.push(projected);
                    return projected;
                });
            return Object.freeze({
                sectionId: stableId(
                    'sa-comparison-section',
                    `${comparisonId}:${sectionIndex}:${section.title}`
                ),
                title: boundedValue(section.title),
                rows: Object.freeze(visibleRows),
            });
        });
    const nodes = projectNodes(model.structuralDiff, comparisonId);
    const truncated =
        model.sections?.length > SEGMENT_COMPARISON_LIMITS.sections ||
        totalRows > SEGMENT_COMPARISON_LIMITS.rows ||
        nodes.truncated;

    return Object.freeze({
        contractVersion: SEGMENT_COMPARISON_VERSION,
        segmentVersion: COMPARISON_SEGMENT_VERSION,
        rowVersion: COMPARISON_ROW_VERSION,
        nodeVersion: COMPARISON_NODE_VERSION,
        state: truncated ? 'partial' : 'complete',
        reason: truncated ? 'Comparison output was bounded.' : '',
        comparisonId,
        format,
        truncated,
        segments: Object.freeze(segmentProjection),
        sections: Object.freeze(sections),
        structuralNodes: nodes.roots,
        totalRowCount: totalRows,
        visibleRowCount: rows.length,
        totalNodeCount: nodes.total,
        visibleNodeCount: Math.min(
            nodes.total,
            SEGMENT_COMPARISON_LIMITS.structuralNodes
        ),
    });
}
