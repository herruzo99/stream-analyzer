import { parseSei } from './sei-parser.js';

/**
 * @typedef {object} NalUnit
 * @property {number} offset - Absolute byte offset in the file.
 * @property {number} length - Length of the NAL unit (excluding length prefix).
 * @property {number} type - NAL unit type.
 * @property {boolean} isIdr - True if this is an IDR/Keyframe NAL.
 * @property {boolean} isVcl - True if this is a Video Coding Layer NAL (slice data).
 * @property {boolean} isAud - True if this is an Access Unit Delimiter.
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

function analyzeNalHeader(headerByte, codec) {
    let nalType = 0;
    let isIdr = false;
    let isVcl = false;
    let isSei = false;
    let isAud = false;
    let headerSize = 1;

    if (codec === 'avc') {
        nalType = headerByte & 0x1f;
        isVcl = nalType >= 1 && nalType <= 5;
        isIdr = nalType === 5;
        isSei = nalType === 6;
        isAud = nalType === 9;
        headerSize = 1;
    } else if (codec === 'hevc') {
        nalType = (headerByte >> 1) & 0x3f;
        isVcl = nalType >= 0 && nalType <= 31;
        isIdr = nalType >= 19 && nalType <= 21; // BLA_W_LP to CRA_NUT
        isSei = nalType === 39 || nalType === 40;
        isAud = nalType === 35;
        headerSize = 2;
    } else if (codec === 'vvc') {
        // VVC header is 2 bytes, but type is in second byte. 
        // Caller needs to provide context or we assume headerByte is first byte.
        // This function is simple, VVC requires reading 2nd byte logic in parsing loop.
        // Handled in loops below.
        headerSize = 2; 
    }

    return { nalType, isIdr, isVcl, isSei, isAud, headerSize };
}

/**
 * Parses NAL units from a length-prefixed buffer (MP4 style).
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
        let { nalType, isIdr, isVcl, isSei, isAud, headerSize } = analyzeNalHeader(headerByte, codec);

        // VVC specific check
        if (codec === 'vvc' && currentNalOffset + 1 < buffer.byteLength) {
             const byte1 = view.getUint8(currentNalOffset + 1);
             nalType = (byte1 >> 3) & 0x1f;
             isVcl = nalType >= 0 && nalType <= 11;
             isIdr = nalType >= 7 && nalType <= 10;
             isSei = nalType === 23 || nalType === 24;
             isAud = nalType === 20; // AUD_NUT
        }

        const unit = {
            offset: baseOffset + currentNalOffset,
            length: nalLength,
            type: nalType,
            isIdr,
            isVcl,
            isAud
        };

        if (isSei && nalLength > headerSize) {
            try {
                const rawPayload = buffer.subarray(
                    currentNalOffset + headerSize,
                    currentNalOffset + nalLength
                );
                const rbsp = unescapeRBSP(rawPayload);
                unit.seiMessage = parseSei(rbsp, sps);
            } catch (e) {
                console.warn('Failed to parse SEI payload', e);
            }
        }

        nalList.push(unit);
        offset += lengthFieldSize + nalLength;
    }

    return nalList;
}

/**
 * Parses NAL units from an Annex B byte stream (Start Code prefixed).
 * @param {Uint8Array} buffer
 * @param {'avc' | 'hevc' | 'vvc'} codec
 * @returns {NalUnit[]}
 */
export function parseAnnexBNalUnits(buffer, codec) {
    const nalList = [];
    const len = buffer.length;
    const starts = [];

    // 1. Scan for Start Codes (0x000001)
    // Optimization: Skip 3 bytes at a time
    for (let i = 0; i < len - 3; i++) {
        if (buffer[i] === 0 && buffer[i+1] === 0 && buffer[i+2] === 1) {
            starts.push(i + 3); // Payload starts after 0x01
        }
    }

    for (let k = 0; k < starts.length; k++) {
        const current = starts[k];
        // End is start of next - 3 (prefix size) or -4 if 0x00000001, but conservative -3 is safe for delimitation
        // Correct logic: Look for next start code. The bytes between are the NAL + trailing zeroes of previous.
        // This simple splitter assumes 3-byte prefix.
        const nextStart = k < starts.length - 1 ? starts[k+1] - 3 : len; 
        
        // Handle 4-byte start codes (00 00 00 01) by checking byte before
        // But since we scanned for 00 00 01, we just found the boundary.
        // Note: The logic in `demuxer.js` might have stripped PES headers, leaving raw ES with start codes.
        
        let size = nextStart - current;
        // Trim trailing zeros that belong to next start code
        while (size > 0 && buffer[current + size - 1] === 0) {
            size--;
        }

        if (size > 0) {
            const headerByte = buffer[current];
            let { nalType, isIdr, isVcl, _isSei, isAud, _headerSize } = analyzeNalHeader(headerByte, codec);

             // VVC specific check
            if (codec === 'vvc' && size > 1) {
                const byte1 = buffer[current + 1];
                nalType = (byte1 >> 3) & 0x1f;
                isVcl = nalType >= 0 && nalType <= 11;
                isIdr = nalType >= 7 && nalType <= 10;
                // isSei = nalType === 23 || nalType === 24;
                isAud = nalType === 20; 
            }

            const unit = {
                offset: current, // Relative to buffer start
                length: size,
                type: nalType,
                isIdr,
                isVcl,
                isAud
            };
            
            // Note: SEI parsing for Annex B requires unescaping RBSP too.
            // We can add it here if needed, but for basic GOP analysis, types are enough.

            nalList.push(unit);
        }
    }

    return nalList;
}