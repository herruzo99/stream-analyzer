/**
 * Creates a comparison row object for the tabular view.
 * @param {string} name - The name/label of the property.
 * @param {any[]} values - The array of values from each segment.
 * @param {object} [tooltipData={}] - The tooltip data for the row.
 * @returns {object}
 */
const createRow = (name, values, tooltipData = {}) => {
    const firstValue = values[0];
    const isSame = values.every(
        (v) => JSON.stringify(v) === JSON.stringify(firstValue)
    );
    let status = isSame ? 'same' : 'different';

    const missingIndices = values
        .map((v, i) => (v === '---' || v === null || v === undefined ? i : -1))
        .filter((i) => i !== -1);
    if (missingIndices.length > 0 && missingIndices.length < values.length) {
        status = 'missing';
    }

    return { name, values, status, ...tooltipData };
};

const formatCueSettings = (settings) => {
    if (!settings || Object.keys(settings).length === 0) {
        return 'none';
    }
    return Object.entries(settings)
        .map(([key, value]) => `${key}:${value}`)
        .join(' ');
};

/**
 * Compares an array of parsed WebVTT segments.
 * @param {object[]} segments - An array of parsed segment objects from vtt/parser.js.
 * @returns {{sections: object[], structuralDiff: object[]}} A structured comparison model.
 */
export function compareVttSegments(segments) {
    const sections = [];

    // General Section
    sections.push({
        title: 'General',
        rows: [
            createRow(
                'Cue Count',
                segments.map((s) => s?.data?.cues?.length ?? '---')
            ),
            createRow(
                'Style Block Count',
                segments.map((s) => s?.data?.styles?.length ?? '---')
            ),
            createRow(
                'Region Count',
                segments.map((s) => s?.data?.regions?.length ?? '---')
            ),
            createRow(
                'Parsing Errors',
                segments.map((s) => s?.data?.errors?.length ?? 0)
            ),
        ],
        isGeneric: false,
    });

    // Cue Details Section
    const cueCounts = segments.map((s) => s?.data?.cues?.length ?? 0);
    const areCueCountsEqual = cueCounts.every((c) => c === cueCounts[0]);

    if (areCueCountsEqual && cueCounts[0] > 0) {
        const cueEntries = [];
        for (let i = 0; i < cueCounts[0]; i++) {
            const values = segments.map((s) => {
                const cue = s.data.cues[i];
                if (!cue) return null;
                return {
                    id: cue.id || 'N/A',
                    startTime: cue.startTime?.toFixed(3) || 'N/A',
                    endTime: cue.endTime?.toFixed(3) || 'N/A',
                    settings: formatCueSettings(cue.settings),
                    payload: cue.payload.join(' '),
                };
            });
            const firstValue = values[0];
            const isSame = values.every(
                (v) => JSON.stringify(v) === JSON.stringify(firstValue)
            );
            cueEntries.push({ values, status: isSame ? 'same' : 'different' });
        }

        sections.push({
            title: 'Cue Details',
            rows: [],
            isGeneric: false,
            tableData: {
                headers: [
                    { key: 'id', label: 'ID' },
                    { key: 'startTime', label: 'Start (s)' },
                    { key: 'endTime', label: 'End (s)' },
                    { key: 'settings', label: 'Settings' },
                    { key: 'payload', label: 'Payload' },
                ],
                entries: cueEntries,
            },
        });
    } else {
        sections.push({
            title: 'Cue Details',
            rows: [
                createRow(
                    'Comparison Skipped',
                    cueCounts.map(
                        (count, i) =>
                            `Cannot compare cues: segment ${
                                i + 1
                            } has ${count} cues.`
                    )
                ),
            ],
            isGeneric: false,
        });
    }

    // Style Section
    const styleBlockCount = Math.max(
        ...segments.map((s) => s?.data?.styles?.length ?? 0)
    );
    if (styleBlockCount > 0) {
        const styleRows = [];
        for (let i = 0; i < styleBlockCount; i++) {
            styleRows.push(
                createRow(
                    `Style Block #${i + 1}`,
                    segments.map(
                        (s) =>
                            s?.data?.styles?.[i]?.replace(/\s+/g, ' ') ?? '---'
                    )
                )
            );
        }
        sections.push({
            title: 'Styles',
            rows: styleRows,
            isGeneric: false,
        });
    }

    return { sections, structuralDiff: [] };
}
