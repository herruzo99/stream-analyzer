/**
 * Parses an AVC Timing and HRD Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.66 & Table 2-91
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed AVC timing and HRD descriptor.
 */
export function parseAvcTimingAndHrdDescriptor(view, baseOffset) {
    const byte1 = view.getUint8(0);
    const hrd_management_valid_flag = (byte1 >> 7) & 1;
    const picture_and_timing_info_present = byte1 & 1;

    const details = {
        hrd_management_valid_flag: {
            value: hrd_management_valid_flag,
            offset: baseOffset,
            length: 0.125,
        },
        picture_and_timing_info_present: {
            value: picture_and_timing_info_present,
            offset: baseOffset,
            length: 0.125,
        },
    };

    let currentOffset = 1;

    if (picture_and_timing_info_present) {
        if (view.byteLength > currentOffset) {
            const byte2 = view.getUint8(currentOffset);
            const ninety_kHz_flag = (byte2 >> 7) & 1;
            details['90kHz_flag'] = {
                value: ninety_kHz_flag,
                offset: baseOffset + currentOffset,
                length: 0.125,
            };
            currentOffset += 1;

            if (ninety_kHz_flag === 0) {
                if (view.byteLength >= currentOffset + 8) {
                    details.N = {
                        value: view.getUint32(currentOffset),
                        offset: baseOffset + currentOffset,
                        length: 4,
                    };
                    details.K = {
                        value: view.getUint32(currentOffset + 4),
                        offset: baseOffset + currentOffset + 4,
                        length: 4,
                    };
                    currentOffset += 8;
                }
            }

            if (view.byteLength >= currentOffset + 4) {
                details.num_units_in_tick = {
                    value: view.getUint32(currentOffset),
                    offset: baseOffset + currentOffset,
                    length: 4,
                };
                currentOffset += 4;
            }
        }
    }

    if (view.byteLength > currentOffset) {
        const byte_last = view.getUint8(currentOffset);
        details.fixed_frame_rate_flag = {
            value: (byte_last >> 7) & 1,
            offset: baseOffset + currentOffset,
            length: 0.125,
        };
        details.temporal_poc_flag = {
            value: (byte_last >> 6) & 1,
            offset: baseOffset + currentOffset,
            length: 0.125,
        };
        details.picture_to_display_conversion_flag = {
            value: (byte_last >> 5) & 1,
            offset: baseOffset + currentOffset,
            length: 0.125,
        };
    }

    return details;
}
