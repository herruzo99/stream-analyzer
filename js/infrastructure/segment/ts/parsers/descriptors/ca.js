/**
 * Parses a single CA Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.16 & Table 2-61
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed CA descriptor with byte-level metadata.
 */
export function parseCaDescriptor(view, baseOffset) {
    const ca_system_ID = view.getUint16(0);
    const ca_PID = view.getUint16(2) & 0x1fff;
    const privateDataBytes = [];
    for (let i = 4; i < view.byteLength; i++) {
        privateDataBytes.push(view.getUint8(i).toString(16).padStart(2, '0'));
    }

    return {
        ca_system_ID: {
            value: `0x${ca_system_ID.toString(16).padStart(4, '0')}`,
            offset: baseOffset,
            length: 2,
        },
        reserved: {
            value: (view.getUint8(2) >> 5) & 0x07,
            offset: baseOffset + 2,
            length: 0.375,
        },
        ca_PID: { value: ca_PID, offset: baseOffset + 2, length: 1.625 },
        private_data: {
            value:
                privateDataBytes.length > 0
                    ? privateDataBytes.join(' ')
                    : 'none',
            offset: baseOffset + 4,
            length: privateDataBytes.length,
        },
    };
}
