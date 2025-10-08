/**
 * @typedef {object} CmafRuleResult
 * @property {string} id - A unique identifier for the rule.
 * @property {string} text - The human-readable title of the check.
 * @property {string} isoRef - The reference to the ISO/IEC 23000-19:2020(E) standard clause.
 * @property {'pass' | 'fail' | 'warn'} status - The result of the check.
 * @property {string} details - A detailed message about the result.
 */

const findBox = (boxes, type) => {
    for (const box of boxes) {
        if (box.type === type) return box;
        if (box.children?.length > 0) {
            const found = findBox(box.children, type);
            if (found) return found;
        }
    }
    return null;
};

/** @type {Array<(initData: object, mediaData: object) => CmafRuleResult>} */
export const cmafTrackRules = [
    // --- CMAF Header Rules (on init segment) ---
    (initData) => {
        const mvhd = findBox(initData.boxes, 'mvhd');
        const pass = mvhd?.details?.duration?.value === 0;
        return {
            id: 'CMAF-HEADER-MVHD-DUR',
            text: 'Movie Header (mvhd) duration must be 0',
            isoRef: 'Clause 7.5.1',
            status: pass ? 'pass' : 'fail',
            details: pass
                ? 'OK'
                : `mvhd.duration was ${mvhd?.details?.duration?.value}, expected 0.`,
        };
    },
    (initData) => {
        const tkhd = findBox(initData.boxes, 'tkhd');
        const pass = tkhd?.details?.duration?.value === 0;
        return {
            id: 'CMAF-HEADER-TKHD-DUR',
            text: 'Track Header (tkhd) duration must be 0',
            isoRef: 'Clause 7.5.4',
            status: pass ? 'pass' : 'fail',
            details: pass
                ? 'OK'
                : `tkhd.duration was ${tkhd?.details?.duration?.value}, expected 0.`,
        };
    },
    (initData) => {
        const mvex = findBox(initData.boxes, 'mvex');
        const pass = !!mvex;
        return {
            id: 'CMAF-HEADER-MVEX',
            text: 'Movie Extends (mvex) box must be present',
            isoRef: 'Clause 7.3.2.1',
            status: pass ? 'pass' : 'fail',
            details: pass ? 'OK' : 'mvex box not found in moov.',
        };
    },
    (initData) => {
        const trex = findBox(initData.boxes, 'trex');
        const pass = !!trex;
        return {
            id: 'CMAF-HEADER-TREX',
            text: 'Track Extends (trex) box must be present',
            isoRef: 'Clause 7.5.14',
            status: pass ? 'pass' : 'fail',
            details: pass ? 'OK' : 'trex box not found in mvex for the track.',
        };
    },
    // --- CMAF Fragment Rules (on media segment) ---
    (initData, mediaData) => {
        const moof = findBox(mediaData.boxes, 'moof');
        const trafCount = moof?.children?.filter(
            (c) => c.type === 'traf'
        ).length;
        const pass = trafCount === 1;
        return {
            id: 'CMAF-FRAG-MOOF-TRAF',
            text: 'Movie Fragment (moof) must contain exactly one Track Fragment (traf)',
            isoRef: 'Clause 7.3.2.3.b',
            status: pass ? 'pass' : 'fail',
            details: pass ? 'OK' : `Found ${trafCount} traf boxes, expected 1.`,
        };
    },
    (initData, mediaData) => {
        const tfhd = findBox(mediaData.boxes, 'tfhd');
        const flags = tfhd?.details?.flags?.value;
        const baseDataOffsetPresent = flags
            ? (parseInt(flags, 16) & 0x1) !== 0
            : false;
        const defaultBaseIsMoof = flags
            ? (parseInt(flags, 16) & 0x20000) !== 0
            : false;
        const pass = !baseDataOffsetPresent && defaultBaseIsMoof;
        return {
            id: 'CMAF-FRAG-TFHD-FLAGS',
            text: 'Track Fragment Header (tfhd) flags must be set for fragment-relative addressing',
            isoRef: 'Clause 7.5.16',
            status: pass ? 'pass' : 'fail',
            details: pass
                ? 'OK'
                : `base-data-offset-present=${baseDataOffsetPresent} (expected false), default-base-is-moof=${defaultBaseIsMoof} (expected true).`,
        };
    },
    (initData, mediaData) => {
        const traf = findBox(mediaData.boxes, 'traf');
        const tfdt = traf?.children.find((c) => c.type === 'tfdt');
        const pass = !!tfdt;
        return {
            id: 'CMAF-FRAG-TFDT',
            text: 'Track Fragment (traf) must contain a Track Fragment Decode Time (tfdt) box',
            isoRef: 'Clause 7.5.16',
            status: pass ? 'pass' : 'fail',
            details: pass ? 'OK' : 'tfdt box not found in traf.',
        };
    },
    (initData, mediaData) => {
        const trun = findBox(mediaData.boxes, 'trun');
        const flags = trun?.details?.flags?.value;
        const dataOffsetPresent = flags
            ? (parseInt(flags, 16) & 0x1) !== 0
            : false;
        const pass = dataOffsetPresent;
        return {
            id: 'CMAF-FRAG-TRUN-OFFSET',
            text: 'Track Run (trun) must have data-offset-present flag set',
            isoRef: 'Clause 7.5.17',
            status: pass ? 'pass' : 'fail',
            details: pass
                ? 'OK'
                : 'trun data-offset-present flag was not set to true.',
        };
    },
    // --- CMAF Chunk Rules (Low-Latency) ---
    (initData, mediaData) => {
        const moofs = mediaData.boxes.filter((b) => b.type === 'moof');
        if (moofs.length <= 1) return null; // Rule is for multi-chunk segments

        const firstTfhd = findBox(moofs[0].children, 'tfhd');
        if (!firstTfhd) return null;
        const baselineTrackId = firstTfhd.details.track_ID.value;

        for (let i = 1; i < moofs.length; i++) {
            const currentTfhd = findBox(moofs[i].children, 'tfhd');
            if (
                !currentTfhd ||
                currentTfhd.details.track_ID.value !== baselineTrackId
            ) {
                return {
                    id: 'CMAF-CHUNK-CONSISTENCY',
                    text: 'All chunks in a segment must belong to the same track',
                    isoRef: 'Best Practice',
                    status: 'fail',
                    details: `FAIL: Chunk ${i + 1} (moof @ offset ${
                        moofs[i].offset
                    }) has track_ID ${
                        currentTfhd?.details.track_ID.value
                    }, but expected ${baselineTrackId}.`,
                };
            }
        }

        return {
            id: 'CMAF-CHUNK-CONSISTENCY',
            text: 'All chunks in a segment must belong to the same track',
            isoRef: 'Best Practice',
            status: 'pass',
            details: 'OK: All chunks have a consistent track_ID.',
        };
    },
    // --- Common Encryption (CENC) Rules ---
    (initData) => {
        const schm = findBox(initData.boxes, 'schm');
        const tenc = findBox(initData.boxes, 'tenc');
        if (!schm || !tenc) return null; // Rule is not applicable if track is not encrypted

        const isCencScheme = schm.details.scheme_type.value === 'cenc';
        if (!isCencScheme) return null;

        const ivSize = tenc.details.default_Per_Sample_IV_Size?.value;
        const pass = ivSize === 8;

        return {
            id: 'CMAF-CENC-IV-SIZE',
            text: "For 'cenc' scheme, default_Per_Sample_IV_Size must be 8",
            isoRef: 'Clause 8.2.3.1',
            status: pass ? 'pass' : 'fail',
            details: pass
                ? `OK: IV size is ${ivSize}.`
                : `FAIL: default_Per_Sample_IV_Size was ${ivSize}, but CMAF requires 8 for the 'cenc' scheme.`,
        };
    },
    (initData, mediaData) => {
        const sinf = findBox(initData.boxes, 'sinf');
        if (!sinf) return null;

        const traf = findBox(mediaData.boxes, 'traf');
        const saio = findBox(traf?.children || [], 'saio');
        const saiz = findBox(traf?.children || [], 'saiz');
        const pass = !!saio && !!saiz;

        return {
            id: 'CMAF-CENC-AUX-INFO',
            text: 'Encrypted fragments must contain Sample Auxiliary Information boxes (saio, saiz)',
            isoRef: 'Clause 8.2.2.1',
            status: pass ? 'pass' : 'fail',
            details: pass
                ? 'OK: Found both saio and saiz boxes in the track fragment.'
                : `FAIL: Missing required auxiliary info boxes. Found saio: ${!!saio}, Found saiz: ${!!saiz}.`,
        };
    },
    (initData, mediaData) => {
        const schm = findBox(initData.boxes, 'schm');
        const senc = findBox(mediaData.boxes, 'senc');

        if (
            !schm ||
            schm.details.scheme_type.value !== 'cenc' ||
            !senc ||
            !senc.samples
        ) {
            return null; // Rule applies only to 'cenc' scheme with parsed senc samples
        }

        let failingSampleIndex = -1;
        let failingSubsampleIndex = -1;

        for (let i = 0; i < senc.samples.length; i++) {
            const sample = senc.samples[i];
            if (sample.subsamples && sample.subsamples.length > 0) {
                for (let j = 0; j < sample.subsamples.length; j++) {
                    const subsample = sample.subsamples[j];
                    if (subsample.BytesOfProtectedData % 16 !== 0) {
                        failingSampleIndex = i;
                        failingSubsampleIndex = j;
                        break;
                    }
                }
            }
            if (failingSampleIndex !== -1) break;
        }

        const pass = failingSampleIndex === -1;
        return {
            id: 'CMAF-CENC-SUBSAMPLE-ALIGNMENT',
            text: "For 'cenc' scheme, BytesOfProtectedData must be a multiple of 16",
            isoRef: 'Clause 8.2.3.1',
            status: pass ? 'pass' : 'warn', // Standard says "shall", but often violated. Warn is more practical.
            details: pass
                ? 'OK: All subsamples have correctly aligned protected regions.'
                : `FAIL: At least one subsample has a protected data size not a multiple of 16. First failure at sample ${failingSampleIndex + 1}, subsample ${failingSubsampleIndex + 1}.`,
        };
    },
];
