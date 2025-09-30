/**
 * Parses a MuxCode Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.48 & Table 2-77
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMuxcodeDescriptor(view, baseOffset) {
    // The internal structure (MuxCodeTableEntry) is defined in ISO/IEC 14496-1
    // and is treated as opaque here.
    return {
        mux_code_table_entry_data: {
            value: `${view.byteLength} bytes of MuxCodeTableEntry data`,
            offset: baseOffset,
            length: view.byteLength,
        },
    };
}
