import { appLog } from '@/shared/utils/debug';

/**
 * @typedef {object} NalUnit
 * @property {number} offset - Absolute byte offset in the file.
 * @property {number} length - Length of the NAL unit (excluding length prefix).
 * @property {number} type - NAL unit type.
 * @property {boolean} isIdr - True if this is an IDR/Keyframe NAL.
 * @property {boolean} isVcl - True if this is a Video Coding Layer NAL (slice data).
 */

/**
 * Parses NAL units from a buffer based on the lengthSizeMinusOne from avcC/hvcC.
 * @param {Uint8Array} buffer - The raw data of the mdat box.
 * @param {number} lengthSizeMinusOne - (header_length - 1). Typically 3 (4 bytes).
 * @param {'avc' | 'hevc'} codec - The codec type.
 * @param {number} baseOffset - The absolute offset of the mdat box start.
 * @returns {NalUnit[]}
 */
export function parseNalUnits(buffer, lengthSizeMinusOne, codec, baseOffset) {
    const nalList = [];
    const lengthFieldSize = lengthSizeMinusOne + 1;
    let offset = 0;
    const view = new DataView(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength
    );

    while (offset + lengthFieldSize < buffer.byteLength) {
        let nalLength = 0;
        if (lengthFieldSize === 4) {
            nalLength = view.getUint32(offset);
        } else if (lengthFieldSize === 2) {
            nalLength = view.getUint16(offset);
        } else {
            nalLength = view.getUint8(offset);
        }

        const currentNalOffset = offset + lengthFieldSize;

        if (currentNalOffset + nalLength > buffer.byteLength) {
            appLog(
                'NalParser',
                'warn',
                `NAL unit length ${nalLength} exceeds buffer bounds at offset ${offset}.`
            );
            break;
        }

        const headerByte = view.getUint8(currentNalOffset);
        let nalType = 0;
        let isIdr = false;
        let isVcl = false;

        if (codec === 'avc') {
            // AVC: Type is lower 5 bits
            nalType = headerByte & 0x1f;
            // Types 1-5 are VCL. 5 is IDR.
            isVcl = nalType >= 1 && nalType <= 5;
            isIdr = nalType === 5;
        } else if (codec === 'hevc') {
            // HEVC: Type is bits 1-6 (shifted right by 1)
            nalType = (headerByte >> 1) & 0x3f;
            // Types 0-31 are VCL.
            isVcl = nalType >= 0 && nalType <= 31;
            // IDR_W_RADL(19), IDR_N_LP(20), CRA_NUT(21)
            isIdr = nalType >= 19 && nalType <= 21;
        }

        nalList.push({
            offset: baseOffset + currentNalOffset,
            length: nalLength,
            type: nalType,
            isIdr,
            isVcl,
        });

        offset += lengthFieldSize + nalLength;
    }

    return nalList;
}
