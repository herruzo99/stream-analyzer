/**
 * Parses a Quality Extension Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x0F, Table 2-126
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseQualityExtensionDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    details.field_size_bytes = {
        value: view.getUint8(offset),
        offset: baseOffset + offset,
        length: 1,
    };
    offset += 1;

    const metric_count = view.getUint8(offset);
    details.metric_count = {
        value: metric_count,
        offset: baseOffset + offset,
        length: 1,
    };
    offset += 1;

    details.metrics = [];
    for (let i = 0; i < metric_count; i++) {
        if (offset + 4 > view.byteLength) break;
        if (offset + 4 > view.byteLength) break;
        const code = view.getUint32(offset);
        details.metrics.push({
            metric_code: {
                value: `0x${code.toString(16).padStart(8, '0')}`,
                offset: baseOffset + offset,
                length: 4,
            },
        });
        offset += 4;
    }

    return details;
}
