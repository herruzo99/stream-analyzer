/**
 * Creates a comparison row object for the tabular view.
 * @param {string} name - The name/label of the property.
 * @param {any[]} values - The array of values from each segment.
 * @returns {object}
 */
const createRow = (name, values) => {
    const firstValue = values[0];
    const isSame = values.every(
        (v) => JSON.stringify(v) === JSON.stringify(firstValue)
    );
    let status = isSame ? 'same' : 'different';

    const missingIndices = values
        .map((v, i) => (v === '---' ? i : -1))
        .filter((i) => i !== -1);
    if (missingIndices.length > 0 && missingIndices.length < values.length) {
        status = 'missing';
    }

    return { name, values, status };
};

/**
 * Generic helper to extract a field from the segment's summary object.
 * @param {object|null} segment - A parsed segment object.
 * @param {string} fieldName - The name of the summary field to extract.
 * @returns {any} The value of the field, or '---' if not found.
 */
const getSummaryField = (segment, fieldName) => {
    return segment?.data?.summary?.[fieldName] ?? '---';
};

/**
 * Extracts a formatted string of elementary streams from the PMT.
 * @param {object|null} segment - A parsed segment object.
 * @returns {string} A formatted string of PID-to-stream-type mappings.
 */
const getPmtStreamInfo = (segment) => {
    const summary = segment?.data?.summary;
    if (!summary?.programMap) return '---';
    const pmtPid = [...summary.pmtPids][0];
    const program = summary.programMap[pmtPid];
    if (!program?.streams) return '---';
    return (
        Object.entries(program.streams)
            .map(([pid, type]) => `PID ${pid}: ${type}`)
            .join(', ') || 'none'
    );
};

/**
 * Compares an array of parsed MPEG-2 TS segments.
 * @param {object[]} segments - An array of parsed segment objects.
 * @returns {{sections: object[], structuralDiff: object[]}} A structured comparison model.
 */
export function compareTsSegments(segments) {
    const sections = [
        {
            title: 'TS Summary',
            rows: [
                createRow(
                    'Total Packets',
                    segments.map((seg) => getSummaryField(seg, 'totalPackets'))
                ),
                createRow(
                    'PCR PID',
                    segments.map((seg) => getSummaryField(seg, 'pcrPid'))
                ),
                createRow(
                    'PMT PID(s)',
                    segments.map(
                        (seg) =>
                            [...getSummaryField(seg, 'pmtPids')].join(', ') ||
                            '---'
                    )
                ),
                createRow('Elementary Streams', segments.map(getPmtStreamInfo)),
            ],
            isGeneric: false,
        },
    ];

    return { sections, structuralDiff: [] }; // Structural diff for TS is not implemented
}
