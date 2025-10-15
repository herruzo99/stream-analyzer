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
        name: 'File Type Box',
        text: 'File Type Box (`ftyp`). A mandatory box that must appear as early as possible in the file. It identifies the "best use" specification (major brand) and a list of other specifications to which the file complies (compatible brands).',
        ref: 'ISO/IEC 14496-12:2015, Section 4.3',
    },
    'ftyp@majorBrand': {
        text: 'The major brand of the file. This is a four-character code that identifies the primary specification the file is intended to conform to (e.g., "isom", "mp42", "cmfc").',
        ref: 'ISO/IEC 14496-12:2015, Section 4.3.3',
    },
    'ftyp@minorVersion': {
        text: 'An informative integer indicating the minor version of the major brand specification.',
        ref: 'ISO/IEC 14496-12:2015, Section 4.3.3',
    },
    'ftyp@compatibleBrands': {
        text: 'A list of four-character codes for other specifications to which the file also conforms. A player can use this list to determine if it is capable of processing the file.',
        ref: 'ISO/IEC 14496-12:2015, Section 4.3.3',
    },
    'ftyp@cmafBrands': {
        text: 'A derived list of CMAF-specific structural or media profile brands detected in this box. Brands like "cmfc" (structural) or "cmf2" (profile) indicate CMAF conformance.',
        ref: 'ISO/IEC 23000-19:2020(E), Clause 7.2',
    },
    styp: {
        name: 'Segment Type Box',
        text: 'Segment Type Box (`styp`). Similar to `ftyp`, this box identifies the brands of a media segment. It is recommended to be the first box in a segment file to enable identification and compatibility checks.',
        ref: 'ISO/IEC 14496-12, 8.16.2',
    },
    'styp@majorBrand': {
        text: 'The "best use" specification for this media segment.',
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
    'styp@minorVersion': {
        text: 'An informative integer for the minor version of the major brand.',
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
    'styp@compatibleBrands': {
        text: 'A list of other specifications to which this segment also complies.',
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
};