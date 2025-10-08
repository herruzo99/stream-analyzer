// Parsers the Adaptation Field of a TS packet.
// This includes decoding the AF length, flags (e.g., PCR_flag,
// random_access_indicator), and optional fields like the
// Program Clock Reference (PCR).
import { parseAfDescriptors } from '../descriptors/af-descriptors.js';

/**
 * Parses the 42-bit Program Clock Reference (PCR/OPCR).
 * @param {DataView} view - A DataView starting at the 6-byte PCR field.
 * @returns {BigInt} The combined 42-bit value.
 */
function parsePcr(view) {
    const byte0 = view.getUint8(0);
    const byte1 = view.getUint8(1);
    const byte2 = view.getUint8(2);
    const byte3 = view.getUint8(3);
    const byte4 = view.getUint8(4);
    const byte5 = view.getUint8(5);

    const base =
        (BigInt(byte0) << 25n) |
        (BigInt(byte1) << 17n) |
        (BigInt(byte2) << 9n) |
        (BigInt(byte3) << 1n) |
        BigInt(byte4 >> 7);

    const extension = ((BigInt(byte4) & 1n) << 8n) | BigInt(byte5);

    return base * 300n + extension;
}

/**
 * Parses the 33-bit DTS_next_AU timestamp.
 * @param {DataView} view - A DataView starting at the 5-byte field.
 * @returns {BigInt} The 33-bit DTS value.
 */
function parseNextDts(view) {
    const high = (view.getUint8(0) & 0x0e) >> 1;
    const mid = view.getUint16(1) & 0x7fff;
    const low = view.getUint16(3) & 0x7fff;
    return (BigInt(high) << 30n) | (BigInt(mid) << 15n) | BigInt(low);
}

/**
 * Parses the variable-length Adaptation Field.
 * @param {DataView} view - A DataView pointing to the start of the Adaptation Field.
 * @param {number} baseOffset - The offset of the AF within the entire segment.
 * @returns {object | null} The parsed AF data, or null if empty.
 */
export function parseAdaptationField(view, baseOffset) {
    const length = view.getUint8(0);
    if (length === 0)
        return { length: { value: 0, offset: baseOffset, length: 1 } };
    if (length > view.byteLength - 1)
        return {
            length: { value: length, offset: baseOffset, length: 1 },
            error: 'Invalid length',
        };

    const flags = view.getUint8(1);
    const af = {
        length: { value: length, offset: baseOffset, length: 1 },
        discontinuity_indicator: {
            value: (flags >> 7) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
        random_access_indicator: {
            value: (flags >> 6) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
        elementary_stream_priority_indicator: {
            value: (flags >> 5) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
        pcr_flag: {
            value: (flags >> 4) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
        opcr_flag: {
            value: (flags >> 3) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
        splicing_point_flag: {
            value: (flags >> 2) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
        transport_private_data_flag: {
            value: (flags >> 1) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
        adaptation_field_extension_flag: {
            value: flags & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
    };

    let currentOffset = 2;

    if (af.pcr_flag.value) {
        if (currentOffset + 6 <= length + 1) {
            af.pcr = {
                value: parsePcr(
                    new DataView(view.buffer, view.byteOffset + currentOffset)
                ).toString(),
                offset: baseOffset + currentOffset,
                length: 6,
            };
            currentOffset += 6;
        }
    }

    if (af.opcr_flag.value) {
        if (currentOffset + 6 <= length + 1) {
            af.opcr = {
                value: parsePcr(
                    new DataView(view.buffer, view.byteOffset + currentOffset)
                ).toString(),
                offset: baseOffset + currentOffset,
                length: 6,
            };
            currentOffset += 6;
        }
    }

    if (af.splicing_point_flag.value) {
        if (currentOffset + 1 <= length + 1) {
            af.splice_countdown = {
                value: view.getInt8(currentOffset),
                offset: baseOffset + currentOffset,
                length: 1,
            };
            currentOffset += 1;
        }
    }

    if (af.transport_private_data_flag.value) {
        if (currentOffset + 1 <= length + 1) {
            const len = view.getUint8(currentOffset);
            af.private_data_length = {
                value: len,
                offset: baseOffset + currentOffset,
                length: 1,
            };
            currentOffset += 1 + len;
        }
    }

    if (af.adaptation_field_extension_flag.value) {
        if (currentOffset + 1 <= length + 1) {
            const ext_len = view.getUint8(currentOffset);
            const ext_flags = view.getUint8(currentOffset + 1);
            const af_descriptor_not_present_flag = (ext_flags >> 4) & 1;
            af.extension = {
                length: {
                    value: ext_len,
                    offset: baseOffset + currentOffset,
                    length: 1,
                },
                ltw_flag: {
                    value: (ext_flags >> 7) & 1,
                    offset: baseOffset + currentOffset + 1,
                    length: 0.125,
                },
                piecewise_rate_flag: {
                    value: (ext_flags >> 6) & 1,
                    offset: baseOffset + currentOffset + 1,
                    length: 0.125,
                },
                seamless_splice_flag: {
                    value: (ext_flags >> 5) & 1,
                    offset: baseOffset + currentOffset + 1,
                    length: 0.125,
                },
                af_descriptor_not_present_flag: {
                    value: af_descriptor_not_present_flag,
                    offset: baseOffset + currentOffset + 1,
                    length: 0.125,
                },
            };
            let extOffset = currentOffset + 2;
            if (
                af.extension.ltw_flag.value &&
                extOffset + 2 <= currentOffset + 1 + ext_len
            ) {
                const ltw_word = view.getUint16(extOffset);
                af.extension.ltw_valid_flag = {
                    value: (ltw_word >> 15) & 1,
                    offset: baseOffset + extOffset,
                    length: 0.125,
                };
                af.extension.ltw_offset = {
                    value: ltw_word & 0x7fff,
                    offset: baseOffset + extOffset,
                    length: 1.875,
                };
                extOffset += 2;
            }
            if (
                af.extension.piecewise_rate_flag.value &&
                extOffset + 3 <= currentOffset + 1 + ext_len
            ) {
                const rate_dword = view.getUint32(extOffset - 1) & 0x3fffff00; // Aligned to byte boundary
                af.extension.piecewise_rate = {
                    value: rate_dword >> 8,
                    offset: baseOffset + extOffset,
                    length: 3,
                };
                extOffset += 3;
            }
            if (
                af.extension.seamless_splice_flag.value &&
                extOffset + 5 <= currentOffset + 1 + ext_len
            ) {
                af.extension.splice_type = {
                    value: view.getUint8(extOffset) >> 4,
                    offset: baseOffset + extOffset,
                    length: 0.5,
                };
                af.extension.DTS_next_AU = {
                    value: parseNextDts(
                        new DataView(view.buffer, view.byteOffset + extOffset)
                    ).toString(),
                    offset: baseOffset + extOffset,
                    length: 5,
                };
                extOffset += 5;
            }

            const remainingBytesInExt = currentOffset + 1 + ext_len - extOffset;
            if (remainingBytesInExt > 0) {
                if (af_descriptor_not_present_flag === 0) {
                    const descriptorView = new DataView(
                        view.buffer,
                        view.byteOffset + extOffset,
                        remainingBytesInExt
                    );
                    af.extension.af_descriptors = parseAfDescriptors(
                        descriptorView,
                        baseOffset + extOffset
                    );
                } else {
                    af.extension.reserved_bytes = {
                        value: `${remainingBytesInExt} reserved bytes`,
                        offset: baseOffset + extOffset,
                        length: remainingBytesInExt,
                    };
                }
            }

            currentOffset += 1 + ext_len;
        }
    }

    const stuffingBytes = length + 1 - currentOffset;
    if (stuffingBytes > 0) {
        af.stuffing_bytes = {
            value: stuffingBytes,
            offset: baseOffset + currentOffset,
            length: stuffingBytes,
        };
    }

    return af;
}

export const adaptationFieldTooltipData = {
    'AF@length': {
        text: 'The total length of the adaptation field in bytes, not including this length byte itself.',
        ref: 'Clause 2.4.3.5',
    },
    'AF@discontinuity_indicator': {
        text: 'Set to 1 if a discontinuity is indicated for the current TS packet.',
        ref: 'Clause 2.4.3.5',
    },
    'AF@random_access_indicator': {
        text: 'Set to 1 if the stream may be randomly accessed at this point.',
        ref: 'Clause 2.4.3.5',
    },
    'AF@pcr_flag': {
        text: 'Set to 1 if the adaptation field contains a Program Clock Reference (PCR).',
        ref: 'Clause 2.4.3.5',
    },
    'AF@pcr': {
        text: "Program Clock Reference. A timestamp used to synchronize the decoder's clock.",
        ref: 'Clause 2.4.3.5',
    },
    'AF@af_descriptor_not_present_flag': {
        text: 'If set to 0, signals the presence of one or more descriptors in the adaptation field extension.',
        ref: 'Clause 2.4.3.4',
    },
};
