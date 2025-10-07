/**
 * Parses a FlexMuxTiming Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.54 & Table 2-80
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseFlexMuxTimingDescriptor(view, baseOffset) {
    return {
        FCR_ES_ID: { value: view.getUint16(0), offset: baseOffset, length: 2 },
        FCRResolution: {
            value: view.getUint32(2),
            offset: baseOffset + 2,
            length: 4,
        },
        FCRLength: {
            value: view.getUint8(6),
            offset: baseOffset + 6,
            length: 1,
        },
        FmxRateLength: {
            value: view.getUint8(7),
            offset: baseOffset + 7,
            length: 1,
        },
    };
}
