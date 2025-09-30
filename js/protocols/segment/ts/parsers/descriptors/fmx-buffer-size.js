/**
 * Parses an FmxBufferSize Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.50 & Table 2-78
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseFmxBufferSizeDescriptor(view, baseOffset) {
    // The internal structure (DefaultFlexMuxBufferDescriptor, FlexMuxBufferDescriptor)
    // is defined in ISO/IEC 14496-1 and treated as opaque here.
    return {
        fmx_buffer_size_data: {
            value: `${view.byteLength} bytes of FlexMux Buffer Size data`,
            offset: baseOffset,
            length: view.byteLength,
        },
    };
}
