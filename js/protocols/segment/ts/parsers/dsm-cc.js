// Parses Digital Storage Media Command and Control (DSM-CC) messages
// carried within TS packets, as specified in Annex B of ISO/IEC 13818-1.

/**
 * Parses a 33-bit timestamp from a 5-byte field.
 * @param {DataView} view - A DataView starting at the 5-byte field.
 * @param {number} offset - The offset within the view to start reading.
 * @returns {BigInt} The combined 33-bit value.
 */
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
 * Parses the time_code structure.
 * @param {object} details - The object to populate with parsed data.
 * @param {DataView} view - A DataView of the time_code structure.
 * @param {number} baseOffset - The offset of this structure within the segment.
 * @returns {number} The number of bytes consumed.
 */
function parseTimeCode(details, view, baseOffset) {
    const byte0 = view.getUint8(0);
    const infinite_time_flag = byte0 & 1;

    details.infinite_time_flag = {
        value: infinite_time_flag,
        offset: baseOffset,
        length: 0.125,
    };

    if (infinite_time_flag === 0) {
        if (view.byteLength < 6) return 1;
        details.PTS = {
            value: parseTimestamp(view, 1).toString(),
            offset: baseOffset + 1,
            length: 5,
        };
        return 6;
    }
    return 1;
}

/**
 * Parses the main DSM-CC payload, which can be a control command or an acknowledgement.
 * @param {DataView} view - A DataView of the DSM-CC payload.
 * @param {number} baseOffset - The offset of the payload within the segment.
 * @returns {object} An object containing parsed DSM-CC information.
 */
export function parseDsmccPayload(view, baseOffset) {
    if (view.byteLength < 1) {
        return { type: 'DSM-CC', error: 'Payload too short.' };
    }

    const command_id = view.getUint8(0);
    const details = {
        command_id: { value: command_id, offset: baseOffset, length: 1 },
    };
    let payloadOffset = 1;

    if (command_id === 0x01) {
        // Control Command
        if (view.byteLength < 3) return { type: 'DSM-CC Control', ...details };
        const flags = view.getUint16(1);
        const select_flag = (flags >> 15) & 1;
        const retrieval_flag = (flags >> 14) & 1;
        const storage_flag = (flags >> 13) & 1;

        details.select_flag = {
            value: select_flag,
            offset: baseOffset + 1,
            length: 0.125,
        };
        details.retrieval_flag = {
            value: retrieval_flag,
            offset: baseOffset + 1,
            length: 0.125,
        };
        details.storage_flag = {
            value: storage_flag,
            offset: baseOffset + 1,
            length: 0.125,
        };
        payloadOffset = 3;

        if (select_flag) {
            if (view.byteLength < payloadOffset + 5)
                return { type: 'DSM-CC Control', ...details };
            const b1 = view.getUint16(payloadOffset);
            const b2 = view.getUint16(payloadOffset + 2);
            const b3 = view.getUint8(payloadOffset + 4);

            const bitstream_id_part1 = b1 >> 1;
            const bitstream_id_part2 = ((b1 & 1) << 14) | (b2 >> 2);
            const bitstream_id_part3 = b2 & 3;
            const bitstream_id =
                (BigInt(bitstream_id_part1) << 17n) |
                (BigInt(bitstream_id_part2) << 2n) |
                BigInt(bitstream_id_part3);

            details.bitstream_id = {
                value: bitstream_id.toString(),
                offset: baseOffset + payloadOffset,
                length: 4.25,
            };
            details.select_mode = {
                value: (b3 >> 3) & 0x1f,
                offset: baseOffset + payloadOffset + 4.25,
                length: 0.625,
            };
            payloadOffset += 5;
        }

        if (retrieval_flag) {
            if (view.byteLength < payloadOffset + 2)
                return { type: 'DSM-CC Control', ...details };
            const rFlags = view.getUint16(payloadOffset);
            const jump_flag = (rFlags >> 15) & 1;
            const play_flag = (rFlags >> 14) & 1;

            details.jump_flag = {
                value: jump_flag,
                offset: baseOffset + payloadOffset,
                length: 0.125,
            };
            details.play_flag = {
                value: play_flag,
                offset: baseOffset + payloadOffset,
                length: 0.125,
            };
            details.pause_mode = {
                value: (rFlags >> 13) & 1,
                offset: baseOffset + payloadOffset,
                length: 0.125,
            };
            details.resume_mode = {
                value: (rFlags >> 12) & 1,
                offset: baseOffset + payloadOffset,
                length: 0.125,
            };
            details.stop_mode = {
                value: (rFlags >> 11) & 1,
                offset: baseOffset + payloadOffset,
                length: 0.125,
            };
            payloadOffset += 2;

            if (jump_flag) {
                details.direction_indicator = {
                    value: view.getUint8(payloadOffset) & 1,
                    offset: baseOffset + payloadOffset,
                    length: 0.125,
                };
                payloadOffset += 1;
                payloadOffset += parseTimeCode(
                    details,
                    new DataView(view.buffer, view.byteOffset + payloadOffset),
                    baseOffset + payloadOffset
                );
            }
            if (play_flag) {
                const pFlags = view.getUint8(payloadOffset);
                details.speed_mode = {
                    value: (pFlags >> 7) & 1,
                    offset: baseOffset + payloadOffset,
                    length: 0.125,
                };
                details.direction_indicator = {
                    value: (pFlags >> 6) & 1,
                    offset: baseOffset + payloadOffset,
                    length: 0.125,
                };
                payloadOffset += 1;
                payloadOffset += parseTimeCode(
                    details,
                    new DataView(view.buffer, view.byteOffset + payloadOffset),
                    baseOffset + payloadOffset
                );
            }
        }

        if (storage_flag) {
            if (view.byteLength < payloadOffset + 2)
                return { type: 'DSM-CC Control', ...details };
            const sFlags = view.getUint8(payloadOffset);
            const record_flag = (sFlags >> 1) & 1;
            details.record_flag = {
                value: record_flag,
                offset: baseOffset + payloadOffset,
                length: 0.125,
            };
            details.stop_mode = {
                value: sFlags & 1,
                offset: baseOffset + payloadOffset,
                length: 0.125,
            };
            payloadOffset += 1; // Assuming 1 byte for storage flags, spec is ambiguous on length
            if (record_flag) {
                payloadOffset += parseTimeCode(
                    details,
                    new DataView(view.buffer, view.byteOffset + payloadOffset),
                    baseOffset + payloadOffset
                );
            }
        }
        return { type: 'DSM-CC Control', ...details };
    } else if (command_id === 0x02) {
        // Acknowledgement
        if (view.byteLength < 3) return { type: 'DSM-CC Ack', ...details };
        const ackFlags = view.getUint16(1);
        const retrieval_ack = (ackFlags >> 14) & 1;
        const storage_ack = (ackFlags >> 13) & 1;
        const cmd_status = (ackFlags >> 0) & 1;

        details.select_ack = {
            value: (ackFlags >> 15) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        };
        details.retrieval_ack = {
            value: retrieval_ack,
            offset: baseOffset + 1,
            length: 0.125,
        };
        details.storage_ack = {
            value: storage_ack,
            offset: baseOffset + 1,
            length: 0.125,
        };
        details.error_ack = {
            value: (ackFlags >> 12) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        };
        details.cmd_status = {
            value: cmd_status,
            offset: baseOffset + 2,
            length: 0.125,
        };
        payloadOffset = 3;

        if (cmd_status === 1 && (retrieval_ack || storage_ack)) {
            parseTimeCode(
                details,
                new DataView(view.buffer, view.byteOffset + payloadOffset),
                baseOffset + payloadOffset
            );
        }
        return { type: 'DSM-CC Ack', ...details };
    }

    return { type: 'DSM-CC Unknown', ...details };
}

export const dsmccTooltipData = {
    'DSM-CC Section/Packet': {
        text: 'Digital Storage Media Command and Control. A protocol for controlling playback of stored or broadcast media, used in interactive TV and other applications.',
        ref: 'Annex B & ISO/IEC 13818-6',
    },
    'DSM-CC Control': {
        text: 'A DSM-CC control command message.',
        ref: 'Table B.3',
    },
    'DSM-CC Ack': {
        text: 'A DSM-CC acknowledgement message.',
        ref: 'Table B.5',
    },
    'DSM-CC Control@command_id': {
        text: 'Identifies the message as a control command (0x01).',
        ref: 'Table B.2',
    },
    'DSM-CC Ack@command_id': {
        text: 'Identifies the message as an acknowledgement (0x02).',
        ref: 'Table B.2',
    },
    'DSM-CC Control@select_flag': {
        text: 'When set to 1, specifies a bitstream selection operation.',
        ref: 'Clause B.3.5',
    },
    'DSM-CC Control@retrieval_flag': {
        text: 'When set to 1, specifies a playback (retrieval) action.',
        ref: 'Clause B.3.5',
    },
    'DSM-CC Control@storage_flag': {
        text: 'When set to 1, specifies a storage operation.',
        ref: 'Clause B.3.5',
    },
    'DSM-CC Control@bitstream_id': {
        text: 'A 32-bit identifier specifying which bitstream to select.',
        ref: 'Clause B.3.5',
    },
    'DSM-CC Control@select_mode': {
        text: 'Specifies the mode of operation (1=Storage, 2=Retrieval).',
        ref: 'Table B.4',
    },
    'DSM-CC Control@jump_flag': {
        text: 'When set to 1, specifies a jump to a new PTS.',
        ref: 'Clause B.3.5',
    },
    'DSM-CC Control@play_flag': {
        text: 'When set to 1, specifies to play the stream.',
        ref: 'Clause B.3.5',
    },
    'DSM-CC Control@pause_mode': {
        text: 'When set to 1, specifies to pause playback.',
        ref: 'Clause B.3.5',
    },
    'DSM-CC Control@resume_mode': {
        text: 'When set to 1, specifies to resume playback.',
        ref: 'Clause B.3.5',
    },
    'DSM-CC Control@stop_mode': {
        text: 'When set to 1, specifies to stop the current operation.',
        ref: 'Clause B.3.5',
    },
    'DSM-CC Control@direction_indicator': {
        text: 'Indicates playback direction (1=forward, 0=backward).',
        ref: 'Clause B.3.5',
    },
    'DSM-CC Control@speed_mode': {
        text: 'Specifies playback speed (1=normal, 0=fast).',
        ref: 'Clause B.3.5',
    },
    'DSM-CC Control@record_flag': {
        text: 'When set to 1, requests recording of the bitstream.',
        ref: 'Clause B.3.5',
    },
    'DSM-CC Ack@select_ack': {
        text: 'Acknowledges a select command.',
        ref: 'Clause B.3.7',
    },
    'DSM-CC Ack@retrieval_ack': {
        text: 'Acknowledges a retrieval command.',
        ref: 'Clause B.3.7',
    },
    'DSM-CC Ack@storage_ack': {
        text: 'Acknowledges a storage command.',
        ref: 'Clause B.3.7',
    },
    'DSM-CC Ack@error_ack': {
        text: 'Indicates a DSM error (e.g., End of File).',
        ref: 'Clause B.3.7',
    },
    'DSM-CC Ack@cmd_status': {
        text: 'Indicates if the command was accepted (1) or rejected (0).',
        ref: 'Clause B.3.7',
    },
    'DSM-CC Control@infinite_time_flag': {
        text: 'When set to 1, indicates an infinite time period for an operation.',
        ref: 'Clause B.3.9',
    },
    'DSM-CC Ack@infinite_time_flag': {
        text: 'When set to 1, indicates an infinite time period for an operation.',
        ref: 'Clause B.3.9',
    },
    'DSM-CC Control@PTS': {
        text: 'Specifies a relative duration for an operation, in 90kHz clock ticks.',
        ref: 'Clause B.3.8',
    },
    'DSM-CC Ack@PTS': {
        text: 'Reports the current operational PTS value, in 90kHz clock ticks.',
        ref: 'Clause B.3.8',
    },
};
