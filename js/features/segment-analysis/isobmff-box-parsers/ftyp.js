/**
 * Parser for the 'ftyp' (File Type Box).
 * ISO/IEC 14496-12
 */
export function parseFtyp(dataView, offset, size) {
    const majorBrand = String.fromCharCode(
        dataView.getUint8(offset),
        dataView.getUint8(offset + 1),
        dataView.getUint8(offset + 2),
        dataView.getUint8(offset + 3)
    );
    const minorVersion = dataView.getUint32(offset + 4);
    const compatibleBrands = [];

    for (let i = 8; i < size; i += 4) {
        compatibleBrands.push(
            String.fromCharCode(
                dataView.getUint8(offset + i),
                dataView.getUint8(offset + i + 1),
                dataView.getUint8(offset + i + 2),
                dataView.getUint8(offset + i + 3)
            )
        );
    }

    return {
        majorBrand,
        minorVersion,
        compatibleBrands,
    };
}

/**
 * Tooltip metadata for 'ftyp'
 * Previously part of isobmff-tooltip-data.js
 */
export const ftypTooltip = {
    ftyp: {
        text: 'File Type Box: declares the major brand, minor version, and compatible brands for the file.',
        isoRef: 'ISO/IEC 14496-12:2022, Section 4.3',
    },
    'ftyp.majorBrand': {
        text: 'The major brand of the file, indicating its primary specification.',
        isoRef: 'ISO/IEC 14496-12:2022, Section 4.3',
    },
    'ftyp.minorVersion': {
        text: 'The minor version of the major brand.',
        isoRef: 'ISO/IEC 14496-12:2022, Section 4.3',
    },
    'ftyp.compatibleBrands': {
        text: 'Other brands that the file is compatible with.',
        isoRef: 'ISO/IEC 14496-12:2022, Section 4.3',
    },
        styp: {
        name: 'Segment Type',
        text: "Declares the segment's brand and compatibility.",
        ref: 'ISO/IEC 14496-12, 8.16.2',
    },
    'styp@Major Brand': {
        text: "The 'best use' specification for the segment.",
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
    'styp@Minor Version': {
        text: 'An informative integer for the minor version of the major brand.',
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
    'styp@Compatible Brands': {
        text: 'A list of other specifications to which the segment complies.',
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
};
