// Parses a Packetized Elementary Stream (PES) packet header found
// within the payload of a TS packet. This includes decoding the stream_id
// and extracting critical timing information like the Presentation
// Time Stamp (PTS) and Decoding Time Stamp (DTS).

function parseTimestamp(view, offset) {
    const byte1 = view.getUint8(offset);
    const byte2 = view.getUint16(offset + 1);
    const byte3 = view.getUint16(offset + 3);
    const high = (byte1 & 0x0e) >> 1;
    const mid = byte2 >> 1;
    const low = byte3 >> 1;
    return (BigInt(high) << 30n) | (BigInt(mid) << 15n) | BigInt(low);
}

/**
 * Parses the header of a PES packet.
 * @param {DataView} view - A DataView of the PES packet payload.
 * @param {number} baseOffset - The offset of the PES packet within the segment.
 * @returns {object | null} The parsed PES header, or null if not a PES packet.
 */
export function parsePesHeader(view, baseOffset) {
    if (view.byteLength < 6 || view.getUint32(0) >>> 8 !== 0x000001) {
        return null;
    }

    const streamIdByte = view.getUint8(3);
    const pes = {
        packet_start_code_prefix: { value: '0x000001', offset: baseOffset, length: 3 },
        stream_id: { value: `0x${streamIdByte.toString(16).padStart(2, '0')}`, offset: baseOffset + 3, length: 1 },
        pes_packet_length: { value: view.getUint16(4), offset: baseOffset + 4, length: 2 },
    };

    // stream_id values for streams that do not have the optional PES header fields
    if (streamIdByte === 0xbc || streamIdByte === 0xbe || streamIdByte === 0xbf || streamIdByte === 0xf0 ||
        streamIdByte === 0xf1 || streamIdByte === 0xff || streamIdByte === 0xf2 || streamIdByte === 0xf8) {
        return pes;
    }
    
    if (view.byteLength < 9) return pes;

    const flags1 = view.getUint8(6);
    const flags2 = view.getUint8(7);
    const ptsDtsFlags = flags2 >> 6;
    const pes_header_data_length = view.getUint8(8);

    pes.marker_bits = { value: (flags1 >> 6) & 3, offset: baseOffset + 6, length: 0.25 };
    pes.scrambling_control = { value: (flags1 >> 4) & 3, offset: baseOffset + 6, length: 0.25 };
    pes.priority = { value: (flags1 >> 3) & 1, offset: baseOffset + 6, length: 0.125 };
    pes.data_alignment_indicator = { value: (flags1 >> 2) & 1, offset: baseOffset + 6, length: 0.125 };
    pes.copyright = { value: (flags1 >> 1) & 1, offset: baseOffset + 6, length: 0.125 };
    pes.original_or_copy = { value: flags1 & 1, offset: baseOffset + 6, length: 0.125 };
    
    pes.pts_dts_flags = { value: ptsDtsFlags, offset: baseOffset + 7, length: 0.25 };
    pes.escr_flag = { value: (flags2 >> 5) & 1, offset: baseOffset + 7, length: 0.125 };
    pes.es_rate_flag = { value: (flags2 >> 4) & 1, offset: baseOffset + 7, length: 0.125 };
    pes.dsm_trick_mode_flag = { value: (flags2 >> 3) & 1, offset: baseOffset + 7, length: 0.125 };
    pes.additional_copy_info_flag = { value: (flags2 >> 2) & 1, offset: baseOffset + 7, length: 0.125 };
    pes.pes_crc_flag = { value: (flags2 >> 1) & 1, offset: baseOffset + 7, length: 0.125 };
    pes.pes_extension_flag = { value: flags2 & 1, offset: baseOffset + 7, length: 0.125 };

    pes.pes_header_data_length = { value: pes_header_data_length, offset: baseOffset + 8, length: 1 };
    
    let currentOffset = 9;

    if (ptsDtsFlags === 0b10) { // PTS only
        if (currentOffset + 5 <= pes_header_data_length + 9) {
            pes.pts = { value: parseTimestamp(view, currentOffset).toString(), offset: baseOffset + currentOffset, length: 5 };
        }
    } else if (ptsDtsFlags === 0b11) { // PTS and DTS
        if (currentOffset + 10 <= pes_header_data_length + 9) {
            pes.pts = { value: parseTimestamp(view, currentOffset).toString(), offset: baseOffset + currentOffset, length: 5 };
            pes.dts = { value: parseTimestamp(view, currentOffset + 5).toString(), offset: baseOffset + currentOffset + 5, length: 5 };
        }
    }

    return pes;
}

export const pesTooltipData = {
    PES: { text: 'Packetized Elementary Stream. A data structure used to carry elementary stream data.', ref: 'Clause 2.4.3.6' },
    'PES@stream_id': { text: 'Identifies the type of the elementary stream (e.g., video, audio).', ref: 'Table 2-22' },
    'PES@pes_packet_length': { text: 'The length of the PES packet following this field. A value of 0 indicates an unbounded video stream.', ref: 'Clause 2.4.3.7' },
    'PES@pts_dts_flags': { text: 'Indicates the presence of PTS and/or DTS timestamps in the header.', ref: 'Clause 2.4.3.7' },
    'PES@pts': { text: 'Presentation Time Stamp. A 33-bit value indicating when the presentation unit should be displayed.', ref: 'Clause 2.4.3.7' },
    'PES@dts': { text: 'Decoding Time Stamp. A 33-bit value indicating when the access unit must be decoded.', ref: 'Clause 2.4.3.7' },
};