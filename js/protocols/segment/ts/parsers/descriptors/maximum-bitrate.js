/**
 * Parses a Maximum Bitrate Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.26 & Table 2-65
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMaximumBitrateDescriptor(view, baseOffset) {
    const rate = (view.getUint32(0) & 0x003fffff) * 50 * 8; // in bps
    return {
        maximum_bitrate: {
            value: `${(rate / 1000000).toFixed(2)} Mbps`,
            offset: baseOffset,
            length: 4,
        },
    };
}
