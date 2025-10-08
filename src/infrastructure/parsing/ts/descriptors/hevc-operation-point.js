/**
 * Parses an HEVC Operation Point Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x05, Table 2-115
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseHevcOperationPointDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    const byte0 = view.getUint8(offset);
    details.num_ptl = {
        value: byte0 & 0x3f,
        offset: baseOffset + offset,
        length: 0.75,
    };
    const num_ptl = byte0 & 0x3f;
    offset += 1;

    details.profile_tier_level_infos = [];
    for (let i = 0; i < num_ptl; i++) {
        if (offset + 12 > view.byteLength) break;
        if (offset + 12 > view.byteLength) break;
        details.profile_tier_level_infos.push({
            value: `12 bytes of PTL data for index ${i}`,
            offset: baseOffset + offset,
            length: 12,
        });
        offset += 12;
    }

    const operation_points_count = view.getUint8(offset);
    details.operation_points_count = {
        value: operation_points_count,
        offset: baseOffset + offset,
        length: 1,
    };
    offset += 1;

    details.operation_points = [];
    for (let i = 0; i < operation_points_count; i++) {
        if (offset + 2 > view.byteLength) break;
        if (offset + 2 > view.byteLength) break;
        const op = {};
        op.target_ols = {
            value: view.getUint8(offset),
            offset: baseOffset + offset,
            length: 1,
        };
        op.ES_count = {
            value: view.getUint8(offset + 1),
            offset: baseOffset + offset + 1,
            length: 1,
        };
        const es_count = op.ES_count.value;
        offset += 2;

        op.es_references = [];
        for (let j = 0; j < es_count; j++) {
            if (offset + 1 > view.byteLength) break;
            const byte = view.getUint8(offset);
            if (offset + 1 > view.byteLength) break;
            op.es_references.push({
                prepend_dependencies: {
                    value: (byte >> 7) & 1,
                    offset: baseOffset + offset,
                    length: 0.125,
                },
                ES_reference: {
                    value: byte & 0x3f,
                    offset: baseOffset + offset,
                    length: 0.75,
                },
            });
            offset += 1;
        }

        if (offset + 1 > view.byteLength) break;
        op.numEsInOp = {
            value: view.getUint8(offset) & 0x3f,
            offset: baseOffset + offset,
            length: 0.75,
        };
        const numEsInOp = op.numEsInOp.value;
        offset += 1;

        op.layers = [];
        for (let k = 0; k < numEsInOp; k++) {
            if (offset + 1 > view.byteLength) break;
            const byte = view.getUint8(offset);
            if (offset + 1 > view.byteLength) break;
            op.layers.push({
                necessary_layer_flag: {
                    value: (byte >> 7) & 1,
                    offset: baseOffset + offset,
                    length: 0.125,
                },
                output_layer_flag: {
                    value: (byte >> 6) & 1,
                    offset: baseOffset + offset,
                    length: 0.125,
                },
                ptl_ref_idx: {
                    value: byte & 0x3f,
                    offset: baseOffset + offset,
                    length: 0.75,
                },
            });
            offset += 1;
        }

        if (offset + 1 > view.byteLength) break;
        const flags = view.getUint8(offset);
        op.avg_bit_rate_info_flag = {
            value: (flags >> 7) & 1,
            offset: baseOffset + offset,
            length: 0.125,
        };
        op.max_bit_rate_info_flag = {
            value: (flags >> 6) & 1,
            offset: baseOffset + offset,
            length: 0.125,
        };
        op.constant_frame_rate_info_idc = {
            value: (flags >> 4) & 0x03,
            offset: baseOffset + offset,
            length: 0.25,
        };
        op.applicable_temporal_id = {
            value: (flags >> 1) & 0x07,
            offset: baseOffset + offset,
            length: 0.375,
        };
        offset += 1;

        if (op.constant_frame_rate_info_idc.value > 0) {
            if (offset + 2 > view.byteLength) break;
            if (offset + 2 > view.byteLength) break;
            op.frame_rate_indicator = {
                value: view.getUint16(offset) & 0x0fff,
                offset: baseOffset + offset,
                length: 1.5,
            };
            offset += 2;
        }

        if (op.avg_bit_rate_info_flag.value === 1) {
            if (offset + 3 > view.byteLength) break;
            if (offset + 3 > view.byteLength) break;
            op.avg_bit_rate = {
                value:
                    (view.getUint8(offset) << 16) | view.getUint16(offset + 1),
                offset: baseOffset + offset,
                length: 3,
            };
            offset += 3;
        }
        if (op.max_bit_rate_info_flag.value === 1) {
            if (offset + 3 > view.byteLength) break;
            if (offset + 3 > view.byteLength) break;
            op.max_bit_rate = {
                value:
                    (view.getUint8(offset) << 16) | view.getUint16(offset + 1),
                offset: baseOffset + offset,
                length: 3,
            };
            offset += 3;
        }

        details.operation_points.push(op);
    }

    return details;
}
