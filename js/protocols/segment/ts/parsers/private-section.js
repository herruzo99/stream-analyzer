/**
 * Parses the payload of a private_section.
 * This can have a "long" format (with versioning, etc.) or a "short" format.
 * The format is determined by the section_syntax_indicator from the parent PSI section.
 * @param {DataView} view - A DataView of the private section's payload.
 * @param {number} baseOffset - The offset of the payload within the segment.
 * @param {number} section_syntax_indicator - The indicator from the PSI header.
 * @param {number} section_length - The total section length.
 * @returns {object} An object containing parsed private section information.
 */
export function parsePrivateSectionPayload(
    view,
    baseOffset,
    section_syntax_indicator,
    section_length
) {
    if (section_syntax_indicator === 0) {
        // Short format: the entire payload is private data.
        return {
            type: 'Private Section (short)',
            private_data: {
                value: `${view.byteLength} bytes of private data`,
                offset: baseOffset,
                length: view.byteLength,
            },
        };
    }

    // Long format: has additional header fields before the private data.
    const table_id_extension = view.getUint16(0);
    const version_byte = view.getUint8(2);
    const version_number = (version_byte >> 1) & 0x1f;
    const current_next_indicator = version_byte & 1;
    const section_number = view.getUint8(3);
    const last_section_number = view.getUint8(4);

    const privateDataOffset = 5;
    const privateDataLength = section_length - (privateDataOffset + 4); // 5 bytes of header + 4 bytes CRC

    const private_data = {
        value: `${privateDataLength} bytes of private data`,
        offset: baseOffset + privateDataOffset,
        length: privateDataLength,
    };

    return {
        type: 'Private Section (long)',
        table_id_extension: {
            value: table_id_extension,
            offset: baseOffset,
            length: 2,
        },
        version_number: {
            value: version_number,
            offset: baseOffset + 2,
            length: 0.625,
        },
        current_next_indicator: {
            value: current_next_indicator,
            offset: baseOffset + 2,
            length: 0.125,
        },
        section_number: {
            value: section_number,
            offset: baseOffset + 3,
            length: 1,
        },
        last_section_number: {
            value: last_section_number,
            offset: baseOffset + 4,
            length: 1,
        },
        private_data,
    };
}

export const privateSectionTooltipData = {
    'Private Section': {
        text: 'A section containing user-defined private data. The structure and meaning of this data is not defined by the MPEG-2 specification.',
        ref: 'Clause 2.4.4.11',
    },
};
