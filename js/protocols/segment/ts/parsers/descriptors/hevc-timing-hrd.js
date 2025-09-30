/**
 * Parses an HEVC Timing and HRD Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x03, see Table 2-113
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed HEVC timing and HRD descriptor.
 */
export function parseHevcTimingAndHrdDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    if (view.byteLength < 2) return details;

    const byte0 = view.getUint8(offset);
    details.hrd_management_valid_flag = {
        value: (byte0 >> 7) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    offset += 1;

    const byte1 = view.getUint8(offset);
    const picture_and_timing_info_present_flag = byte1 & 1;
    details.picture_and_timing_info_present_flag = {
        value: picture_and_timing_info_present_flag,
        offset: baseOffset + offset,
        length: 0.125,
    };
    offset += 1;

    if (picture_and_timing_info_present_flag) {
        if (view.byteLength > offset) {
            const byte2 = view.getUint8(offset);
            const ninety_kHz_flag = (byte2 >> 7) & 1;
            details['90kHz_flag'] = {
                value: ninety_kHz_flag,
                offset: baseOffset + offset,
                length: 0.125,
            };
            offset += 1;

            if (ninety_kHz_flag === 0) {
                if (view.byteLength >= offset + 8) {
                    details.N = {
                        value: view.getUint32(offset),
                        offset: baseOffset + offset,
                        length: 4,
                    };
                    details.K = {
                        value: view.getUint32(offset + 4),
                        offset: baseOffset + offset + 4,
                        length: 4,
                    };
                    offset += 8;
                }
            }
            if (view.byteLength >= offset + 4) {
                details.num_units_in_tick = {
                    value: view.getUint32(offset),
                    offset: baseOffset + offset,
                    length: 4,
                };
            }
        }
    }

    return details;
}
