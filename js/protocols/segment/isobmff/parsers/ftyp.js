import { BoxParser } from '../utils.js';

/**
 * Parser for the 'ftyp' (File Type Box) and 'styp' (Segment Type Box).
 * ISO/IEC 14496-12
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseFtypStyp(box, view) {
    const p = new BoxParser(box, view);

    p.readString(4, 'majorBrand');
    p.readUint32('minorVersion');

    const compatibleBrands = [];
    const cmafBrands = [];
    const compatibleBrandsOffset = p.offset;
    while (p.offset < box.size) {
        if (p.stopped) break;
        const brand = p.readString(4, `brand_${compatibleBrands.length}`);
        if (brand === null) break;
        compatibleBrands.push(brand);
        if (brand.startsWith('cmf')) {
            cmafBrands.push(brand);
        }
        delete box.details[`brand_${compatibleBrands.length - 1}`];
    }

    if (compatibleBrands.length > 0) {
        box.details['compatibleBrands'] = {
            value: compatibleBrands.join(', '),
            offset: box.offset + compatibleBrandsOffset,
            length: p.offset - compatibleBrandsOffset,
        };
    }
    if (cmafBrands.length > 0) {
        box.details['cmafBrands'] = {
            value: cmafBrands.join(', '),
            offset: 0, // Not tied to a specific byte location, but derived
            length: 0,
        };
    }
    p.finalize();
}

/**
 * Tooltip metadata for 'ftyp' and 'styp'
 */
export const ftypStypTooltip = {
    ftyp: {
        name: 'File Type',
        text: 'File Type Box: declares the major brand, minor version, and compatible brands for the file.',
        ref: 'ISO/IEC 14496-12:2022, Section 4.3',
    },
    'ftyp@majorBrand': {
        text: 'The major brand of the file, indicating its primary specification.',
        ref: 'ISO/IEC 14496-12:2022, Section 4.3',
    },
    'ftyp@minorVersion': {
        text: 'The minor version of the major brand.',
        ref: 'ISO/IEC 14496-12:2022, Section 4.3',
    },
    'ftyp@compatibleBrands': {
        text: 'Other brands that the file is compatible with.',
        ref: 'ISO/IEC 14496-12:2022, Section 4.3',
    },
    'ftyp@cmafBrands': {
        text: 'A list of CMAF-specific structural or media profile brands detected in this box.',
        ref: 'ISO/IEC 23000-19:2020(E), Clause 7.2',
    },
    styp: {
        name: 'Segment Type',
        text: "Declares the segment's brand and compatibility.",
        ref: 'ISO/IEC 14496-12, 8.16.2',
    },
    'styp@majorBrand': {
        text: "The 'best use' specification for the segment.",
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
    'styp@minorVersion': {
        text: 'An informative integer for the minor version of the major brand.',
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
    'styp@compatibleBrands': {
        text: 'A list of other specifications to which the segment complies.',
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
};
