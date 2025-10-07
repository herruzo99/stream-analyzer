/**
 * Parses a single Audio Stream Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.4 & Table 2-48
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed audio descriptor.
 */
export function parseAudioStreamDescriptor(view, baseOffset) {
    const byte1 = view.getUint8(0);
    return {
        free_format_flag: {
            value: (byte1 >> 7) & 1,
            offset: baseOffset,
            length: 0.125,
        },
        ID: { value: (byte1 >> 6) & 1, offset: baseOffset, length: 0.125 },
        layer: { value: (byte1 >> 4) & 3, offset: baseOffset, length: 0.25 },
        variable_rate_audio_indicator: {
            value: (byte1 >> 3) & 1,
            offset: baseOffset,
            length: 0.125,
        },
    };
}
