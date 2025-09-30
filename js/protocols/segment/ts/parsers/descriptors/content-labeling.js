/**
 * Parses a Content Labelling Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.56 & Table 2-81
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseContentLabelingDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    details.metadata_application_format = {
        value: view.getUint16(offset),
        offset: baseOffset + offset,
        length: 2,
    };
    offset += 2;

    if (details.metadata_application_format.value === 0xffff) {
        details.metadata_application_format_identifier = {
            value: view.getUint32(offset),
            offset: baseOffset + offset,
            length: 4,
        };
        offset += 4;
    }

    const flags = view.getUint8(offset);
    details.content_reference_id_record_flag = {
        value: (flags >> 7) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.content_time_base_indicator = {
        value: (flags >> 3) & 0x0f,
        offset: baseOffset + offset,
        length: 0.5,
    };
    offset += 1;

    if (details.content_reference_id_record_flag.value) {
        const len = view.getUint8(offset);
        details.content_reference_id_record_length = {
            value: len,
            offset: baseOffset + offset,
            length: 1,
        };
        offset += 1;
        details.content_reference_id_record = {
            value: `${len} bytes`,
            offset: baseOffset + offset,
            length: len,
        };
        offset += len;
    }

    if (
        details.content_time_base_indicator.value === 1 ||
        details.content_time_base_indicator.value === 2
    ) {
        const val1_high = view.getUint8(offset) & 0x1;
        const val1_low = view.getUint32(offset + 1);
        details.content_time_base_value = {
            value: ((BigInt(val1_high) << 32n) | BigInt(val1_low)).toString(),
            offset: baseOffset + offset,
            length: 5,
        };
        offset += 5;

        const val2_high = view.getUint8(offset) & 0x1;
        const val2_low = view.getUint32(offset + 1);
        details.metadata_time_base_value = {
            value: ((BigInt(val2_high) << 32n) | BigInt(val2_low)).toString(),
            offset: baseOffset + offset,
            length: 5,
        };
        offset += 5;

        if (details.content_time_base_indicator.value === 2) {
            details.contentId = {
                value: view.getUint8(offset) & 0x7f,
                offset: baseOffset + offset,
                length: 1,
            };
            offset += 1;
        }
    }

    if (
        details.content_time_base_indicator.value >= 3 &&
        details.content_time_base_indicator.value <= 7
    ) {
        const len = view.getUint8(offset);
        details.time_base_association_data_length = {
            value: len,
            offset: baseOffset + offset,
            length: 1,
        };
        offset += 1;
        details.time_base_association_data = {
            value: `${len} bytes`,
            offset: baseOffset + offset,
            length: len,
        };
        offset += len;
    }

    const privateDataLength = view.byteLength - offset;
    if (privateDataLength > 0) {
        details.private_data = {
            value: `${privateDataLength} bytes`,
            offset: baseOffset + offset,
            length: privateDataLength,
        };
    }

    return details;
}
