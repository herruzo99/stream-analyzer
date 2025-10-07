/**
 * Parses an HEVC Subregion Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x13, Table 2-129
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseHevcSubregionDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    const byte0 = view.getUint8(offset);
    details.SubstreamMarkingFlag = {
        value: (byte0 >> 7) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.SubstreamIDsPerLine = {
        value: byte0 & 0x7f,
        offset: baseOffset + offset,
        length: 0.875,
    };
    offset += 1;

    details.TotalSubstreamIDs = {
        value: view.getUint8(offset),
        offset: baseOffset + offset,
        length: 1,
    };
    offset += 1;

    details.LevelFullPanorama = {
        value: view.getUint8(offset),
        offset: baseOffset + offset,
        length: 1,
    };
    offset += 1;

    // The rest is a loop of layouts, too complex to fully parse without context.
    // We'll just indicate the presence of layout data.
    const remainingBytes = view.byteLength - offset;
    if (remainingBytes > 0) {
        details.layout_data = {
            value: `${remainingBytes} bytes of layout data`,
            offset: baseOffset + offset,
            length: remainingBytes,
        };
    }

    return details;
}
