import { appLog } from '@/shared/utils/debug.js';
import { parseSPS } from '../../video/sps.js';
import { parsePackHeader } from './pack-header.js';

function parseTimestamp(view, offset) {
    const byte0 = view.getUint8(offset);
    const byte1 = view.getUint8(offset + 1);
    const byte2 = view.getUint8(offset + 2);
    const byte3 = view.getUint8(offset + 3);
    const byte4 = view.getUint8(offset + 4);

    const high = BigInt((byte0 & 0x0e) >> 1);
    const mid = BigInt((byte1 << 7) | (byte2 >> 1));
    const low = BigInt((byte3 << 7) | (byte4 >> 1));

    return (high << 30n) | (mid << 15n) | low;
}

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
 * Parses the header of a PES packet.
 * @param {DataView} view - A DataView of the PES packet payload.
 * @param {number} baseOffset - The offset of the PES packet within the segment.
 * @returns {{header: object, payloadOffset: number} | null} The parsed PES header and the offset to the payload, or null.
 */
export function parsePesHeader(view, baseOffset) {
    if (view.byteLength < 6 || view.getUint32(0) >>> 8 !== 0x000001) {
        return null;
    }

    const streamIdByte = view.getUint8(3);
    const pes_packet_length = view.getUint16(4);

    const pes = {
        packet_start_code_prefix: {
            value: '0x000001',
            offset: baseOffset,
            length: 3,
        },
        stream_id: {
            value: `0x${streamIdByte.toString(16).padStart(2, '0')}`,
            offset: baseOffset + 3,
            length: 1,
        },
        pes_packet_length: {
            value: pes_packet_length,
            offset: baseOffset + 4,
            length: 2,
        },
    };

    // stream_id values for streams that do not have the optional PES header fields
    const isSimpleFormat =
        streamIdByte === 0xbc || // program_stream_map
        streamIdByte === 0xbe || // padding_stream
        streamIdByte === 0xbf || // private_stream_2
        streamIdByte === 0xf0 || // ECM
        streamIdByte === 0xf1 || // EMM
        streamIdByte === 0xff || // program_stream_directory
        streamIdByte === 0xf2 || // DSMCC_stream
        streamIdByte === 0xf8; // H.222.1 type E stream

    if (isSimpleFormat) {
        return { header: pes, payloadOffset: 6 };
    }

    if (view.byteLength < 9) return { header: pes, payloadOffset: 6 };

    const flags1 = view.getUint8(6);
    const flags2 = view.getUint8(7);
    const pes_header_data_length = view.getUint8(8);
    const payloadOffset = 9 + pes_header_data_length;
    const optionalFieldsEnd = 9 + pes_header_data_length;

    // --- Flags Byte 1 ---
    pes.marker_bits_2 = {
        value: (flags1 >> 6) & 3,
        offset: baseOffset + 6,
        length: 0.25,
    };
    pes.scrambling_control = {
        value: (flags1 >> 4) & 3,
        offset: baseOffset + 6,
        length: 0.25,
    };
    pes.priority = {
        value: (flags1 >> 3) & 1,
        offset: baseOffset + 6,
        length: 0.125,
    };
    pes.data_alignment_indicator = {
        value: (flags1 >> 2) & 1,
        offset: baseOffset + 6,
        length: 0.125,
    };
    pes.copyright = {
        value: (flags1 >> 1) & 1,
        offset: baseOffset + 6,
        length: 0.125,
    };
    pes.original_or_copy = {
        value: flags1 & 1,
        offset: baseOffset + 6,
        length: 0.125,
    };

    // --- Flags Byte 2 ---
    const ptsDtsFlags = (flags2 >> 6) & 3;
    const escrFlag = (flags2 >> 5) & 1;
    const esRateFlag = (flags2 >> 4) & 1;
    const dsmTrickModeFlag = (flags2 >> 3) & 1;
    const additionalCopyInfoFlag = (flags2 >> 2) & 1;
    const pesCrcFlag = (flags2 >> 1) & 1;
    const pesExtensionFlag = flags2 & 1;

    pes.pts_dts_flags = {
        value: ptsDtsFlags,
        offset: baseOffset + 7,
        length: 0.25,
    };
    pes.escr_flag = { value: escrFlag, offset: baseOffset + 7, length: 0.125 };
    pes.es_rate_flag = {
        value: esRateFlag,
        offset: baseOffset + 7,
        length: 0.125,
    };
    pes.dsm_trick_mode_flag = {
        value: dsmTrickModeFlag,
        offset: baseOffset + 7,
        length: 0.125,
    };
    pes.additional_copy_info_flag = {
        value: additionalCopyInfoFlag,
        offset: baseOffset + 7,
        length: 0.125,
    };
    pes.pes_crc_flag = {
        value: pesCrcFlag,
        offset: baseOffset + 7,
        length: 0.125,
    };
    pes.pes_extension_flag = {
        value: pesExtensionFlag,
        offset: baseOffset + 7,
        length: 0.125,
    };
    pes.pes_header_data_length = {
        value: pes_header_data_length,
        offset: baseOffset + 8,
        length: 1,
    };

    let optionalFieldsOffset = 9;

    if (ptsDtsFlags === 0b10 && optionalFieldsOffset + 5 <= optionalFieldsEnd) {
        pes.pts = {
            value: parseTimestamp(view, optionalFieldsOffset).toString(),
            offset: baseOffset + optionalFieldsOffset,
            length: 5,
        };
        optionalFieldsOffset += 5;
    } else if (
        ptsDtsFlags === 0b11 &&
        optionalFieldsOffset + 10 <= optionalFieldsEnd
    ) {
        pes.pts = {
            value: parseTimestamp(view, optionalFieldsOffset).toString(),
            offset: baseOffset + optionalFieldsOffset,
            length: 5,
        };
        pes.dts = {
            value: parseTimestamp(view, optionalFieldsOffset + 5).toString(),
            offset: baseOffset + optionalFieldsOffset + 5,
            length: 5,
        };
        optionalFieldsOffset += 10;
    }

    if (escrFlag && optionalFieldsOffset + 6 <= optionalFieldsEnd) {
        pes.ESCR = {
            value: parseScr(
                new DataView(
                    view.buffer,
                    view.byteOffset + optionalFieldsOffset
                )
            ).toString(),
            offset: baseOffset + optionalFieldsOffset,
            length: 6,
        };
        optionalFieldsOffset += 6;
    }

    if (esRateFlag && optionalFieldsOffset + 3 <= optionalFieldsEnd) {
        const rateBytes = view.getUint32(optionalFieldsOffset - 1); // Not byte aligned
        pes.ES_rate = {
            value: (rateBytes >> 1) & 0x3fffff,
            offset: baseOffset + optionalFieldsOffset,
            length: 3,
        };
        optionalFieldsOffset += 3;
    }

    if (dsmTrickModeFlag && optionalFieldsOffset + 1 <= optionalFieldsEnd) {
        const trickModeByte = view.getUint8(optionalFieldsOffset);
        const trick_mode_control = (trickModeByte >> 5) & 0x07;
        pes.trick_mode_control = {
            value: trick_mode_control,
            offset: baseOffset + optionalFieldsOffset,
            length: 0.375,
        };

        switch (trick_mode_control) {
            case 0b000: // fast_forward
            case 0b011: // fast_reverse
                pes.field_id = {
                    value: (trickModeByte >> 3) & 0x03,
                    offset: baseOffset + optionalFieldsOffset,
                    length: 0.25,
                };
                pes.intra_slice_refresh = {
                    value: (trickModeByte >> 2) & 0x01,
                    offset: baseOffset + optionalFieldsOffset,
                    length: 0.125,
                };
                pes.frequency_truncation = {
                    value: trickModeByte & 0x03,
                    offset: baseOffset + optionalFieldsOffset,
                    length: 0.25,
                };
                break;
            case 0b001: // slow_motion
            case 0b100: // slow_reverse
                pes.rep_cntrl = {
                    value: trickModeByte & 0x1f,
                    offset: baseOffset + optionalFieldsOffset,
                    length: 0.625,
                };
                break;
            case 0b010: // freeze_frame
                pes.field_id = {
                    value: (trickModeByte >> 3) & 0x03,
                    offset: baseOffset + optionalFieldsOffset,
                    length: 0.25,
                };
                break;
        }
        optionalFieldsOffset += 1;
    }

    if (
        additionalCopyInfoFlag &&
        optionalFieldsOffset + 1 <= optionalFieldsEnd
    ) {
        pes.additional_copy_info = {
            value: view.getUint8(optionalFieldsOffset) & 0x7f,
            offset: baseOffset + optionalFieldsOffset,
            length: 1,
        };
        optionalFieldsOffset += 1;
    }

    if (pesCrcFlag && optionalFieldsOffset + 2 <= optionalFieldsEnd) {
        pes.previous_PES_packet_CRC = {
            value: view.getUint16(optionalFieldsOffset),
            offset: baseOffset + optionalFieldsOffset,
            length: 2,
        };
        optionalFieldsOffset += 2;
    }

    if (pesExtensionFlag && optionalFieldsOffset + 1 <= optionalFieldsEnd) {
        const extFlags = view.getUint8(optionalFieldsOffset);
        const pesPrivateDataFlag = (extFlags >> 7) & 1;
        const packHeaderFieldFlag = (extFlags >> 6) & 1;
        const programPacketSequenceCounterFlag = (extFlags >> 5) & 1;
        const pStdBufferFlag = (extFlags >> 4) & 1;
        const pesExtensionFlag2 = extFlags & 1;

        pes.PES_private_data_flag = {
            value: pesPrivateDataFlag,
            offset: baseOffset + optionalFieldsOffset,
            length: 0.125,
        };
        pes.pack_header_field_flag = {
            value: packHeaderFieldFlag,
            offset: baseOffset + optionalFieldsOffset,
            length: 0.125,
        };
        pes.program_packet_sequence_counter_flag = {
            value: programPacketSequenceCounterFlag,
            offset: baseOffset + optionalFieldsOffset,
            length: 0.125,
        };
        pes.P_STD_buffer_flag = {
            value: pStdBufferFlag,
            offset: baseOffset + optionalFieldsOffset,
            length: 0.125,
        };
        pes.PES_extension_flag_2 = {
            value: pesExtensionFlag2,
            offset: baseOffset + optionalFieldsOffset,
            length: 0.125,
        };
        optionalFieldsOffset += 1;

        if (
            pesPrivateDataFlag &&
            optionalFieldsOffset + 16 <= optionalFieldsEnd
        ) {
            pes.PES_private_data = {
                value: '128 bits of private data',
                offset: baseOffset + optionalFieldsOffset,
                length: 16,
            };
            optionalFieldsOffset += 16;
        }
        if (
            packHeaderFieldFlag &&
            optionalFieldsOffset + 1 <= optionalFieldsEnd
        ) {
            const packFieldLength = view.getUint8(optionalFieldsOffset);
            pes.pack_field_length = {
                value: packFieldLength,
                offset: baseOffset + optionalFieldsOffset,
                length: 1,
            };
            optionalFieldsOffset += 1;
            if (optionalFieldsOffset + packFieldLength <= optionalFieldsEnd) {
                const packHeaderView = new DataView(
                    view.buffer,
                    view.byteOffset + optionalFieldsOffset,
                    packFieldLength
                );
                pes.pack_header = parsePackHeader(
                    packHeaderView,
                    baseOffset + optionalFieldsOffset
                );
                optionalFieldsOffset += packFieldLength;
            }
        }
        if (
            programPacketSequenceCounterFlag &&
            optionalFieldsOffset + 2 <= optionalFieldsEnd
        ) {
            const seqCounterByte1 = view.getUint8(optionalFieldsOffset);
            const seqCounterByte2 = view.getUint8(optionalFieldsOffset + 1);
            pes.program_packet_sequence_counter = {
                value: seqCounterByte1 & 0x7f,
                offset: baseOffset + optionalFieldsOffset,
                length: 1,
            };
            pes.MPEG1_MPEG2_identifier = {
                value: (seqCounterByte2 >> 6) & 1,
                offset: baseOffset + optionalFieldsOffset + 1,
                length: 0.125,
            };
            pes.original_stuff_length = {
                value: seqCounterByte2 & 0x3f,
                offset: baseOffset + optionalFieldsOffset + 1,
                length: 0.75,
            };
            optionalFieldsOffset += 2;
        }
        if (pStdBufferFlag && optionalFieldsOffset + 2 <= optionalFieldsEnd) {
            const pStdBufferBytes = view.getUint16(optionalFieldsOffset);
            pes.P_STD_buffer_scale = {
                value: (pStdBufferBytes >> 13) & 1,
                offset: baseOffset + optionalFieldsOffset,
                length: 0.125,
            };
            pes.P_STD_buffer_size = {
                value: pStdBufferBytes & 0x1fff,
                offset: baseOffset + optionalFieldsOffset,
                length: 1.625,
            };
            optionalFieldsOffset += 2;
        }
        if (
            pesExtensionFlag2 &&
            optionalFieldsOffset + 1 <= optionalFieldsEnd
        ) {
            const ext2len = view.getUint8(optionalFieldsOffset) & 0x7f;
            if (optionalFieldsOffset + 1 + ext2len <= optionalFieldsEnd) {
                const ext2Flags = view.getUint8(optionalFieldsOffset + 1);
                const streamIdExtFlag = (ext2Flags >> 7) & 1;

                pes.PES_extension_field_length = {
                    value: ext2len,
                    offset: baseOffset + optionalFieldsOffset,
                    length: 1,
                };
                pes.stream_id_extension_flag = {
                    value: streamIdExtFlag,
                    offset: baseOffset + optionalFieldsOffset + 1,
                    length: 0.125,
                };

                if (streamIdExtFlag === 0) {
                    pes.stream_id_extension = {
                        value: ext2Flags & 0x7f,
                        offset: baseOffset + optionalFieldsOffset + 1,
                        length: 0.875,
                    };
                } else {
                    const trefExtFlag = ext2Flags & 1;
                    pes.tref_extension_flag = {
                        value: trefExtFlag,
                        offset: baseOffset + optionalFieldsOffset + 1,
                        length: 0.125,
                    };
                    if (trefExtFlag === 0) {
                        pes.TREF = {
                            value: parseTimestamp(
                                view,
                                optionalFieldsOffset + 2
                            ).toString(),
                            offset: baseOffset + optionalFieldsOffset + 2,
                            length: 5,
                        };
                    }
                }
                optionalFieldsOffset += 1 + ext2len;
            }
        }
    }

    const isAvc = streamIdByte >= 0xe0 && streamIdByte <= 0xef;
    if (isAvc && payloadOffset < view.byteLength - 4) {
        for (let i = payloadOffset; i < view.byteLength - 4; i++) {
            let startCodeOffset = 0;
            let isStartCode = false;

            if (view.getUint32(i) === 0x00000001) {
                isStartCode = true;
                startCodeOffset = 4;
            } else if (view.getUint32(i) >>> 8 === 0x000001) {
                isStartCode = true;
                startCodeOffset = 3;
            }

            if (isStartCode) {
                const nalUnitHeaderByte = view.getUint8(i + startCodeOffset);
                const nalType = nalUnitHeaderByte & 0x1f;

                appLog(
                    'pes.js',
                    'info',
                    `Found NAL unit start code at offset ${
                        baseOffset + i
                    }. NAL Unit Type: ${nalType}`
                );

                if (nalType === 7) {
                    // SPS NAL unit
                    let start = i + startCodeOffset;
                    let end = -1;
                    for (let j = start; j < view.byteLength - 4; j++) {
                        if (
                            view.getUint32(j) === 0x00000001 ||
                            view.getUint32(j) >>> 8 === 0x000001
                        ) {
                            end = j;
                            break;
                        }
                    }
                    if (end === -1) end = view.byteLength;

                    const spsBytes = new Uint8Array(
                        view.buffer,
                        view.byteOffset + start,
                        end - start
                    );

                    pes.sps = spsBytes;
                    try {
                        pes.spsInfo = parseSPS(spsBytes);
                    } catch (e) {
                        console.warn('Failed to parse SPS NAL unit:', e);
                        pes.spsInfo = { error: e.message };
                    }
                    break;
                }
                i += startCodeOffset - 1;
            }
        }
    }

    return { header: pes, payloadOffset };
}

export const pesTooltipData = {
    PES: {
        text: 'Packetized Elementary Stream. Contains elementary stream data (e.g., video or audio frames) and timing information.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@packet_start_code_prefix': {
        text: 'A unique 24-bit code (0x000001) that identifies the start of a PES packet.',
        ref: 'Table 2-21',
    },
    'PES@stream_id': {
        text: 'Identifies the type of elementary stream (e.g., 0xE0 for video).',
        ref: 'Table 2-22',
    },
    'PES@pes_packet_length': {
        text: 'The number of bytes in the PES packet following this field. A value of 0 is only allowed for video in a transport stream.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@pts_dts_flags': {
        text: 'Indicates whether Presentation Time Stamp (PTS) and/or Decoding Time Stamp (DTS) are present.',
        ref: 'Table 2-21',
    },
    'PES@pts': {
        text: 'Presentation Time Stamp. Specifies the time at which a presentation unit is to be presented.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@dts': {
        text: 'Decoding Time Stamp. Specifies the time at which a presentation unit is to be decoded.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@escr_flag': {
        text: 'If set to 1, indicates the Elementary Stream Clock Reference (ESCR) field is present.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@ESCR': {
        text: 'Elementary Stream Clock Reference. A time stamp from which decoders of PES streams may derive timing.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@es_rate_flag': {
        text: 'If set to 1, indicates the ES_rate field is present.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@ES_rate': {
        text: 'The rate at which the system target decoder receives bytes of the PES packet in a PES stream, in units of 50 bytes/second.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@dsm_trick_mode_flag': {
        text: "A 1-bit flag which when set to '1' indicates the presence of an 8-bit trick mode field.",
        ref: 'Clause 2.4.3.7',
    },
    'PES@trick_mode_control': {
        text: 'A 3-bit field that indicates which trick mode is applied to the associated video stream.',
        ref: 'Clause 2.4.3.7, Table 2-24',
    },
    'PES@additional_copy_info_flag': {
        text: 'If set to 1, indicates the additional_copy_info field is present.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@additional_copy_info': {
        text: 'Private data relating to copyright information.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@pes_crc_flag': {
        text: 'If set to 1, indicates the previous_PES_packet_CRC field is present.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@previous_PES_packet_CRC': {
        text: 'A 16-bit CRC field calculated over the data bytes of the previous PES packet.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@pes_extension_flag': {
        text: "A 1-bit flag which when set to '1' indicates that an extension field exists in this PES packet header.",
        ref: 'Clause 2.4.3.7',
    },
    'PES@pack_header_field_flag': {
        text: 'If set to 1, indicates that a program stream pack header is stored in this PES packet header.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@program_packet_sequence_counter_flag': {
        text: 'If set to 1, indicates the program_packet_sequence_counter and related fields are present.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@program_packet_sequence_counter': {
        text: 'An optional 7-bit counter that increments with each successive PES packet of a program, allowing reconstruction of the original packet sequence.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@P_STD_buffer_flag': {
        text: 'If set to 1, indicates the P-STD buffer scale and size fields are present.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@P_STD_buffer_size': {
        text: 'Defines the size of the input buffer in the P-STD for this elementary stream.',
        ref: 'Clause 2.4.3.7',
    },
    'PES@pes_extension_flag_2': {
        text: 'A flag indicating the presence of further extension fields, like TREF or stream_id_extension.',
        ref: 'Clause 2.4.3.7, Table 2-21',
    },
    'PES@PES_extension_field_length': {
        text: 'The length in bytes of the data following this field in the PES extension.',
        ref: 'Clause 2.4.3.7, Table 2-21',
    },
    'PES@stream_id_extension_flag': {
        text: 'Indicates if the stream_id_extension field is present (flag=0) or if other extension flags are present (flag=1).',
        ref: 'Clause 2.4.3.7, Table 2-21',
    },
    'PES@stream_id_extension': {
        text: 'An extension to the stream_id field, allowing for more stream types to be identified.',
        ref: 'Clause 2.4.3.7, Table 2-27',
    },
    'PES@tref_extension_flag': {
        text: 'Indicates if the Timestamp Reference (TREF) field is present.',
        ref: 'Clause 2.4.3.7, Table 2-21',
    },
    'PES@TREF': {
        text: 'Timestamp Reference. Indicates the decoding time of a corresponding access unit in a reference elementary stream.',
        ref: 'Clause 2.4.3.7',
    },
};
