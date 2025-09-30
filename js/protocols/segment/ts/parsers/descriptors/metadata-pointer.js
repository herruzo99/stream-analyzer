/**
 * Parses a Metadata Pointer Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.58 & Table 2-84
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMetadataPointerDescriptor(view, baseOffset) {
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
    details.metadata_locator_record_flag = {
        value: (flags >> 7) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.MPEG_carriage_flags = {
        value: (flags >> 5) & 3,
        offset: baseOffset + offset,
        length: 0.25,
    };
    offset += 1;

    if (details.metadata_locator_record_flag.value) {
        const len = view.getUint8(offset);
        details.metadata_locator_record_length = {
            value: len,
            offset: baseOffset + offset,
            length: 1,
        };
        offset += 1;
        details.metadata_locator_record = {
            value: `${len} bytes`,
            offset: baseOffset + offset,
            length: len,
        };
        offset += len;
    }

    if (details.MPEG_carriage_flags.value <= 2) {
        details.program_number = {
            value: view.getUint16(offset),
            offset: baseOffset + offset,
            length: 2,
        };
        offset += 2;
    }

    if (details.MPEG_carriage_flags.value === 1) {
        details.transport_stream_location = {
            value: view.getUint16(offset),
            offset: baseOffset + offset,
            length: 2,
        };
        offset += 2;
        details.transport_stream_id = {
            value: view.getUint16(offset),
            offset: baseOffset + offset,
            length: 2,
        };
        offset += 2;
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
