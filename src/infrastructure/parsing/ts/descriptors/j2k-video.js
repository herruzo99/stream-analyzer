/**
 * Parses a J2K (JPEG 2000) Video Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.80 & Table 2-99
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed J2K video descriptor.
 */
export function parseJ2kVideoDescriptor(view, baseOffset) {
    const word1 = view.getUint16(0);
    const extended_capability_flag = (word1 >> 15) & 1;
    const profile_and_level = word1 & 0x7fff;

    const details = {
        extended_capability_flag: {
            value: extended_capability_flag,
            offset: baseOffset,
            length: 0.125,
        },
        profile_and_level: {
            value: `0x${profile_and_level.toString(16).padStart(4, '0')}`,
            offset: baseOffset,
            length: 1.875,
        },
        horizontal_size: {
            value: view.getUint32(2),
            offset: baseOffset + 2,
            length: 4,
        },
        vertical_size: {
            value: view.getUint32(6),
            offset: baseOffset + 6,
            length: 4,
        },
        max_bit_rate: {
            value: view.getUint32(10),
            offset: baseOffset + 10,
            length: 4,
        },
        max_buffer_size: {
            value: view.getUint32(14),
            offset: baseOffset + 14,
            length: 4,
        },
        DEN_frame_rate: {
            value: view.getUint16(18),
            offset: baseOffset + 18,
            length: 2,
        },
        NUM_frame_rate: {
            value: view.getUint16(20),
            offset: baseOffset + 20,
            length: 2,
        },
    };

    let currentOffset = 22;
    if (extended_capability_flag) {
        const flags1 = view.getUint8(currentOffset);
        details.stripe_flag = {
            value: (flags1 >> 7) & 1,
            offset: baseOffset + currentOffset,
            length: 0.125,
        };
        details.block_flag = {
            value: (flags1 >> 6) & 1,
            offset: baseOffset + currentOffset,
            length: 0.125,
        };
        details.mdm_flag = {
            value: (flags1 >> 5) & 1,
            offset: baseOffset + currentOffset,
            length: 0.125,
        };
        currentOffset += 1;
    } else {
        details.color_specification = {
            value: view.getUint8(currentOffset),
            offset: baseOffset + currentOffset,
            length: 1,
        };
        currentOffset += 1;
    }

    const flags2 = view.getUint8(currentOffset);
    details.still_mode = {
        value: (flags2 >> 7) & 1,
        offset: baseOffset + currentOffset,
        length: 0.125,
    };
    details.interlaced_video = {
        value: (flags2 >> 6) & 1,
        offset: baseOffset + currentOffset,
        length: 0.125,
    };
    currentOffset += 1;

    if (extended_capability_flag) {
        details.colour_primaries = {
            value: view.getUint8(currentOffset),
            offset: baseOffset + currentOffset,
            length: 1,
        };
        currentOffset += 1;
        details.transfer_characteristics = {
            value: view.getUint8(currentOffset),
            offset: baseOffset + currentOffset,
            length: 1,
        };
        currentOffset += 1;
        details.matrix_coefficients = {
            value: view.getUint8(currentOffset),
            offset: baseOffset + currentOffset,
            length: 1,
        };
        currentOffset += 1;
        const fullRangeByte = view.getUint8(currentOffset);
        details.video_full_range_flag = {
            value: (fullRangeByte >> 7) & 1,
            offset: baseOffset + currentOffset,
            length: 0.125,
        };
        currentOffset += 1;
    }

    return details;
}
