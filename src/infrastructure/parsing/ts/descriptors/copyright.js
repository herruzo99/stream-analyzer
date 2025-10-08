/**
 * Parses a Copyright Descriptor.
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseCopyrightDescriptor(view, baseOffset) {
    const identifier = view.getUint32(0);
    return {
        copyright_identifier: {
            value: `0x${identifier.toString(16).padStart(8, '0')}`,
            offset: baseOffset,
            length: 4,
        },
    };
}
