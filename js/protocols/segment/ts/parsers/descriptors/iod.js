/**
 * Parses an IOD (Initial Object Descriptor) Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.40
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseIodDescriptor(view, baseOffset) {
    const scope = view.getUint8(0);
    const label = view.getUint8(1);
    const initialObjectDescriptorLength = view.byteLength - 2;

    return {
        Scope_of_IOD_label: {
            value: `0x${scope.toString(16).padStart(2, '0')}`,
            offset: baseOffset,
            length: 1,
        },
        IOD_label: {
            value: `0x${label.toString(16).padStart(2, '0')}`,
            offset: baseOffset + 1,
            length: 1,
        },
        InitialObjectDescriptor: {
            value: `${initialObjectDescriptorLength} bytes of InitialObjectDescriptor data`,
            offset: baseOffset + 2,
            length: initialObjectDescriptorLength,
        },
    };
}
