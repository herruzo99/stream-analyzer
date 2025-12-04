/**
 * A utility class for safely parsing binary data, inspired by BoxParser.
 */
class DsmccParser {
    constructor(view, baseOffset) {
        this.view = view;
        this.baseOffset = baseOffset;
        this.offset = 0;
        this.details = {};
        this.stopped = false;
    }

    checkBounds(length) {
        if (this.stopped || this.offset + length > this.view.byteLength) {
            this.stopped = true;
            return false;
        }
        return true;
    }

    read(length, fieldName, readerFn, bits = length * 8) {
        if (!this.checkBounds(length)) return null;
        const value = readerFn.call(this.view, this.offset);
        this.details[fieldName] = {
            value,
            offset: this.baseOffset + this.offset,
            length: bits / 8,
        };
        this.offset += length;
        return value;
    }

    readUint8(f) {
        return this.read(1, f, this.view.getUint8);
    }
    readUint16(f) {
        return this.read(2, f, this.view.getUint16);
    }

    parseTimestamp(fieldName) {
        if (!this.checkBounds(5)) return null;
        const v = new DataView(
            this.view.buffer,
            this.view.byteOffset + this.offset,
            5
        );
        const high = BigInt((v.getUint8(0) & 0x0e) >> 1);
        const mid = BigInt((v.getUint16(1) & 0x7fff) >> 1);
        const low = BigInt((v.getUint16(3) & 0x7fff) >> 1);
        const value = (high << 30n) | (mid << 15n) | low;
        this.details[fieldName] = {
            value: value.toString(),
            offset: this.baseOffset + this.offset,
            length: 5,
        };
        this.offset += 5;
        return value;
    }
}

function parseTimeCode(p) {
    const byte0 = p.readUint8('timecode_header');
    if (p.stopped) return;
    const infinite_time_flag = byte0 & 1;
    p.details.infinite_time_flag = {
        value: infinite_time_flag,
        offset: p.details.timecode_header.offset,
        length: 0.125,
    };

    if (infinite_time_flag === 0) {
        p.parseTimestamp('PTS');
    }
}

export function parseDsmccPayload(view, baseOffset) {
    const p = new DsmccParser(view, baseOffset);
    const command_id = p.readUint8('command_id');

    if (p.stopped) return { type: 'DSM-CC (Truncated)', ...p.details };

    if (command_id === 0x01) {
        // Control Command
        const flags = p.readUint16('control_flags');
        if (p.stopped) return { type: 'DSM-CC Control', ...p.details };

        const select_flag = (flags >> 15) & 1;
        p.details.select_flag = {
            value: select_flag,
            offset: p.details.control_flags.offset,
            length: 0.125,
        };
        // ... (other flags could be parsed similarly)

        if (select_flag) {
            p.read(5, 'select_data_omitted');
        }

        const retrieval_flag = (flags >> 14) & 1;
        p.details.retrieval_flag = {
            value: retrieval_flag,
            offset: p.details.control_flags.offset + 0.125,
            length: 0.125,
        };

        if (retrieval_flag) {
            const rFlags = p.readUint16('retrieval_flags');
            if (p.stopped) return { type: 'DSM-CC Control', ...p.details };
            const jump_flag = (rFlags >> 15) & 1;
            const play_flag = (rFlags >> 14) & 1;

            if (jump_flag) {
                p.readUint8('jump_direction_indicator');
                parseTimeCode(p);
            }
            if (play_flag) {
                p.readUint8('play_flags');
                parseTimeCode(p);
            }
        }
        return { type: 'DSM-CC Control', ...p.details };
    } else if (command_id === 0x02) {
        // Acknowledgement
        const ackFlags = p.readUint16('ack_flags');
        if (p.stopped) return { type: 'DSM-CC Ack', ...p.details };

        const cmd_status = ackFlags & 1; // ARCHITECTURAL FIX: Removed (ackFlags >> 0) to satisfy SonarQube and simplify
        const retrieval_ack = (ackFlags >> 14) & 1;
        const storage_ack = (ackFlags >> 13) & 1;
        p.details.retrieval_ack = {
            value: retrieval_ack,
            offset: p.details.ack_flags.offset + 0.125,
            length: 0.125,
        };
        p.details.storage_ack = {
            value: storage_ack,
            offset: p.details.ack_flags.offset + 0.25,
            length: 0.125,
        };
        p.details.cmd_status = {
            value: cmd_status,
            offset: p.details.ack_flags.offset + 1.875,
            length: 0.125,
        };

        if (cmd_status === 1 && (retrieval_ack || storage_ack)) {
            parseTimeCode(p);
        }
        return { type: 'DSM-CC Ack', ...p.details };
    }

    return { type: 'DSM-CC Unknown', ...p.details };
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
