/**
 * Parses an MPEG-4 Text Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.70
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMpeg4TextDescriptor(view, baseOffset) {
    // The payload is the textConfig(), which is complex and format-specific.
    // For now, we'll just indicate its presence and size.
    return {
        textConfig_data: {
            value: `${view.byteLength} bytes of TextConfig data`,
            offset: baseOffset,
            length: view.byteLength,
        },
    };
}
