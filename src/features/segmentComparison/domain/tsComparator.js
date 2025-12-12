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
        .map((v, i) => (v === '---' || v === null || v === undefined ? i : -1))
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
 * @param {string|null} subField - Optional nested field.
 * @returns {any} The value of the field, or '---' if not found.
 */
const getSummaryField = (segment, fieldName, subField = null) => {
    const val = segment?.data?.summary?.[fieldName];
    if (val === undefined || val === null) return '---';
    if (subField) return val[subField] ?? '---';
    return val;
};

/**
 * Helper to safely get nested properties from the root segment object.
 * @param {object} obj - The segment object.
 * @param {string[]} path - Path array.
 * @param {string} fallback - Fallback value.
 */
const getVal = (obj, path, fallback = '---') => {
    const result = path.reduce(
        (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
        obj
    );
    return result !== undefined && result !== null ? result : fallback;
};

/**
 * Extracts a formatted string of elementary streams from the PMT.
 * @param {object|null} segment - A parsed segment object.
 * @returns {string} A formatted string of PID-to-stream-type mappings.
 */
const getPmtStreamInfo = (segment) => {
    const summary = segment?.data?.summary;
    if (!summary?.programMap) return '---';

    // Get the first program found
    const pmtPid = Array.from(summary.pmtPids)[0];
    if (!pmtPid) return '---';

    const program = summary.programMap[pmtPid];
    if (!program?.streams) return '---';
    return (
        Object.entries(program.streams)
            .map(([pid, type]) => `PID ${pid}: ${type}`)
            .join(', ') || 'none'
    );
};

const getPcrInfo = (segment) => {
    const pcrList = segment?.data?.summary?.pcrList;
    if (!pcrList) return '---';
    return `${pcrList.count} PCRs (Avg: ${pcrList.interval.avg})`;
};

const getDurationFromPcr = (segment) => {
    const pcrList = segment?.data?.summary?.pcrList;
    if (!pcrList || !pcrList.firstPcr || !pcrList.lastPcr) return '---';
    const diff =
        (Number(pcrList.lastPcr) - Number(pcrList.firstPcr)) / 27000000;
    return diff > 0 ? `${diff.toFixed(3)}s` : '---';
};

/**
 * Compares an array of parsed MPEG-2 TS segments.
 * @param {object[]} segments - An array of parsed segment objects.
 * @returns {{sections: object[], structuralDiff: object[]}} A structured comparison model.
 */
export function compareTsSegments(segments) {
    const sections = [];

    // 1. Video Track Details (from Deep Analysis / Media Info)
    if (segments.some((s) => s?.mediaInfo?.video)) {
        sections.push({
            title: 'Video Track',
            rows: [
                createRow(
                    'Codec',
                    segments.map((s) =>
                        getVal(s, ['mediaInfo', 'video', 'codec'])
                    )
                ),
                createRow(
                    'Resolution',
                    segments.map((s) =>
                        getVal(s, ['mediaInfo', 'video', 'resolution'])
                    )
                ),
                createRow(
                    'Frame Rate',
                    segments.map((s) =>
                        getVal(s, ['mediaInfo', 'video', 'frameRate'])
                    )
                ),
            ],
            isGeneric: false,
        });
    }

    // 2. Audio Track Details
    if (segments.some((s) => s?.mediaInfo?.audio)) {
        sections.push({
            title: 'Audio Track',
            rows: [
                createRow(
                    'Codec',
                    segments.map((s) =>
                        getVal(s, ['mediaInfo', 'audio', 'codec'])
                    )
                ),
                createRow(
                    'Sample Rate',
                    segments.map((s) => {
                        const rate = getVal(s, [
                            'mediaInfo',
                            'audio',
                            'sampleRate',
                        ]);
                        return typeof rate === 'number' ? `${rate} Hz` : rate;
                    })
                ),
                createRow(
                    'Channels',
                    segments.map((s) =>
                        getVal(s, ['mediaInfo', 'audio', 'channels'])
                    )
                ),
                createRow(
                    'Language',
                    segments.map((s) =>
                        getVal(s, ['mediaInfo', 'audio', 'language'])
                    )
                ),
            ],
            isGeneric: false,
        });
    }

    // 3. Bitstream Analysis (GOP)
    if (segments.some((s) => s?.bitstreamAnalysis)) {
        sections.push({
            title: 'Bitstream (GOP)',
            rows: [
                createRow(
                    'GOP Structure',
                    segments.map((s) =>
                        getVal(s, [
                            'bitstreamAnalysis',
                            'summary',
                            'gopStructure',
                        ])
                    )
                ),
                createRow(
                    'Avg GOP Length',
                    segments.map((s) =>
                        getVal(s, ['bitstreamAnalysis', 'summary', 'gopLength'])
                    )
                ),
                createRow(
                    'Calculated Bitrate',
                    segments.map((s) => {
                        const br = getVal(
                            s,
                            ['bitstreamAnalysis', 'summary', 'bitrate'],
                            null
                        );
                        return br !== null
                            ? `${(br / 1000).toFixed(0)} kbps`
                            : '---';
                    })
                ),
                createRow(
                    'Total Frames',
                    segments.map((s) =>
                        getVal(s, [
                            'bitstreamAnalysis',
                            'summary',
                            'totalFrames',
                        ])
                    )
                ),
                createRow(
                    'I-Frame Ratio',
                    segments.map((s) =>
                        getVal(s, [
                            'bitstreamAnalysis',
                            'summary',
                            'iFrameRatio',
                        ])
                    )
                ),
            ],
            isGeneric: false,
        });
    }

    // 4. Transport Stream Summary (Low Level)
    sections.push({
        title: 'Transport Structure',
        rows: [
            createRow(
                'Total Packets',
                segments.map((seg) => getSummaryField(seg, 'totalPackets'))
            ),
            createRow('Duration (PCR)', segments.map(getDurationFromPcr)),
            createRow(
                'PCR PID',
                segments.map((seg) => getSummaryField(seg, 'pcrPid'))
            ),
            createRow('PCR Stats', segments.map(getPcrInfo)),
            createRow(
                'PMT PID(s)',
                segments.map(
                    (seg) =>
                        [...(getSummaryField(seg, 'pmtPids') || [])].join(
                            ', '
                        ) || '---'
                )
            ),
            createRow('Elementary Streams', segments.map(getPmtStreamInfo)),
        ],
        isGeneric: false,
    });

    // 5. Continuity
    sections.push({
        title: 'Stream Continuity',
        rows: [
            createRow(
                'Continuity Errors',
                segments.map((seg) => {
                    const cc = seg?.data?.summary?.continuityCounters;
                    if (!cc) return '---';
                    let totalErrs = 0;
                    Object.values(cc).forEach((c) => (totalErrs += c.errors));
                    return totalErrs;
                })
            ),
        ],
        isGeneric: false,
    });

    return { sections, structuralDiff: [] };
}