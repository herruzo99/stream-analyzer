/**
 * Parser for the 'ftyp' (File Type Box) and 'styp' (Segment Type Box).
 * ISO/IEC 14496-12
 * @param {import('../../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseFtypStyp(box, view) {
    let currentParseOffset = box.headerSize;

    // Major Brand
    const majorBrandBytes = new Uint8Array(view.buffer, view.byteOffset + currentParseOffset, 4);
    const majorBrand = String.fromCharCode(...majorBrandBytes);
    box.details['majorBrand'] = { value: majorBrand, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;

    // Minor Version
    const minorVersion = view.getUint32(currentParseOffset);
    box.details['minorVersion'] = { value: minorVersion, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;

    // Compatible Brands
    const compatibleBrands = [];
    let compatibleBrandsOffset = currentParseOffset;
    while (currentParseOffset < box.size) {
        if (currentParseOffset + 4 > box.size) break; // Ensure we don't read past the box end
        const brandBytes = new Uint8Array(view.buffer, view.byteOffset + currentParseOffset, 4);
        compatibleBrands.push(String.fromCharCode(...brandBytes));
        currentParseOffset += 4;
    }
    if (compatibleBrands.length > 0) {
        box.details['compatibleBrands'] = { value: compatibleBrands.join(', '), offset: box.offset + compatibleBrandsOffset, length: currentParseOffset - compatibleBrandsOffset };
    }
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