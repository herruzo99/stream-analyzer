// ... (MPEG_CRC_TABLE and calculateCRC32 function are unchanged) ...

const MPEG_CRC_TABLE = [
    0x00000000, 0x04c11db7, 0x09823b6e, 0x0d4326d9, 0x130476dc, 0x17c56b6b,
    0x1a864db2, 0x1e475005, 0x2608edb8, 0x22c9f00f, 0x2f8ad6d6, 0x2b4bcb61,
    0x350c9b64, 0x31cd86d3, 0x3c8ea00a, 0x384fbdbd, 0x4c11db70, 0x48d0c6c7,
    0x4593e01e, 0x4152fda9, 0x5f15adac, 0x5bd4b01b, 0x569796c2, 0x52568b75,
    0x6a1936c8, 0x6ed82b7f, 0x639b0da6, 0x675a1011, 0x791d4014, 0x7ddc5da3,
    0x709f7b7a, 0x745e66cd, 0x9823b6e0, 0x9ce2ab57, 0x91a18d8e, 0x95609039,
    0x8b27c03c, 0x8fe6dd8b, 0x82a5fb52, 0x8664e6e5, 0xbe2b5b58, 0xbaea46ef,
    0xb7a96036, 0xb3687d81, 0xad2f2d84, 0xa9ee3033, 0xa4ad16ea, 0xa06c0b5d,
    0xd4326d90, 0xd0f37027, 0xddb056fe, 0xd9714b49, 0xc7361b4c, 0xc3f706fb,
    0xceb42022, 0xca753d95, 0xf23a8028, 0xf6fb9d9f, 0xfbb8bb46, 0xff79a6f1,
    0xe13ef6f4, 0xe5ffeb43, 0xe8bccd9a, 0xec7dd02d, 0x34867077, 0x30476dc0,
    0x3d044b19, 0x39c556ae, 0x278206ab, 0x23431b1c, 0x2e003dc5, 0x2ac12072,
    0x128e9dcf, 0x164f8078, 0x1b0ca6a1, 0x1fcdbb16, 0x018aeb13, 0x054bf6a4,
    0x0808d07d, 0x0cc9cdca, 0x7897ab07, 0x7c56b6b0, 0x71159069, 0x75d48dde,
    0x6b93dddb, 0x6f52c06c, 0x6211e6b5, 0x66d0fb02, 0x5e9f46bf, 0x5a5e5b08,
    0x571d7dd1, 0x53dc6066, 0x4d9b3063, 0x495a2dd4, 0x44190b0d, 0x40d816ba,
    0xaca5c697, 0xac64db20, 0xa127fdf9, 0xa5e6e04e, 0xbba1b04b, 0xbf60adfc,
    0xb2238b25, 0xb6e29692, 0x8eaf2b2f, 0x8a6e3698, 0x872d1041, 0x83ec0df6,
    0x9dabcdf3, 0x9968d044, 0x942bf69d, 0x90eafb2a, 0xe0b41de7, 0xe4750050,
    0xe9362689, 0xedf73b3e, 0xf3b06b3b, 0xf771768c, 0xfa325055, 0xfef34de2,
    0xc6bcf05f, 0xc27dede8, 0xcf3ecb31, 0xcbffd686, 0xd5b88683, 0xd1799b34,
    0xdc3abded, 0xd8fba05a, 0x690ce0ee, 0x6dcdfd59, 0x608edb80, 0x644fc637,
    0x7a089632, 0x7ec98b85, 0x738aad5c, 0x774bb0eb, 0x4f040d56, 0x4bc510e1,
    0x46863638, 0x42472b8f, 0x5c007b8a, 0x58c1663d, 0x558240e4, 0x51435d53,
    0x251d3b9e, 0x21dc2629, 0x2c9f00f0, 0x285e1d47, 0x36194d42, 0x32d850f5,
    0x3f9b762c, 0x3b5a6b9b, 0x0315d626, 0x07d4cb91, 0x0a97ed48, 0x0e56f0ff,
    0x1011a0fa, 0x14d0bd4d, 0x19939b94, 0x1d528623, 0xf12f560e, 0xf5ee4bb9,
    0xf8ad6d60, 0xfc6c70d7, 0xe22b20d2, 0xe6ea3d65, 0xeba91bbc, 0xef68060b,
    0xd727bbb6, 0xd3e6a601, 0xdea580d8, 0xda649d6f, 0xc423cd6a, 0xc0e2d0dd,
    0xcda1f604, 0xc960ebb3, 0xbd3e8d7e, 0xb9ff90c9, 0xb4bcb610, 0xb07daba7,
    0xae3afba2, 0xaafbe615, 0xa7b8c0cc, 0xa379dd7b, 0x9b3660c6, 0x9ff77d71,
    0x92b45ba8, 0x9675461f, 0x8832161a, 0x8cf30bad, 0x81b02d74, 0x857130c3,
    0x5d8a9099, 0x594b8d2e, 0x5408abf7, 0x50c9b640, 0x4e8ee645, 0x4a4ffbf2,
    0x470cdd2b, 0x43cdc09c, 0x7b827d21, 0x7f436096, 0x7200464f, 0x76c15bf8,
    0x68860bfd, 0x6c47164a, 0x61043093, 0x65c52d24, 0x119b4be9, 0x155a565e,
    0x18197087, 0x1cd86d30, 0x029f3d35, 0x065e2082, 0x0b1d065b, 0x0fdc1bec,
    0x3793a651, 0x3352bbe6, 0x3e119d3f, 0x3ad08088, 0x2497d08d, 0x2056cd3a,
    0x2d15ebe3, 0x29d4f654,
];

function calculateCRC32(view) {
    let crc = 0xffffffff;
    for (let i = 0; i < view.byteLength; i++) {
        const byte = view.getUint8(i);
        crc = (crc << 8) ^ MPEG_CRC_TABLE[((crc >> 24) ^ byte) & 0xff];
    }
    return crc >>> 0; // Ensure unsigned 32-bit
}

/**
 * Parses the common header of a PSI section.
 * @param {DataView} view - A DataView of the complete PSI section data.
 * @returns {{header: object, payload: DataView, crc: string, isValid: boolean}} Parsed data.
 */
export function parsePsiSection(view) {
    if (view.byteLength < 3) {
        return {
            header: { error: 'Section too short for header' },
            payload: new DataView(new ArrayBuffer(0)),
            crc: 'N/A',
            isValid: false,
        };
    }

    const table_id = view.getUint8(0);
    const section_syntax_indicator = view.getUint8(1) >> 7;
    const section_length = view.getUint16(1) & 0x0fff;

    if (section_syntax_indicator === 0) {
        // Short format section (e.g., used by SCTE-35 in private_section).
        // It has no CRC and a simpler header. The section_length is just the payload.
        const totalSectionLength = 3 + section_length;
        if (totalSectionLength > view.byteLength) {
            return {
                header: {
                    table_id: `0x${table_id.toString(16)}`,
                    error: 'Invalid short section length',
                    section_length,
                },
                payload: new DataView(new ArrayBuffer(0)),
                crc: null, // No CRC for short sections
                isValid: false,
            };
        }
        const payload = new DataView(
            view.buffer,
            view.byteOffset + 3,
            section_length
        );
        return {
            header: {
                table_id: `0x${table_id.toString(16).padStart(2, '0')}`,
                section_syntax_indicator,
                section_length,
            },
            payload,
            crc: null, // No CRC for short sections
            isValid: true, // Cannot validate without CRC
        };
    }

    // --- Long format section (with CRC) from here on ---
    if (section_length > 1021) {
        return {
            header: {
                table_id: `0x${table_id.toString(16)}`,
                error: 'Section length exceeds maximum (1021)',
                section_length,
            },
            payload: new DataView(new ArrayBuffer(0)),
            crc: '0x00000000',
            isValid: false,
        };
    }

    const totalSectionLength = 3 + section_length;
    if (totalSectionLength > view.byteLength) {
        return {
            header: {
                table_id: `0x${table_id.toString(16)}`,
                error: 'Section length extends beyond packet payload',
                section_length,
            },
            payload: new DataView(new ArrayBuffer(0)),
            crc: '0x00000000',
            isValid: false,
        };
    }

    // A long section must contain at least the 5-byte header extension and 4-byte CRC
    if (section_length < 9) {
        return {
            header: {
                table_id: `0x${table_id.toString(16)}`,
                error: 'Section length too short for long format (must be >= 9)',
                section_length,
            },
            payload: new DataView(new ArrayBuffer(0)),
            crc: '0x00000000',
            isValid: false,
        };
    }

    const dataForCrcView = new DataView(
        view.buffer,
        view.byteOffset,
        totalSectionLength - 4
    );
    const calculatedCrc = calculateCRC32(dataForCrcView);
    const readCrc = view.getUint32(totalSectionLength - 4);
    const isValid = calculatedCrc === readCrc;

    const header = {
        table_id: `0x${table_id.toString(16).padStart(2, '0')}`,
        section_syntax_indicator,
        section_length,
        table_id_extension: view.getUint16(3),
        version_number: (view.getUint8(5) >> 1) & 0x1f,
        current_next_indicator: view.getUint8(5) & 0x01,
        section_number: view.getUint8(6),
        last_section_number: view.getUint8(7),
    };

    const payloadOffset = 8;
    const payloadEndOffset = totalSectionLength - 4; // Start of CRC
    const payloadLength = payloadEndOffset - payloadOffset;

    const payload = new DataView(
        view.buffer,
        view.byteOffset + payloadOffset,
        payloadLength
    );

    return {
        header,
        payload,
        crc: `0x${readCrc.toString(16).padStart(8, '0')}`,
        isValid,
    };
}
