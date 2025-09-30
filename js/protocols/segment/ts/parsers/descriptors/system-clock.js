/**
 * Parses a System Clock Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.20 & Table 2-62
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseSystemClockDescriptor(view, baseOffset) {
    const byte = view.getUint8(0);
    return {
        external_clock_reference_indicator: {
            value: (byte >> 7) & 1,
            offset: baseOffset,
            length: 0.125,
        },
        clock_accuracy_integer: {
            value: (byte >> 1) & 0x3f,
            offset: baseOffset,
            length: 0.75,
        }, // Corrected parsing
        clock_accuracy_exponent: {
            value: (view.getUint8(1) >> 5) & 0x07,
            offset: baseOffset + 1,
            length: 0.375,
        },
    };
}
