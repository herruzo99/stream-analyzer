// Parses the fixed-size 4-byte MPEG-2 Transport Stream packet header.
// Decodes fields such as PID, continuity_counter, and control flags.

/**
 * Parses the 4-byte Transport Stream packet header.
 * @param {DataView} view - A DataView pointing to the start of the TS packet.
 * @param {number} baseOffset - The offset of the packet within the entire segment.
 * @returns {object} The parsed header data with byte-level metadata.
 */
export function parseHeader(view, baseOffset) {
    const byte0 = view.getUint8(0);
    const byte1 = view.getUint8(1);
    const byte2 = view.getUint8(2);
    const byte3 = view.getUint8(3);

    const pid = ((byte1 & 0x1f) << 8) | byte2;

    return {
        sync_byte: { value: byte0, offset: baseOffset, length: 1 },
        transport_error_indicator: { value: (byte1 >> 7) & 1, offset: baseOffset + 1, length: 0.125 },
        payload_unit_start_indicator: { value: (byte1 >> 6) & 1, offset: baseOffset + 1, length: 0.125 },
        transport_priority: { value: (byte1 >> 5) & 1, offset: baseOffset + 1, length: 0.125 },
        pid: { value: pid, offset: baseOffset + 1, length: 1.625 },
        transport_scrambling_control: { value: (byte3 >> 6) & 3, offset: baseOffset + 3, length: 0.25 },
        adaptation_field_control: { value: (byte3 >> 4) & 3, offset: baseOffset + 3, length: 0.25 },
        continuity_counter: { value: byte3 & 0x0f, offset: baseOffset + 3, length: 0.5 },
    };
}