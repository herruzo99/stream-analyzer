/**
 * Parses an HEVC Tile Substream Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x12, Table 2-128
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseHevcTileSubstreamDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    const byte0 = view.getUint8(offset);
    const referenceFlag = (byte0 >> 7) & 1;
    details.ReferenceFlag = {
        value: referenceFlag,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.SubstreamID = {
        value: byte0 & 0x7f,
        offset: baseOffset + offset,
        length: 0.875,
    };
    offset += 1;

    if (view.byteLength > 1) {
        if (referenceFlag === 1) {
            const byte1 = view.getUint8(offset);
            details.PreambleFlag = {
                value: (byte1 >> 7) & 1,
                offset: baseOffset + offset,
                length: 0.125,
            };
            details.PatternReference = {
                value: byte1 & 0x7f,
                offset: baseOffset + offset,
                length: 0.875,
            };
        } else {
            details.additional_substreams = [];
            while (offset < view.byteLength) {
                const byte = view.getUint8(offset);
                details.additional_substreams.push({
                    Flag: {
                        value: (byte >> 7) & 1,
                        offset: baseOffset + offset,
                        length: 0.125,
                    },
                    AdditionalSubstreamID: {
                        value: byte & 0x7f,
                        offset: baseOffset + offset,
                        length: 0.875,
                    },
                });
                offset += 1;
            }
        }
    }

    return details;
}
