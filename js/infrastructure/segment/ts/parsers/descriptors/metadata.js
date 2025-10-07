/**
 * Parses a Metadata Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.60 & Table 2-87
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMetadataDescriptor(view, baseOffset) {
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

    details.metadata_format = {
        value: view.getUint8(offset),
        offset: baseOffset + offset,
        length: 1,
    };
    offset += 1;

    if (details.metadata_format.value === 0xff) {
        details.metadata_format_identifier = {
            value: view.getUint32(offset),
            offset: baseOffset + offset,
            length: 4,
        };
        offset += 4;
    }

    details.metadata_service_id = {
        value: view.getUint8(offset),
        offset: baseOffset + offset,
        length: 1,
    };
    offset += 1;

    const flags = view.getUint8(offset);
    details.decoder_config_flags = {
        value: (flags >> 5) & 7,
        offset: baseOffset + offset,
        length: 0.375,
    };
    details.DSM_CC_flag = {
        value: (flags >> 4) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    offset += 1;

    if (details.DSM_CC_flag.value) {
        const len = view.getUint8(offset);
        details.service_identification_length = {
            value: len,
            offset: baseOffset + offset,
            length: 1,
        };
        offset += 1;
        details.service_identification_record = {
            value: `${len} bytes`,
            offset: baseOffset + offset,
            length: len,
        };
        offset += len;
    }

    const config_flags = details.decoder_config_flags.value;
    if (config_flags === 0b001) {
        const len = view.getUint8(offset);
        details.decoder_config_length = {
            value: len,
            offset: baseOffset + offset,
            length: 1,
        };
        offset += 1;
        details.decoder_config = {
            value: `${len} bytes`,
            offset: baseOffset + offset,
            length: len,
        };
        offset += len;
    } else if (config_flags === 0b011) {
        const len = view.getUint8(offset);
        details.dec_config_identification_record_length = {
            value: len,
            offset: baseOffset + offset,
            length: 1,
        };
        offset += 1;
        details.dec_config_identification_record = {
            value: `${len} bytes`,
            offset: baseOffset + offset,
            length: len,
        };
        offset += len;
    } else if (config_flags === 0b100) {
        details.decoder_config_metadata_service_id = {
            value: view.getUint8(offset),
            offset: baseOffset + offset,
            length: 1,
        };
        offset += 1;
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
