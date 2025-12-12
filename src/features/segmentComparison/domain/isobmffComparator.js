/** @typedef {import('@/types').Box} Box */

import { getTooltipData as getAllIsoTooltipData } from '@/infrastructure/parsing/isobmff/index';
const allIsoTooltipData = getAllIsoTooltipData();

/**
 * Recursively finds a box of a given type within a list of boxes.
 * @param {Box[] | undefined} boxes - The list of boxes to search.
 * @param {string} type - The box type to find.
 * @returns {Box | null}
 */
const findBox = (boxes, type) => {
    if (!boxes) return null;
    for (const box of boxes) {
        if (box.type === type) return box;
        if (box.children?.length > 0) {
            const found = findBox(box.children, type);
            if (found) return found;
        }
    }
    return null;
};

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
        .map((v, i) => (v === '---' ? i : -1))
        .filter((i) => i !== -1);
    if (missingIndices.length > 0 && missingIndices.length < values.length) {
        status = 'missing';
    }

    return { name, values, status, ...tooltipData };
};

/**
 * Generic helper to extract a field from a box at a specific path.
 * @param {object|null} segment - A parsed segment object.
 * @param {string[]} path - The path of box types to traverse.
 * @param {string} fieldName - The name of the detail field to extract.
 * @returns {any} The value of the field, or '---' if not found.
 */
const getBoxField = (segment, path, fieldName) => {
    if (!segment) return '---';
    let currentBox = { children: segment.data.boxes };
    for (const type of path) {
        currentBox = findBox(currentBox.children, type);
        if (!currentBox) return '---';
    }
    return currentBox?.details?.[fieldName]?.value ?? '---';
};

const getFlagValue = (segment, path) => {
    if (!segment) return '---';
    let currentBox = { children: segment.data.boxes };
    for (const type of path) {
        currentBox = findBox(currentBox.children, type);
        if (!currentBox) return '---';
    }
    const flags = currentBox?.details?.['flags']?.value;
    return flags ?? '---';
};

const createTableData = (segments, boxType, headers) => {
    const boxes = segments.map((seg) =>
        seg ? findBox(seg.data.boxes, boxType) : null
    );
    const maxEntries = Math.max(
        ...boxes.map((box) => box?.entries?.length || 0)
    );
    if (maxEntries === 0) return null;

    const entries = [];
    for (let i = 0; i < maxEntries; i++) {
        const values = boxes.map((box) => box?.entries?.[i] || null);
        const firstValue = values[0];
        const isSame = values.every(
            (v) => JSON.stringify(v) === JSON.stringify(firstValue)
        );
        entries.push({ values, status: isSame ? 'same' : 'different' });
    }

    return { headers, entries };
};

/**
 * Creates a generic, field-by-field comparator for any box type.
 * @param {string} boxType - The type of the box to compare.
 * @returns {(segments: object[]) => {title: string, fullName: string, rows: object[], isGeneric: boolean}}
 */
const createGenericComparator = (boxType) => {
    return (segments) => {
        const allFields = new Set();
        segments.forEach((seg) => {
            const box = seg ? findBox(seg.data.boxes, boxType) : null;
            if (box) {
                Object.keys(box.details).forEach((key) => {
                    // Ignore raw values if a decoded version exists
                    if (
                        !key.endsWith('_raw') ||
                        !box.details[key.replace('_raw', '')]
                    ) {
                        allFields.add(key);
                    }
                });
            }
        });

        const rows = Array.from(allFields)
            .sort((a, b) => a.localeCompare(b))
            .map((field) => {
                const values = segments.map((seg) => {
                    const box = seg ? findBox(seg.data.boxes, boxType) : null;
                    const value = box?.details[field]?.value;
                    if (
                        field === 'flags' &&
                        typeof value === 'object' &&
                        value !== null
                    ) {
                        return value;
                    }
                    return value ?? '---';
                });
                const tooltipInfo =
                    allIsoTooltipData[`${boxType}@${field}`] || {};
                return createRow(field, values, {
                    tooltip: tooltipInfo.text,
                    isoRef: tooltipInfo.ref,
                });
            });

        const boxInfo = allIsoTooltipData[boxType] || {};
        return {
            title: boxType,
            fullName: boxInfo.name,
            rows,
            isGeneric: true,
        };
    };
};

/**
 * A map of functions to compare specific ISOBMFF boxes for the tabular view.
 */
const boxComparators = {
    ftyp: (s) => ({
        title: 'ftyp',
        fullName: allIsoTooltipData.ftyp?.name,
        rows: [
            createRow(
                'Major Brand',
                s.map((seg) => getBoxField(seg, ['ftyp'], 'majorBrand')),
                allIsoTooltipData['ftyp@majorBrand']
                    ? {
                          tooltip: allIsoTooltipData['ftyp@majorBrand'].text,
                          isoRef: allIsoTooltipData['ftyp@majorBrand'].ref,
                      }
                    : {}
            ),
        ],
    }),
    styp: (s) => ({
        title: 'styp',
        fullName: allIsoTooltipData.styp?.name,
        rows: [
            createRow(
                'Major Brand',
                s.map((seg) => getBoxField(seg, ['styp'], 'majorBrand')),
                allIsoTooltipData['styp@majorBrand']
                    ? {
                          tooltip: allIsoTooltipData['styp@majorBrand'].text,
                          isoRef: allIsoTooltipData['styp@majorBrand'].ref,
                      }
                    : {}
            ),
        ],
    }),
    sidx: (segments) => {
        const sidxBoxes = segments.map((seg) =>
            seg ? findBox(seg.data.boxes, 'sidx') : null
        );
        return {
            title: 'sidx',
            fullName: allIsoTooltipData.sidx?.name,
            rows: [
                createRow(
                    'Reference ID',
                    sidxBoxes.map(
                        (sidx) => sidx?.details?.reference_ID?.value ?? '---'
                    )
                ),
                createRow(
                    'Timescale',
                    sidxBoxes.map(
                        (sidx) => sidx?.details?.timescale?.value ?? '---'
                    )
                ),
                createRow(
                    'Reference Count',
                    sidxBoxes.map(
                        (sidx) => sidx?.details?.reference_count?.value ?? '---'
                    )
                ),
            ],
            tableData: createTableData(segments, 'sidx', [
                { key: 'type', label: 'Type' },
                { key: 'size', label: 'Size' },
                { key: 'duration', label: 'Duration' },
                { key: 'startsWithSap', label: 'SAP' },
            ]),
        };
    },
    tfra: (segments) => {
        const tfraBoxes = segments.map((seg) =>
            seg ? findBox(seg.data.boxes, 'tfra') : null
        );
        return {
            title: 'tfra',
            fullName: allIsoTooltipData.tfra?.name,
            rows: [
                createRow(
                    'Track ID',
                    tfraBoxes.map(
                        (tfra) => tfra?.details?.track_ID?.value ?? '---'
                    )
                ),
                createRow(
                    'Entry Count',
                    tfraBoxes.map(
                        (tfra) =>
                            tfra?.details?.number_of_entries?.value ?? '---'
                    )
                ),
            ],
            tableData: createTableData(segments, 'tfra', [
                { key: 'time', label: 'Time' },
                { key: 'moof_offset', label: 'Moof Offset' },
                { key: 'traf_number', label: 'Traf #' },
                { key: 'trun_number', label: 'Trun #' },
                { key: 'sample_number', label: 'Sample #' },
            ]),
        };
    },
    ctts: (segments) => {
        const cttsBoxes = segments.map((seg) =>
            seg ? findBox(seg.data.boxes, 'ctts') : null
        );
        return {
            title: 'ctts',
            fullName: allIsoTooltipData.ctts?.name,
            rows: [
                createRow(
                    'Entry Count',
                    cttsBoxes.map(
                        (ctts) => ctts?.details?.entry_count?.value ?? '---'
                    )
                ),
            ],
            tableData: createTableData(segments, 'ctts', [
                { key: 'sample_count', label: 'Sample Count' },
                { key: 'sample_offset', label: 'Sample Offset' },
            ]),
        };
    },
    sbgp: (segments) => {
        const sbgpBoxes = segments.map((seg) =>
            seg ? findBox(seg.data.boxes, 'sbgp') : null
        );
        return {
            title: 'sbgp',
            fullName: allIsoTooltipData.sbgp?.name,
            rows: [
                createRow(
                    'Grouping Type',
                    sbgpBoxes.map(
                        (sbgp) => sbgp?.details?.grouping_type?.value ?? '---'
                    )
                ),
                createRow(
                    'Entry Count',
                    sbgpBoxes.map(
                        (sbgp) => sbgp?.details?.entry_count?.value ?? '---'
                    )
                ),
            ],
            tableData: createTableData(segments, 'sbgp', [
                { key: 'sample_count', label: 'Sample Count' },
                {
                    key: 'group_description_index',
                    label: 'Group Index',
                },
            ]),
        };
    },
    sdtp: (segments) => {
        const sdtpBoxes = segments.map((seg) =>
            seg ? findBox(seg.data.boxes, 'sdtp') : null
        );
        return {
            title: 'sdtp',
            fullName: allIsoTooltipData.sdtp?.name,
            rows: [
                createRow(
                    'Sample Count',
                    sdtpBoxes.map(
                        (sdtp) => sdtp?.details?.sample_count?.value ?? '---'
                    )
                ),
            ],
            tableData: createTableData(segments, 'sdtp', [
                { key: 'is_leading', label: 'Is Leading' },
                { key: 'sample_depends_on', label: 'Depends On' },
                { key: 'sample_is_depended_on', label: 'Is Depended On' },
                { key: 'sample_has_redundancy', label: 'Has Redundancy' },
            ]),
        };
    },
    subs: (segments) => {
        const subsBoxes = segments.map((seg) =>
            seg ? findBox(seg.data.boxes, 'subs') : null
        );
        return {
            title: 'subs',
            fullName: allIsoTooltipData.subs?.name,
            rows: [
                createRow(
                    'Entry Count',
                    subsBoxes.map(
                        (subs) => subs?.details?.entry_count?.value ?? '---'
                    )
                ),
            ],
            tableData: createTableData(segments, 'subs', [
                { key: 'sample_delta', label: 'Sample Delta' },
                { key: 'subsample_count', label: 'Subsample Count' },
            ]),
        };
    },
    moof: (s) => ({
        title: 'moof',
        fullName: allIsoTooltipData.moof?.name,
        rows: [
            createRow(
                'Sequence Number',
                s.map((seg) =>
                    getBoxField(seg, ['moof', 'mfhd'], 'sequence_number')
                )
            ),
        ],
    }),
    tfhd: (s) => ({
        title: 'tfhd',
        fullName: allIsoTooltipData.tfhd?.name,
        rows: [
            createRow(
                'Track ID',
                s.map((seg) =>
                    getBoxField(seg, ['moof', 'traf', 'tfhd'], 'track_ID')
                )
            ),
            createRow(
                'Flags',
                s.map((seg) => getFlagValue(seg, ['moof', 'traf', 'tfhd']))
            ),
        ],
    }),
    tfdt: (s) => ({
        title: 'tfdt',
        fullName: allIsoTooltipData.tfdt?.name,
        rows: [
            createRow(
                'Base Media Decode Time',
                s.map((seg) =>
                    getBoxField(
                        seg,
                        ['moof', 'traf', 'tfdt'],
                        'baseMediaDecodeTime'
                    )
                )
            ),
        ],
    }),
    trun: (segments) => {
        const trunBoxes = segments.map((seg) =>
            seg ? findBox(seg.data.boxes, 'trun') : null
        );
        const flags = trunBoxes.map((trun) => trun?.details?.flags?.value);

        const rows = [
            createRow(
                'Sample Count',
                trunBoxes.map(
                    (trun) => trun?.details?.sample_count?.value ?? '---'
                )
            ),
            createRow(
                'Data Offset',
                trunBoxes.map(
                    (trun) => trun?.details?.data_offset?.value ?? '---'
                )
            ),
            createRow('Flags', flags),
        ];

        const calculateStats = (samples, prop) => {
            if (!samples || samples.length === 0) return null;
            const values = samples
                .map((s) => s[prop])
                .filter((v) => v !== undefined);
            if (values.length === 0) return null;
            return {
                min: Math.min(...values),
                max: Math.max(...values),
                avg: (
                    values.reduce((a, b) => a + b, 0) / values.length
                ).toFixed(2),
            };
        };

        const findFirstDifference = (samplesA, samplesB, prop) => {
            if (!samplesA || !samplesB) return '---';
            const len = Math.min(samplesA.length, samplesB.length);
            for (let i = 0; i < len; i++) {
                if (samplesA[i][prop] !== samplesB[i][prop]) {
                    return `index ${i} (${samplesA[i][prop]} vs ${samplesB[i][prop]})`;
                }
            }
            if (samplesA.length !== samplesB.length) {
                return `length mismatch (${samplesA.length} vs ${samplesB.length})`;
            }
            return 'none';
        };

        if (flags[0]?.sample_duration_present) {
            const stats = trunBoxes.map((trun) =>
                calculateStats(trun?.samples, 'duration')
            );
            rows.push(
                createRow(
                    'Min Sample Duration',
                    stats.map((s) => s?.min ?? '---')
                )
            );
            rows.push(
                createRow(
                    'Max Sample Duration',
                    stats.map((s) => s?.max ?? '---')
                )
            );
            rows.push(
                createRow(
                    'Avg Sample Duration',
                    stats.map((s) => s?.avg ?? '---')
                )
            );
            if (segments.length > 1) {
                rows.push(
                    createRow('First differing duration', [
                        findFirstDifference(
                            trunBoxes[0]?.samples,
                            trunBoxes[1]?.samples,
                            'duration'
                        ),
                    ])
                );
            }
        }

        if (flags[0]?.sample_size_present) {
            const stats = trunBoxes.map((trun) =>
                calculateStats(trun?.samples, 'size')
            );
            rows.push(
                createRow(
                    'Min Sample Size',
                    stats.map((s) => s?.min ?? '---')
                )
            );
            rows.push(
                createRow(
                    'Max Sample Size',
                    stats.map((s) => s?.max ?? '---')
                )
            );
            rows.push(
                createRow(
                    'Avg Sample Size',
                    stats.map((s) => s?.avg ?? '---')
                )
            );
            if (segments.length > 1) {
                rows.push(
                    createRow('First differing size', [
                        findFirstDifference(
                            trunBoxes[0]?.samples,
                            trunBoxes[1]?.samples,
                            'size'
                        ),
                    ])
                );
            }
        }

        if (flags[0]?.sample_composition_time_offsets_present) {
            const stats = trunBoxes.map((trun) =>
                calculateStats(trun?.samples, 'compositionTimeOffset')
            );
            rows.push(
                createRow(
                    'Min CTS Offset',
                    stats.map((s) => s?.min ?? '---')
                )
            );
            rows.push(
                createRow(
                    'Max CTS Offset',
                    stats.map((s) => s?.max ?? '---')
                )
            );
            rows.push(
                createRow(
                    'Avg CTS Offset',
                    stats.map((s) => s?.avg ?? '---')
                )
            );
            if (segments.length > 1) {
                rows.push(
                    createRow('First differing CTS Offset', [
                        findFirstDifference(
                            trunBoxes[0]?.samples,
                            trunBoxes[1]?.samples,
                            'compositionTimeOffset'
                        ),
                    ])
                );
            }
        }

        const tableHeaders = [];
        if (flags[0]?.sample_duration_present)
            tableHeaders.push({ key: 'duration', label: 'Duration' });
        if (flags[0]?.sample_size_present)
            tableHeaders.push({ key: 'size', label: 'Size' });
        if (flags[0]?.sample_flags_present)
            tableHeaders.push({ key: 'flags', label: 'Flags' });
        if (flags[0]?.sample_composition_time_offsets_present)
            tableHeaders.push({
                key: 'compositionTimeOffset',
                label: 'CTS Offset',
            });

        return {
            title: 'trun',
            fullName: allIsoTooltipData.trun?.name,
            rows,
            isGeneric: false,
            tableData:
                tableHeaders.length > 0
                    ? {
                          headers: tableHeaders,
                          entries: (() => {
                              const maxEntries = Math.max(
                                  ...trunBoxes.map(
                                      (trun) => trun?.samples?.length || 0
                                  )
                              );
                              const tableEntries = [];
                              for (let i = 0; i < maxEntries; i++) {
                                  const values = trunBoxes.map(
                                      (trun) => trun?.samples?.[i] || null
                                  );
                                  const isSame = values.every(
                                      (v) =>
                                          JSON.stringify(v) ===
                                          JSON.stringify(values[0])
                                  );
                                  tableEntries.push({
                                      values,
                                      status: isSame ? 'same' : 'different',
                                  });
                              }
                              return tableEntries;
                          })(),
                      }
                    : null,
        };
    },
    pssh: (s) => ({
        title: 'pssh',
        fullName: allIsoTooltipData.pssh?.name,
        rows: [
            createRow(
                'System ID',
                s.map((seg) => getBoxField(seg, ['pssh'], 'System ID'))
            ),
        ],
    }),
    tenc: (s) => ({
        title: 'tenc',
        fullName: allIsoTooltipData.tenc?.name,
        rows: [
            createRow(
                'Default IV Size',
                s.map((seg) =>
                    getBoxField(
                        seg,
                        [
                            'moov',
                            'trak',
                            'mdia',
                            'minf',
                            'stbl',
                            'stsd',
                            'encv',
                            'sinf',
                            'schi',
                            'tenc',
                        ],
                        'default_Per_Sample_IV_Size'
                    )
                )
            ),
        ],
    }),
    elst: (s) => ({
        title: 'elst',
        fullName: allIsoTooltipData.elst?.name,
        rows: [
            createRow(
                'Entry Count',
                s.map((seg) =>
                    getBoxField(
                        seg,
                        ['moov', 'trak', 'edts', 'elst'],
                        'entry_count'
                    )
                )
            ),
        ],
    }),
    trex: (s) => ({
        title: 'trex',
        fullName: allIsoTooltipData.trex?.name,
        rows: [
            createRow(
                'Track ID',
                s.map((seg) =>
                    getBoxField(seg, ['moov', 'mvex', 'trex'], 'track_ID')
                )
            ),
        ],
    }),
    stts: (segments) => {
        const sttsBoxes = segments.map((seg) =>
            seg ? findBox(seg.data.boxes, 'stts') : null
        );
        const totalSamples = sttsBoxes.map(
            (stts) =>
                stts?.entries?.reduce(
                    (sum, entry) => sum + entry.sample_count,
                    0
                ) ?? '---'
        );
        const totalDuration = sttsBoxes.map(
            (stts) =>
                stts?.entries?.reduce(
                    (sum, entry) =>
                        sum + entry.sample_count * entry.sample_delta,
                    0
                ) ?? '---'
        );

        return {
            title: 'stts',
            fullName: allIsoTooltipData.stts?.name,
            rows: [
                createRow(
                    'Entry Count',
                    sttsBoxes.map(
                        (stts) => stts?.details?.entry_count?.value ?? '---'
                    )
                ),
                createRow('Total Sample Count', totalSamples),
                createRow('Total Duration', totalDuration),
            ],
            tableData: createTableData(segments, 'stts', [
                { key: 'sample_count', label: 'Sample Count' },
                { key: 'sample_delta', label: 'Sample Delta' },
            ]),
        };
    },
    stsc: (segments) => {
        const stscBoxes = segments.map((seg) =>
            seg ? findBox(seg.data.boxes, 'stsc') : null
        );

        return {
            title: 'stsc',
            fullName: allIsoTooltipData.stsc?.name,
            rows: [
                createRow(
                    'Entry Count',
                    stscBoxes.map(
                        (stsc) => stsc?.details?.entry_count?.value ?? '---'
                    )
                ),
            ],
            tableData: createTableData(segments, 'stsc', [
                { key: 'first_chunk', label: 'First Chunk' },
                { key: 'samples_per_chunk', label: 'Samples/Chunk' },
                { key: 'sample_description_index', label: 'Desc Index' },
            ]),
        };
    },
    stsz: (segments) => {
        const stszBoxes = segments.map((seg) =>
            seg ? findBox(seg.data.boxes, 'stsz') : null
        );
        const sampleSizes = stszBoxes.map(
            (stsz) => stsz?.details?.sample_size?.value ?? '---'
        );

        const rows = [createRow('Sample Size (default)', sampleSizes)];
        let tableData = null;

        if (sampleSizes.some((s) => s === 0)) {
            const totalSizes = stszBoxes.map(
                (stsz) =>
                    stsz?.entries?.reduce(
                        (sum, entry) => sum + entry.entry_size,
                        0
                    ) ?? 0
            );
            const sampleCounts = stszBoxes.map(
                (stsz) => stsz?.details?.sample_count?.value ?? 0
            );
            const avgSizes = totalSizes.map((total, i) =>
                sampleCounts[i] > 0
                    ? (total / sampleCounts[i]).toFixed(2)
                    : '---'
            );

            rows.push(
                createRow(
                    'Sample Count',
                    stszBoxes.map(
                        (stsz) => stsz?.details?.sample_count?.value ?? '---'
                    )
                )
            );
            rows.push(
                createRow(
                    'Average Sample Size',
                    avgSizes.map((v) => (v === '---' ? v : `${v} bytes`))
                )
            );
            tableData = createTableData(segments, 'stsz', [
                { key: 'entry_size', label: 'Entry Size' },
            ]);
        }

        return {
            title: 'stsz',
            fullName: allIsoTooltipData.stsz?.name,
            rows,
            tableData,
        };
    },
    stco: (segments) => {
        const stcoBoxes = segments.map((seg) =>
            seg ? findBox(seg.data.boxes, 'stco') : null
        );

        return {
            title: 'stco',
            fullName: allIsoTooltipData.stco?.name,
            rows: [
                createRow(
                    'Entry Count',
                    stcoBoxes.map(
                        (stco) => stco?.details?.entry_count?.value ?? '---'
                    )
                ),
            ],
            tableData: createTableData(segments, 'stco', [
                { key: 'chunk_offset', label: 'Chunk Offset' },
            ]),
        };
    },
    stss: (segments) => {
        const stssBoxes = segments.map((seg) =>
            seg ? findBox(seg.data.boxes, 'stss') : null
        );

        return {
            title: 'stss',
            fullName: allIsoTooltipData.stss?.name,
            rows: [
                createRow(
                    'Sync Sample Count',
                    stssBoxes.map(
                        (stss) => stss?.details?.entry_count?.value ?? '---'
                    )
                ),
            ],
            tableData: createTableData(segments, 'stss', [
                { key: 'sample_number', label: 'Sample Number' },
            ]),
        };
    },
};

/**
 * Performs a deep comparison of two box 'details' objects.
 * @param {object | undefined} detailsA
 * @param {object | undefined} detailsB
 * @returns {boolean} True if the details are semantically equal.
 */
function areDetailsEqual(detailsA, detailsB) {
    if (!detailsA || !detailsB) return detailsA === detailsB;
    const keysA = Object.keys(detailsA);
    const keysB = Object.keys(detailsB);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(detailsB, key)) return false;

        const valA = detailsA[key].value;
        const valB = detailsB[key].value;

        if (
            typeof valA === 'object' &&
            valA !== null &&
            typeof valB === 'object' &&
            valB !== null
        ) {
            if (JSON.stringify(valA) !== JSON.stringify(valB)) return false;
        } else if (valA !== valB) {
            return false;
        }
    }
    return true;
}

/**
 * Performs a recursive, structural diff of two ISOBMFF box trees.
 * @param {Box[]} boxesA
 * @param {Box[]} boxesB
 * @returns {object[]} A unified tree with status annotations.
 */
export function diffBoxTrees(boxesA = [], boxesB = []) {
    const aLen = boxesA.length;
    const bLen = boxesB.length;
    const maxLen = aLen + bLen;

    // --- ARCHITECTURAL FIX: Handle identical structural case (d=0) explicitly ---
    // If both arrays have the same length and every box type matches in order,
    // we treat this as a structural match and proceed to deep comparison immediately.
    // This avoids the Myers algorithm skipping the backtrack when edit distance is 0.
    let isStructurallyIdentical = aLen === bLen;
    if (isStructurallyIdentical) {
        for (let i = 0; i < aLen; i++) {
            if (boxesA[i].type !== boxesB[i].type) {
                isStructurallyIdentical = false;
                break;
            }
        }
    }

    if (isStructurallyIdentical) {
        const diff = [];
        for (let i = 0; i < aLen; i++) {
            const children = diffBoxTrees(
                boxesA[i].children,
                boxesB[i].children
            );
            const detailsEqual = areDetailsEqual(
                boxesA[i].details,
                boxesB[i].details
            );
            const isModified =
                !detailsEqual || children.some((c) => c.status !== 'same');

            diff.push({
                status: isModified ? 'modified' : 'same',
                type: boxesA[i].type,
                values: [boxesA[i], boxesB[i]],
                children,
            });
        }
        return diff;
    }

    // --- Myers Diff Algorithm (for structural changes) ---
    const v = { 1: 0 };
    const trace = [];

    for (let d = 0; d <= maxLen; d++) {
        trace.push({ ...v });
        for (let k = -d; k <= d; k += 2) {
            let i =
                k === -d || (k !== d && v[k - 1] < v[k + 1])
                    ? v[k + 1]
                    : v[k - 1] + 1;
            let j = i - k;
            while (i < aLen && j < bLen && boxesA[i].type === boxesB[j].type) {
                i++;
                j++;
            }
            v[k] = i;
            if (i >= aLen && j >= bLen) {
                const diff = [];
                let x = aLen,
                    y = bLen;
                for (let d_ = d; d_ > 0; d_--) {
                    const v_ = trace[d_];
                    const k_ = x - y;
                    const prev_k =
                        k_ === -d_ || (k_ !== d_ && v_[k_ - 1] < v_[k_ + 1])
                            ? k_ + 1
                            : k_ - 1;
                    const prev_x = v_[prev_k];
                    const prev_y = prev_x - prev_k;

                    while (x > prev_x || y > prev_y) {
                        const before_x = x > prev_x ? x - 1 : x;
                        const before_y = y > prev_y ? y - 1 : y;
                        if (
                            before_x < aLen &&
                            before_y < bLen &&
                            boxesA[before_x].type === boxesB[before_y].type
                        ) {
                            const children = diffBoxTrees(
                                boxesA[before_x].children,
                                boxesB[before_y].children
                            );
                            const detailsEqual = areDetailsEqual(
                                boxesA[before_x].details,
                                boxesB[before_y].details
                            );
                            const isModified =
                                !detailsEqual ||
                                children.some((c) => c.status !== 'same');
                            diff.unshift({
                                status: isModified ? 'modified' : 'same',
                                type: boxesA[before_x].type,
                                values: [boxesA[before_x], boxesB[before_y]],
                                children,
                            });
                        } else if (x > prev_x) {
                            diff.unshift({
                                status: 'removed',
                                type: boxesA[before_x].type,
                                values: [boxesA[before_x], null],
                                children: diffBoxTrees(
                                    boxesA[before_x].children,
                                    []
                                ),
                            });
                        } else {
                            diff.unshift({
                                status: 'added',
                                type: boxesB[before_y].type,
                                values: [null, boxesB[before_y]],
                                children: diffBoxTrees(
                                    [],
                                    boxesB[before_y].children
                                ),
                            });
                        }
                        x = before_x;
                        y = before_y;
                    }
                    x = prev_x;
                    y = prev_y;
                }

                // Handle remaining diagonal (initial snake)
                while (x > 0 && y > 0) {
                    const before_x = x - 1;
                    const before_y = y - 1;
                    const children = diffBoxTrees(
                        boxesA[before_x].children,
                        boxesB[before_y].children
                    );
                    const detailsEqual = areDetailsEqual(
                        boxesA[before_x].details,
                        boxesB[before_y].details
                    );
                    const isModified =
                        !detailsEqual ||
                        children.some((c) => c.status !== 'same');

                    diff.unshift({
                        status: isModified ? 'modified' : 'same',
                        type: boxesA[before_x].type,
                        values: [boxesA[before_x], boxesB[before_y]],
                        children,
                    });
                    x--;
                    y--;
                }

                return diff;
            }
        }
    }
    return [];
}

/**
 * Compares an array of parsed ISOBMFF segments.
 * @param {object[]} segments - An array of parsed segment objects.
 * @returns {{sections: object[], structuralDiff: object[]}} A structured comparison model.
 */
export function compareIsobmffSegments(segments) {
    const allBoxTypes = new Set();
    segments.forEach((segment) => {
        if (segment) {
            const boxes = segment.data.boxes || [];
            // Recursively find all box types
            const findTypes = (boxList) => {
                for (const box of boxList) {
                    allBoxTypes.add(box.type);
                    if (box.children) {
                        findTypes(box.children);
                    }
                }
            };
            findTypes(boxes);
        }
    });

    const sections = [];
    for (const boxType of Array.from(allBoxTypes).sort((a, b) =>
        a.localeCompare(b)
    )) {
        const comparator =
            boxComparators[boxType] || createGenericComparator(boxType);
        const section = comparator(segments);
        if (section.rows.length > 0 || section.tableData) {
            sections.push(section);
        }
    }

    // --- Structural Diff (for first two segments only) ---
    const structuralDiff =
        segments.length >= 2
            ? diffBoxTrees(segments[0]?.data?.boxes, segments[1]?.data?.boxes)
            : [];

    return { sections, structuralDiff };
}