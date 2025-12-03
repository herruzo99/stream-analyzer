/**
 * Parses an FmxBufferSize Descriptor (DefaultFlexMuxBufferDescriptor).
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.50 & Table 2-78
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseFmxBufferSizeDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    // Loop over DefaultFlexMuxBufferDescriptor entries
    details.buffers = [];
    while (offset + 4 <= view.byteLength) {
        // Check bounds for the 6-byte entry
        if (offset + 6 > view.byteLength) break;

        const fbSize =
            (view.getUint8(offset) << 16) |
            (view.getUint8(offset + 1) << 8) |
            view.getUint8(offset + 2);
        const kbRate =
            (view.getUint8(offset + 3) << 16) |
            (view.getUint8(offset + 4) << 8) |
            view.getUint8(offset + 5);

        details.buffers.push({
            FB_BufferSize: {
                value: fbSize,
                offset: baseOffset + offset,
                length: 3,
            },
            kb_rate: {
                value: kbRate,
                offset: baseOffset + offset + 3,
                length: 3,
            },
        });
        offset += 6;
    }

    // If we couldn't parse structure, fall back
    if (details.buffers.length === 0) {
        return {
            fmx_buffer_size_data: {
                value: `${view.byteLength} bytes of FlexMux Buffer Size data`,
                offset: baseOffset,
                length: view.byteLength,
            },
        };
    }

    return details;
}
