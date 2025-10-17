/**
 * @typedef {import('@/types').Box} Box
 */

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
 * @returns {object}
 */
const createRow = (name, values) => {
    const firstValue = values[0];
    const isSame = values.every((v) => JSON.stringify(v) === JSON.stringify(firstValue));
    let status = isSame ? 'same' : 'different';

    const missingIndices = values.map((v, i) => (v === '---' ? i : -1)).filter(i => i !== -1);
    if (missingIndices.length > 0 && missingIndices.length < values.length) {
        status = 'missing';
    }

    const displayValues = values.map(v => {
        if (typeof v === 'object' && v !== null) {
            return isSame ? Object.entries(v).filter(([, val]) => val).map(([key]) => key).join(', ') || 'none' : 'See Diff';
        }
        return v;
    });

    return { name, values: displayValues, status };
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
    if (typeof flags !== 'object' || flags === null) return flags ?? '---';
    return Object.entries(flags).filter(([,v]) => v).map(([k]) => k).join(', ') || 'none';
};

/**
 * Creates a generic, field-by-field comparator for any box type.
 * @param {string} boxType - The type of the box to compare.
 * @returns {(segments: object[]) => {title: string, rows: object[], isGeneric: boolean}}
 */
const createGenericComparator = (boxType) => {
    return (segments) => {
        const allFields = new Set();
        segments.forEach(seg => {
            const box = seg ? findBox(seg.data.boxes, boxType) : null;
            if (box) {
                Object.keys(box.details).forEach(key => {
                    // Ignore raw values if a decoded version exists
                    if (!key.endsWith('_raw') || !box.details[key.replace('_raw', '')]) {
                        allFields.add(key);
                    }
                });
            }
        });

        const rows = Array.from(allFields).sort().map(field => {
            const values = segments.map(seg => {
                const box = seg ? findBox(seg.data.boxes, boxType) : null;
                const value = box?.details[field]?.value;
                if (field === 'flags' && typeof value === 'object' && value !== null) {
                    return Object.entries(value).filter(([,v]) => v).map(([k]) => k).join(', ') || 'none';
                }
                return value ?? '---';
            });
            return createRow(field, values);
        });

        return { title: boxType, rows, isGeneric: true };
    };
};

/**
 * A map of functions to compare specific ISOBMFF boxes for the tabular view.
 */
const boxComparators = {
    // This is a pseudo-box for the overall chunk
    'CMAF Chunk': (segments) => ({
        title: 'CMAF Chunk',
        rows: [
            createRow('Total Size', segments.map(seg => {
                const chunk = seg ? seg.data.boxes.find(b => b.isChunk) : null;
                return chunk ? `${chunk.size} bytes` : '---';
            }))
        ],
        isGeneric: false,
    }),
    ftyp: s => ({ title: 'ftyp (File Type)', rows: [createRow('Major Brand', s.map(seg => getBoxField(seg, ['ftyp'], 'majorBrand')))] }),
    styp: s => ({ title: 'styp (Segment Type)', rows: [createRow('Major Brand', s.map(seg => getBoxField(seg, ['styp'], 'majorBrand')))] }),
    sidx: s => ({ title: 'sidx (Segment Index)', rows: [
        createRow('Reference ID', s.map(seg => getBoxField(seg, ['sidx'], 'reference_ID'))),
        createRow('Timescale', s.map(seg => getBoxField(seg, ['sidx'], 'timescale'))),
        createRow('Reference Count', s.map(seg => getBoxField(seg, ['sidx'], 'reference_count'))),
    ]}),
    moof: s => ({ title: 'moof (Movie Fragment)', rows: [
        createRow('Sequence Number', s.map(seg => getBoxField(seg, ['moof', 'mfhd'], 'sequence_number'))),
    ]}),
    tfhd: s => ({ title: 'tfhd (Track Fragment Header)', rows: [
        createRow('Track ID', s.map(seg => getBoxField(seg, ['moof', 'traf', 'tfhd'], 'track_ID'))),
        createRow('Flags', s.map(seg => getFlagValue(seg, ['moof', 'traf', 'tfhd']))),
    ]}),
    tfdt: s => ({ title: 'tfdt (Track Fragment Decode Time)', rows: [
        createRow('Base Media Decode Time', s.map(seg => getBoxField(seg, ['moof', 'traf', 'tfdt'], 'baseMediaDecodeTime'))),
    ]}),
    trun: segments => {
        const rows = [
            createRow('Sample Count', segments.map(seg => getBoxField(seg, ['moof', 'traf', 'trun'], 'sample_count'))),
            createRow('Data Offset', segments.map(seg => getBoxField(seg, ['moof', 'traf', 'trun'], 'data_offset'))),
            createRow('Flags', segments.map(seg => getFlagValue(seg, ['moof', 'traf', 'trun']))),
        ];

        const trunBoxes = segments.map(seg => seg ? findBox(seg.data.boxes, 'trun') : null);
        const firstSamples = trunBoxes.map(trun => trun?.samples?.[0]);
        const lastSamples = trunBoxes.map(trun => trun?.samples?.[trun.samples.length - 1]);

        if (firstSamples.some(s => s)) {
            rows.push(createRow('First Sample Duration', firstSamples.map(s => s?.duration ?? '---')));
            rows.push(createRow('First Sample Size', firstSamples.map(s => s?.size ?? '---')));
        }
        if (lastSamples.some(s => s)) {
            rows.push(createRow('Last Sample Duration', lastSamples.map(s => s?.duration ?? '---')));
            rows.push(createRow('Last Sample Size', lastSamples.map(s => s?.size ?? '---')));
        }

        return { title: 'trun (Track Fragment Run)', rows };
    },
    pssh: s => ({ title: 'pssh (Protection System Specific Header)', rows: [
        createRow('System ID', s.map(seg => getBoxField(seg, ['pssh'], 'System ID'))),
    ]}),
    tenc: s => ({ title: 'tenc (Track Encryption)', rows: [
        createRow('Default IV Size', s.map(seg => getBoxField(seg, ['moov', 'trak', 'mdia', 'minf', 'stbl', 'stsd', 'encv', 'sinf', 'schi', 'tenc'], 'default_Per_Sample_IV_Size'))),
    ]}),
    elst: s => ({ title: 'elst (Edit List)', rows: [
        createRow('Entry Count', s.map(seg => getBoxField(seg, ['moov', 'trak', 'edts', 'elst'], 'entry_count'))),
    ]}),
    trex: s => ({ title: 'trex (Track Extends)', rows: [
        createRow('Track ID', s.map(seg => getBoxField(seg, ['moov', 'mvex', 'trex'], 'track_ID'))),
    ]}),
    stts: s => ({ title: 'stts (Time-to-Sample)', rows: [createRow('Entry Count', s.map(seg => getBoxField(seg, ['moov', 'trak', 'mdia', 'minf', 'stbl', 'stts'], 'entry_count')))] }),
    stsc: s => ({ title: 'stsc (Sample-to-Chunk)', rows: [createRow('Entry Count', s.map(seg => getBoxField(seg, ['moov', 'trak', 'mdia', 'minf', 'stbl', 'stsc'], 'entry_count')))] }),
    stsz: s => ({ title: 'stsz (Sample Size)', rows: [
        createRow('Sample Count', s.map(seg => getBoxField(seg, ['moov', 'trak', 'mdia', 'minf', 'stbl', 'stsz'], 'sample_count'))),
    ]}),
    stco: s => ({ title: 'stco (Chunk Offset)', rows: [createRow('Entry Count', s.map(seg => getBoxField(seg, ['moov', 'trak', 'mdia', 'minf', 'stbl', 'stco'], 'entry_count')))] }),
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
        if (!detailsB[key]) return false;

        const valA = detailsA[key].value;
        const valB = detailsB[key].value;
        
        if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
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
    const v = { 1: 0 };
    const trace = [];

    for (let d = 0; d <= maxLen; d++) {
        trace.push({ ...v });
        for (let k = -d; k <= d; k += 2) {
            let i = k === -d || (k !== d && v[k - 1] < v[k + 1]) ? v[k + 1] : v[k - 1] + 1;
            let j = i - k;
            while (i < aLen && j < bLen && boxesA[i].type === boxesB[j].type) {
                i++;
                j++;
            }
            v[k] = i;
            if (i >= aLen && j >= bLen) {
                const diff = [];
                let x = aLen, y = bLen;
                for (let d_ = d; d_ > 0; d_--) {
                    const v_ = trace[d_];
                    const k_ = x - y;
                    const prev_k = k_ === -d_ || (k_ !== d_ && v_[k_ - 1] < v_[k_ + 1]) ? k_ + 1 : k_ - 1;
                    const prev_x = v_[prev_k];
                    const prev_y = prev_x - prev_k;

                    while (x > prev_x || y > prev_y) {
                        const before_x = (x > prev_x) ? x - 1 : x;
                        const before_y = (y > prev_y) ? y - 1 : y;
                        if (before_x < aLen && before_y < bLen && boxesA[before_x].type === boxesB[before_y].type) {
                            const children = diffBoxTrees(boxesA[before_x].children, boxesB[before_y].children);
                            const detailsEqual = areDetailsEqual(boxesA[before_x].details, boxesB[before_y].details);
                            const isModified = !detailsEqual || children.some(c => c.status !== 'same');
                            diff.unshift({ status: isModified ? 'modified' : 'same', type: boxesA[before_x].type, values: [boxesA[before_x], boxesB[before_y]], children });
                        } else if (x > prev_x) {
                            diff.unshift({ status: 'removed', type: boxesA[before_x].type, values: [boxesA[before_x], null], children: diffBoxTrees(boxesA[before_x].children, []) });
                        } else {
                            diff.unshift({ status: 'added', type: boxesB[before_y].type, values: [null, boxesB[before_y]], children: diffBoxTrees([], boxesB[before_y].children) });
                        }
                        x = before_x;
                        y = before_y;
                    }
                    x = prev_x;
                    y = prev_y;
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
    segments.forEach(segment => {
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
    for (const boxType of Array.from(allBoxTypes).sort()) {
        const comparator = boxComparators[boxType] || createGenericComparator(boxType);
        const section = comparator(segments);
        if (section.rows.length > 0) {
            sections.push(section);
        }
    }

    // --- Structural Diff (for first two segments only) ---
    const structuralDiff = segments.length >= 2 ? diffBoxTrees(segments[0]?.data?.boxes, segments[1]?.data?.boxes) : [];
    
    return { sections, structuralDiff };
}