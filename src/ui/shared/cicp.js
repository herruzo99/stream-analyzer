/**
 * Maps CICP (Coding-Independent Code Points) integers to human-readable strings.
 * Reference: ISO/IEC 23001-8
 */

const PRIMARIES = {
    1: 'BT.709',
    2: 'Unspecified',
    4: 'BT.470M',
    5: 'BT.470BG',
    6: 'SMPTE 170M',
    7: 'SMPTE 240M',
    9: 'BT.2020',
    10: 'SMPTE 428',
    11: 'DCI-P3 (SMPTE 431)',
    12: 'Display P3 (SMPTE 432)',
};

const TRANSFER = {
    1: 'BT.709',
    2: 'Unspecified',
    4: 'Gamma 2.2',
    5: 'Gamma 2.8',
    6: 'SMPTE 170M',
    7: 'SMPTE 240M',
    8: 'Linear',
    9: 'Log 100:1',
    10: 'Log 316:1',
    11: 'IEC 61966-2-4',
    12: 'BT.1361',
    13: 'sRGB',
    14: 'BT.2020 (10-bit)',
    15: 'BT.2020 (12-bit)',
    16: 'PQ (SMPTE ST 2084)',
    17: 'SMPTE 428',
    18: 'HLG (ARIB STD-B67)',
};

const MATRIX = {
    0: 'Identity (RGB)',
    1: 'BT.709',
    2: 'Unspecified',
    4: 'FCC',
    5: 'BT.470BG',
    6: 'SMPTE 170M',
    7: 'SMPTE 240M',
    9: 'BT.2020 (NCL)',
    10: 'BT.2020 (CL)',
    11: 'SMPTE 2085',
    12: 'Chroma Derived (NCL)',
    13: 'Chroma Derived (CL)',
    14: 'BT.2100 (ICtCp)',
};

/**
 * Returns a formatted string describing the color properties.
 * @param {number} primaries
 * @param {number} transfer
 * @param {number} matrix
 * @returns {string} e.g., "BT.2020 / PQ / BT.2020 (NCL)"
 */
export function getCicpLabel(primaries, transfer, matrix) {
    const p = PRIMARIES[primaries] || `Pri:${primaries}`;
    const t = TRANSFER[transfer] || `Trn:${transfer}`;
    const m = MATRIX[matrix] || `Mtx:${matrix}`;

    // Common shorthand combinations
    if (primaries === 1 && transfer === 1 && matrix === 1)
        return 'BT.709 (SDR)';
    if (primaries === 9 && transfer === 16 && matrix === 9)
        return 'BT.2020 / PQ (HDR10)';
    if (primaries === 9 && transfer === 18 && matrix === 9)
        return 'BT.2020 / HLG';

    return `${p} / ${t} / ${m}`;
}
