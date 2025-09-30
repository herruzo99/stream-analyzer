/**
 * Parses a Private Data Indicator Descriptor.
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parsePrivateDataIndicatorDescriptor(view, baseOffset) {
    const indicator = view.getUint32(0);
    return {
        private_data_indicator: {
            value: `0x${indicator.toString(16).padStart(8, '0')}`,
            offset: baseOffset,
            length: 4,
        },
    };
}
