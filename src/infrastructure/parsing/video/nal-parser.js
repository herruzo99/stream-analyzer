import { parseSei } from './sei-parser.js';

/**
 * @typedef {object} NalUnit
 * @property {number} offset - Absolute byte offset in the file.
 * @property {number} length - Length of the NAL unit (excluding length prefix).
 * @property {number} type - NAL unit type.
 * @property {boolean} isIdr - True if this is an IDR/Keyframe NAL.
 * @property {boolean} isVcl - True if this is a Video Coding Layer NAL (slice data).
 * @property {any} [seiMessage] - Parsed SEI data if applicable.
 */

/**
 * Unescapes Emulation Prevention Bytes.
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
function unescapeRBSP(data) {
    const length = data.length;
    let emulationCount = 0;
    for (let i = 0; i < length - 2; i++) {
        if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 3) {
            emulationCount++;
            i += 2;
        }
    }
    if (emulationCount === 0) return data;
    const output = new Uint8Array(length - emulationCount);
    let outIdx = 0;
    for (let i = 0; i < length; i++) {
        if (
            i < length - 2 &&
            data[i] === 0 &&
            data[i + 1] === 0 &&
            data[i + 2] === 3
        ) {
            output[outIdx++] = 0;
            output[outIdx++] = 0;
            i += 2;
        } else {
            output[outIdx++] = data[i];
        }
    }
    return output;
}

/**
 * Parses NAL units from a buffer.
 * @param {Uint8Array} buffer
 * @param {number} lengthSizeMinusOne
 * @param {'avc' | 'hevc' | 'vvc'} codec
 * @param {number} baseOffset
 * @param {object} [sps] Optional SPS context for SEI parsing
 * @returns {NalUnit[]}
 */
export function parseNalUnits(
    buffer,
    lengthSizeMinusOne,
    codec,
    baseOffset,
    sps = null
) {
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
            break;
        }

        const headerByte = view.getUint8(currentNalOffset);
        let nalType = 0;
        let isIdr = false;
        let isVcl = false;
        let isSei = false;
        let headerSize = 1;

        if (codec === 'avc') {
            nalType = headerByte & 0x1f;
            isVcl = nalType >= 1 && nalType <= 5;
            isIdr = nalType === 5;
            isSei = nalType === 6;
            headerSize = 1;
        } else if (codec === 'hevc') {
            nalType = (headerByte >> 1) & 0x3f;
            isVcl = nalType >= 0 && nalType <= 31;
            isIdr = nalType >= 19 && nalType <= 21;
            isSei = nalType === 39 || nalType === 40;
            headerSize = 2;
        } else if (codec === 'vvc') {
            if (currentNalOffset + 1 < buffer.byteLength) {
                const byte1 = view.getUint8(currentNalOffset + 1);
                nalType = (byte1 >> 3) & 0x1f;
                isVcl = nalType >= 0 && nalType <= 11;
                isIdr = nalType >= 7 && nalType <= 10;
                isSei = nalType === 23 || nalType === 24;
                headerSize = 2;
            }
        }

        const unit = {
            offset: baseOffset + currentNalOffset,
            length: nalLength,
            type: nalType,
            isIdr,
            isVcl,
        };

        if (isSei && nalLength > headerSize) {
            try {
                const rawPayload = buffer.subarray(
                    currentNalOffset + headerSize,
                    currentNalOffset + nalLength
                );
                const rbsp = unescapeRBSP(rawPayload);
                unit.seiMessage = parseSei(rbsp, sps); // Pass SPS
            } catch (e) {
                console.warn('Failed to parse SEI payload', e);
            }
        }

        nalList.push(unit);
        offset += lengthFieldSize + nalLength;
    }

    return nalList;
}
