/**
 * Parses a Virtual Segmentation Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x10, Table 2-127
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseVirtualSegmentationDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    if (view.byteLength < 1) return details;

    const byte0 = view.getUint8(offset);
    const num_partitions = (byte0 >> 5) & 0x07;
    const timescale_flag = (byte0 >> 4) & 1;
    details.num_partitions = {
        value: num_partitions,
        offset: baseOffset + offset,
        length: 0.375,
    };
    details.timescale_flag = {
        value: timescale_flag,
        offset: baseOffset + offset,
        length: 0.125,
    };
    offset += 1;

    let mdl = -1;
    if (timescale_flag) {
        const dword = view.getUint32(offset - 1); // Re-read to get cross-byte value
        details.ticks_per_second = {
            value: (dword >> 8) & 0x1fffff,
            offset: baseOffset + offset - 1,
            length: 2.625,
        };
        mdl = (view.getUint8(offset + 2) >> 5) & 0x07;
        details.maximum_duration_length_minus_1 = {
            value: mdl,
            offset: baseOffset + offset + 2,
            length: 0.375,
        };
        offset += 3;
    }

    details.partitions = [];
    for (let i = 0; i < num_partitions; i++) {
        if (offset + 2 > view.byteLength) break;
        const partition = {};
        const byte1 = view.getUint8(offset);
        const byte2 = view.getUint8(offset + 1);

        partition.explicit_boundary_flag = {
            value: (byte1 >> 7) & 1,
            offset: baseOffset + offset,
            length: 0.125,
        };
        partition.partition_id = {
            value: (byte1 >> 4) & 0x07,
            offset: baseOffset + offset,
            length: 0.375,
        };
        partition.SAP_type_max = {
            value: byte2 & 0x0f,
            offset: baseOffset + offset + 1,
            length: 0.5,
        };
        offset += 2;

        if (partition.explicit_boundary_flag.value === 0) {
            if (offset + 2 > view.byteLength) break;
            partition.boundary_PID = {
                value: view.getUint16(offset) & 0x1fff,
                offset: baseOffset + offset,
                length: 1.625,
            };
            offset += 2;
        } else {
            const max_duration_len_bytes = mdl + 1;
            if (offset + max_duration_len_bytes > view.byteLength) break;
            // Reading variable length integer is complex, showing as bytes for now.
            partition.maximum_duration = {
                value: `${max_duration_len_bytes} bytes of duration data`,
                offset: baseOffset + offset,
                length: max_duration_len_bytes,
            };
            offset += max_duration_len_bytes;
        }
        details.partitions.push(partition);
    }
    return details;
}
