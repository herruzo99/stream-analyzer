/**
 * A bit-level reader for parsing non-byte-aligned data structures.
 */
class Bitstream {
    constructor(data) {
        this.data = data;
        this.bytePosition = 0;
        this.bitPosition = 0;
    }

    readBits(n) {
        let result = 0;
        for (let i = 0; i < n; i++) {
            const byte = this.data[this.bytePosition];
            const bit = (byte >> (7 - this.bitPosition)) & 1;
            result = (result << 1) | bit;
            this.bitPosition++;
            if (this.bitPosition === 8) {
                this.bitPosition = 0;
                this.bytePosition++;
            }
        }
        return result;
    }

    readBigBits(n) {
        let result = 0n;
        for (let i = 0; i < n; i++) {
            const byte = this.data[this.bytePosition];
            const bit = (byte >> (7 - this.bitPosition)) & 1;
            result = (result << 1n) | BigInt(bit);
            this.bitPosition++;
            if (this.bitPosition === 8) {
                this.bitPosition = 0;
                this.bytePosition++;
            }
        }
        return result;
    }

    readBytes(n) {
        const result = this.data.subarray(this.bytePosition, this.bytePosition + n);
        this.bytePosition += n;
        return result;
    }

    skipBits(n) {
        this.bytePosition += Math.floor((this.bitPosition + n) / 8);
        this.bitPosition = (this.bitPosition + n) % 8;
    }

    alignToByte() {
        if (this.bitPosition !== 0) {
            this.bitPosition = 0;
            this.bytePosition++;
        }
    }

    hasMoreData() {
        return this.bytePosition < this.data.length;
    }
}

const SPLICE_COMMAND_TYPES = {
    0x00: 'Splice Null',
    0x04: 'Splice Schedule',
    0x05: 'Splice Insert',
    0x06: 'Time Signal',
    0x07: 'Bandwidth Reservation',
    0xff: 'Private Command',
};

const SEGMENTATION_TYPE_IDS = {
    0x10: 'Program Start',
    0x11: 'Program End',
    0x20: 'Chapter Start',
    0x21: 'Chapter End',
    0x30: 'Provider Advertisement Start',
    0x31: 'Provider Advertisement End',
    0x32: 'Distributor Advertisement Start',
    0x33: 'Distributor Advertisement End',
    0x34: 'Provider Placement Opportunity Start',
    0x35: 'Provider Placement Opportunity End',
    0x36: 'Distributor Placement Opportunity Start',
    0x37: 'Distributor Placement Opportunity End',
    0x50: 'Network Start',
    0x51: 'Network End',
};

function parseSpliceTime(bs) {
    const time_specified_flag = bs.readBits(1);
    if (time_specified_flag) {
        bs.skipBits(6); // reserved
        return {
            time_specified: true,
            pts_time: Number(bs.readBigBits(33)),
        };
    } else {
        bs.skipBits(7); // reserved
        return { time_specified: false };
    }
}

function parseBreakDuration(bs) {
    const auto_return = bs.readBits(1);
    bs.skipBits(6); // reserved
    return {
        auto_return: auto_return === 1,
        duration: Number(bs.readBigBits(33)),
    };
}

function parseSpliceInsert(bs) {
    const command = {};
    command.type = 'Splice Insert';
    command.splice_event_id = bs.readBits(32);
    command.splice_event_cancel_indicator = bs.readBits(1);
    bs.skipBits(7); // reserved

    if (!command.splice_event_cancel_indicator) {
        command.out_of_network_indicator = bs.readBits(1);
        command.program_splice_flag = bs.readBits(1);
        command.duration_flag = bs.readBits(1);
        command.splice_immediate_flag = bs.readBits(1);
        bs.skipBits(4); // reserved

        if (command.program_splice_flag && !command.splice_immediate_flag) {
            command.splice_time = parseSpliceTime(bs);
        }
        if (command.duration_flag) {
            command.break_duration = parseBreakDuration(bs);
        }
        command.unique_program_id = bs.readBits(16);
        command.avail_num = bs.readBits(8);
        command.avails_expected = bs.readBits(8);
    }
    return command;
}

function parseTimeSignal(bs) {
    return {
        type: 'Time Signal',
        splice_time: parseSpliceTime(bs),
    };
}

function parseSegmentationDescriptor(bs, length) {
    const descriptor = {};
    const startPos = bs.bytePosition;

    descriptor.segmentation_event_id = bs.readBits(32);
    descriptor.segmentation_event_cancel_indicator = bs.readBits(1);
    bs.skipBits(7); // reserved

    if (!descriptor.segmentation_event_cancel_indicator) {
        descriptor.program_segmentation_flag = bs.readBits(1);
        descriptor.segmentation_duration_flag = bs.readBits(1);
        descriptor.delivery_not_restricted_flag = bs.readBits(1);
        bs.skipBits(5); // reserved

        if (descriptor.segmentation_duration_flag) {
            descriptor.segmentation_duration = Number(bs.readBigBits(40));
        }

        descriptor.segmentation_upid_type = bs.readBits(8);
        const upidLength = bs.readBits(8);
        if (upidLength > 0) {
            descriptor.segmentation_upid = new TextDecoder().decode(bs.readBytes(upidLength));
        }
        const typeId = bs.readBits(8);
        descriptor.segmentation_type_id = SEGMENTATION_TYPE_IDS[typeId] || `Unknown (${typeId})`;
        descriptor.segment_num = bs.readBits(8);
        descriptor.segments_expected = bs.readBits(8);
    }
    // Skip any remaining bytes in the descriptor
    const bytesRead = bs.bytePosition - startPos;
    if (length > bytesRead) {
        bs.skipBits((length - bytesRead) * 8);
    }

    return descriptor;
}

function parseSpliceInfoSection(bs) {
    const section = {};
    section.table_id = bs.readBits(8);
    if (section.table_id !== 0xfc) return { error: 'Invalid table_id for SCTE-35 message' };

    section.section_syntax_indicator = bs.readBits(1);
    section.private_indicator = bs.readBits(1);
    bs.skipBits(2); // reserved
    const section_length = bs.readBits(12);
    const endOfSection = bs.bytePosition + section_length;

    section.protocol_version = bs.readBits(8);
    section.encrypted_packet = bs.readBits(1);
    section.encryption_algorithm = bs.readBits(6);
    section.pts_adjustment = Number(bs.readBigBits(33));
    section.cw_index = bs.readBits(8);
    section.tier = bs.readBits(12);

    const splice_command_length = bs.readBits(12);
    const splice_command_type = bs.readBits(8);
    section.splice_command_type = SPLICE_COMMAND_TYPES[splice_command_type] || `Unknown (${splice_command_type})`;

    switch (splice_command_type) {
        case 0x05:
            section.splice_command = parseSpliceInsert(bs);
            break;
        case 0x06:
            section.splice_command = parseTimeSignal(bs);
            break;
        default:
            bs.skipBits(splice_command_length * 8);
            section.splice_command = { type: 'Unsupported' };
            break;
    }

    const descriptor_loop_length = bs.readBits(16);
    let descriptorsBytesRead = 0;
    section.descriptors = [];
    while (descriptorsBytesRead < descriptor_loop_length) {
        const tag = bs.readBits(8);
        const length = bs.readBits(8);
        if (tag === 0x02) { // segmentation_descriptor
            section.descriptors.push(parseSegmentationDescriptor(bs, length));
        } else {
            bs.skipBits(length * 8); // Skip unknown descriptors
        }
        descriptorsBytesRead += 2 + length;
    }

    bs.alignToByte();
    // Move to end of section, skipping potential E_CRC_32 and stuffing
    bs.bytePosition = endOfSection - 4;
    section.crc_32 = bs.readBits(32);

    return section;
}

/**
 * Parses a binary SCTE-35 splice_info_section.
 * @param {Uint8Array} data The binary data of the SCTE-35 message.
 * @returns {object} The parsed SCTE-35 structure.
 */
export function parseScte35(data) {
    try {
        const bitstream = new Bitstream(data);
        return parseSpliceInfoSection(bitstream);
    } catch (e) {
        console.error('SCTE-35 parsing error:', e);
        return { error: e.message };
    }
}