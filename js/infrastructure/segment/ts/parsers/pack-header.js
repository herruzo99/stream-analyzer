/**
 * Parses the 42-bit System Clock Reference (SCR).
 * @param {DataView} view - A DataView starting at the 6-byte SCR field.
 * @returns {BigInt} The combined 42-bit value.
 */
function parseScr(view) {
    const byte0 = view.getUint8(0);
    const byte1 = view.getUint8(1);
    const byte2 = view.getUint8(2);
    const byte3 = view.getUint8(3);
    const byte4 = view.getUint8(4);
    const byte5 = view.getUint8(5);

    const base_high = BigInt(byte0 & 0x38) >> 3n; // 3 bits
    const base_mid =
        (BigInt(byte0 & 0x03) << 13n) |
        (BigInt(byte1) << 5n) |
        (BigInt(byte2 >> 3) & 0x1fn); // 15 bits
    const base_low =
        (BigInt(byte2 & 0x03) << 13n) |
        (BigInt(byte3) << 5n) |
        (BigInt(byte4 >> 3) & 0x1fn); // 15 bits
    const base = (base_high << 30n) | (base_mid << 15n) | base_low;

    const extension = ((BigInt(byte4) & 0x03n) << 7n) | BigInt(byte5 >> 1); // 9 bits

    return base * 300n + extension;
}

/**
 * Parses a Program Stream Pack Header.
 * @param {DataView} view - A DataView of the pack header.
 * @param {number} baseOffset - The offset of the pack header within the segment.
 * @returns {object} The parsed pack header.
 */
export function parsePackHeader(view, baseOffset) {
    const details = {};
    let offset = 0;

    if (view.byteLength < 4) return details;
    details.pack_start_code = {
        value: `0x${view.getUint32(0).toString(16)}`,
        offset: baseOffset,
        length: 4,
    };
    offset += 4;

    if (view.byteLength < offset + 6) return details;
    const scrView = new DataView(view.buffer, view.byteOffset + offset, 6);
    details.system_clock_reference = {
        value: parseScr(scrView).toString(),
        offset: baseOffset + offset,
        length: 6,
    };
    offset += 6;

    if (view.byteLength < offset + 3) return details;
    const muxRateVal =
        (view.getUint8(offset) << 14) |
        (view.getUint8(offset + 1) << 6) |
        (view.getUint8(offset + 2) >> 2);
    details.program_mux_rate = {
        value: muxRateVal,
        offset: baseOffset + offset,
        length: 3,
    };
    offset += 3;

    const stuffingLength = view.getUint8(offset - 1) & 0x07;
    details.pack_stuffing_length = {
        value: stuffingLength,
        offset: baseOffset + offset - 1,
        length: 0.375,
    };

    if (stuffingLength > 0) {
        if (view.byteLength < offset + stuffingLength) return details;
        details.stuffing_bytes = {
            value: `${stuffingLength} bytes`,
            offset: baseOffset + offset,
            length: stuffingLength,
        };
    }

    return details;
}

export const packHeaderTooltipData = {
    pack_header: {
        text: 'A Program Stream Pack Header, providing timing and bitrate information.',
        ref: 'Clause 2.5.3.3',
    },
    'pack_header@pack_start_code': {
        text: 'The start code for a pack (0x000001BA).',
        ref: 'Clause 2.5.3.4',
    },
    'pack_header@system_clock_reference': {
        text: 'System Clock Reference (SCR). A timestamp indicating the intended arrival time of this byte at the decoder.',
        ref: 'Clause 2.5.3.4',
    },
    'pack_header@program_mux_rate': {
        text: 'The rate at which the P-STD receives the program stream during this pack, in units of 50 bytes/second.',
        ref: 'Clause 2.5.3.4',
    },
    'pack_header@pack_stuffing_length': {
        text: 'The number of stuffing bytes that follow.',
        ref: 'Clause 2.5.3.4',
    },
};
