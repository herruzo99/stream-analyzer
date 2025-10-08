/**
 * Parses an MVC (Multi-view Coding) Operation Point Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.82 & Table 2-101
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMvcOperationPointDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    details.profile_idc = {
        value: view.getUint8(offset),
        offset: baseOffset + offset,
        length: 1,
    };
    offset += 1;

    const constraintByte = view.getUint8(offset);
    details.constraint_set0_flag = {
        value: (constraintByte >> 7) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.constraint_set1_flag = {
        value: (constraintByte >> 6) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.constraint_set2_flag = {
        value: (constraintByte >> 5) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.constraint_set3_flag = {
        value: (constraintByte >> 4) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.constraint_set4_flag = {
        value: (constraintByte >> 3) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.constraint_set5_flag = {
        value: (constraintByte >> 2) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.AVC_compatible_flags = {
        value: constraintByte & 0x03,
        offset: baseOffset + offset,
        length: 0.25,
    };
    offset += 1;

    const level_count = view.getUint8(offset);
    details.level_count = {
        value: level_count,
        offset: baseOffset + offset,
        length: 1,
    };
    offset += 1;

    details.levels = [];
    for (let i = 0; i < level_count; i++) {
        if (offset + 2 > view.byteLength) break;
        const level = {
            level_idc: {
                value: view.getUint8(offset),
                offset: baseOffset + offset,
                length: 1,
            },
            operation_points: [],
        };
        offset += 1;

        const op_count = view.getUint8(offset);
        level.operation_points_count = {
            value: op_count,
            offset: baseOffset + offset,
            length: 1,
        };
        offset += 1;

        for (let j = 0; j < op_count; j++) {
            if (offset + 3 > view.byteLength) break;
            const op_byte1 = view.getUint8(offset);
            const op = {
                applicable_temporal_id: {
                    value: op_byte1 & 0x07,
                    offset: baseOffset + offset,
                    length: 0.375,
                },
                num_target_output_views: {
                    value: view.getUint8(offset + 1),
                    offset: baseOffset + offset + 1,
                    length: 1,
                },
                es_references: [],
            };
            offset += 2;

            const es_count = view.getUint8(offset);
            op.ES_count = {
                value: es_count,
                offset: baseOffset + offset,
                length: 1,
            };
            offset += 1;

            for (let k = 0; k < es_count; k++) {
                if (offset + 1 > view.byteLength) break;
                const es_byte = view.getUint8(offset);
                op.es_references.push({
                    ES_reference: {
                        value: es_byte & 0x3f,
                        offset: baseOffset + offset,
                        length: 0.75,
                    },
                });
                offset += 1;
            }
            level.operation_points.push(op);
        }
        details.levels.push(level);
    }

    return details;
}
