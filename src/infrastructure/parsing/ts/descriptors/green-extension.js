/**
 * Parses a Green Extension Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x07, Table 2-118
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseGreenExtensionDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    const byte0 = view.getUint8(offset);
    const num_intervals = (byte0 >> 6) & 0x03;
    details.num_constant_backlight_voltage_time_intervals = {
        value: num_intervals,
        offset: baseOffset + offset,
        length: 0.25,
    };
    offset += 1;

    details.intervals = [];
    for (let i = 0; i < num_intervals; i++) {
        if (offset + 2 > view.byteLength) break;
        if (offset + 2 > view.byteLength) break;
        details.intervals.push({
            constant_backlight_voltage_time_interval: {
                value: view.getUint16(offset),
                offset: baseOffset + offset,
                length: 2,
            },
        });
        offset += 2;
    }

    const byte_vars = view.getUint8(offset);
    const num_vars = (byte_vars >> 6) & 0x03;
    details.num_max_variations = {
        value: num_vars,
        offset: baseOffset + offset,
        length: 0.25,
    };
    offset += 1;

    details.variations = [];
    for (let j = 0; j < num_vars; j++) {
        if (offset + 2 > view.byteLength) break;
        if (offset + 2 > view.byteLength) break;
        details.variations.push({
            max_variation: {
                value: view.getUint16(offset),
                offset: baseOffset + offset,
                length: 2,
            },
        });
        offset += 2;
    }

    return details;
}
