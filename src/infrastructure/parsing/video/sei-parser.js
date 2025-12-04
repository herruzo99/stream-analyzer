import { parseCaptionPayload } from './cea-parser.js';

/**
 * @typedef {Object} SeiMessage
 * @property {number} payloadType
 * @property {string} typeName
 * @property {number} payloadSize
 * @property {any} data
 * @property {Uint8Array} raw
 */

const SEI_TYPES = {
    0: 'buffering_period',
    1: 'pic_timing',
    2: 'pan_scan_rect',
    3: 'filler_payload',
    4: 'user_data_registered_itu_t_t35',
    5: 'user_data_unregistered',
    6: 'recovery_point',
    137: 'mastering_display_colour_volume',
    144: 'content_light_level_info',
};

class BitReader {
    constructor(buffer) {
        this.buffer = buffer;
        this.byteIndex = 0;
        this.bitIndex = 0;
    }

    readBits(n) {
        let result = 0;
        for (let i = 0; i < n; i++) {
            if (this.byteIndex >= this.buffer.length) return 0;
            const bit =
                (this.buffer[this.byteIndex] >> (7 - this.bitIndex)) & 1;
            result = result * 2 + bit;
            this.bitIndex++;
            if (this.bitIndex === 8) {
                this.bitIndex = 0;
                this.byteIndex++;
            }
        }
        return result;
    }

    readBigBits(n) {
        let result = 0n;
        for (let i = 0; i < n; i++) {
            if (this.byteIndex >= this.buffer.length) return 0n;
            const bit = BigInt(
                (this.buffer[this.byteIndex] >> (7 - this.bitIndex)) & 1
            );
            result = (result << 1n) | bit;
            this.bitIndex++;
            if (this.bitIndex === 8) {
                this.bitIndex = 0;
                this.byteIndex++;
            }
        }
        return result;
    }

    readUE() {
        let leadingZeroBits = 0;
        while (this.byteIndex < this.buffer.length && this.readBits(1) === 0) {
            leadingZeroBits++;
        }
        if (leadingZeroBits === 0) return 0;
        const codeNum = this.readBits(leadingZeroBits);
        return (1 << leadingZeroBits) - 1 + codeNum;
    }
}

function isPrintableText(buffer) {
    if (buffer.length === 0) return false;
    let printable = 0;
    for (let i = 0; i < buffer.length; i++) {
        const b = buffer[i];
        if (b === 9 || b === 10 || b === 13 || (b >= 32 && b <= 126)) {
            printable++;
        }
    }
    return printable / buffer.length > 0.9;
}

// Helper: Extract SPS data needed for SEI parsing
function getHrdParams(sps) {
    if (!sps || !sps.hrdParams) return null;
    return sps.hrdParams;
}

function parseBufferingPeriod(payload, sps) {
    const hrd = getHrdParams(sps);
    if (!hrd) return { error: 'Missing SPS HRD parameters' };

    const br = new BitReader(payload);

    const seq_parameter_set_id = br.readUE();
    // The rest of buffering_period relies on CpbCnt which is inside the SPS VUI HRD params.
    // We need more detailed SPS info to fully parse the loop.
    // For now, we just return the SPS ID.

    return {
        seq_parameter_set_id,
        info: 'Buffering Period (Partial Parse)',
    };
}

function parsePicTiming(payload, sps) {
    const hrd = getHrdParams(sps);
    if (!hrd) return { error: 'Missing SPS HRD parameters' };

    const br = new BitReader(payload);

    const cpbLength = (hrd.cpb_removal_delay_length_minus1 || 23) + 1;
    const dpbLength = (hrd.dpb_output_delay_length_minus1 || 23) + 1;

    const cpb_removal_delay = br.readBits(cpbLength);
    const dpb_output_delay = br.readBits(dpbLength);

    return {
        cpb_removal_delay,
        dpb_output_delay,
    };
}

function parseUserDataT35(payload) {
    if (payload.length < 2) return { error: 'Payload too short' };
    const countryCode = payload[0];
    let dataOffset = 1;

    if (countryCode === 0xff) {
        dataOffset = 2;
    }

    const isUSA = countryCode === 0xb5;

    if (isUSA && payload.length >= 4) {
        const providerCode =
            (payload[dataOffset] << 8) | payload[dataOffset + 1];
        dataOffset += 2;

        if (providerCode === 0x0031 || providerCode === 0x002f) {
            const userStructure = payload.subarray(dataOffset);
            const ceaData = parseCaptionPayload(userStructure);
            return {
                countryCode: 'USA (0xB5)',
                providerCode: `0x${providerCode.toString(16)}`,
                ceaData,
            };
        }
    }

    return {
        countryCode: `0x${countryCode.toString(16)}`,
        rawLength: payload.length,
    };
}

function parseMasteringDisplay(payload) {
    const view = new DataView(
        payload.buffer,
        payload.byteOffset,
        payload.byteLength
    );
    const norm = 50000;
    return {
        primaries: [
            { x: view.getUint16(0) / norm, y: view.getUint16(2) / norm },
            { x: view.getUint16(4) / norm, y: view.getUint16(6) / norm },
            { x: view.getUint16(8) / norm, y: view.getUint16(10) / norm },
        ],
        whitePoint: {
            x: view.getUint16(12) / norm,
            y: view.getUint16(14) / norm,
        },
        maxLuminance: view.getUint32(16) / 10000,
        minLuminance: view.getUint32(20) / 10000,
    };
}

function parseContentLightLevel(payload) {
    const view = new DataView(
        payload.buffer,
        payload.byteOffset,
        payload.byteLength
    );
    return {
        maxCLL: view.getUint16(0),
        maxFALL: view.getUint16(2),
    };
}

/**
 * Parses a raw SEI NAL unit payload (RBSP).
 * @param {Uint8Array} rbsp
 * @param {object} [sps] Optional SPS context
 * @returns {SeiMessage[]}
 */
export function parseSei(rbsp, sps = null) {
    const messages = [];
    let offset = 0;

    while (offset < rbsp.length) {
        let payloadType = 0;
        while (offset < rbsp.length && rbsp[offset] === 0xff) {
            payloadType += 0xff;
            offset++;
        }
        if (offset >= rbsp.length) break;
        payloadType += rbsp[offset++];

        let payloadSize = 0;
        while (offset < rbsp.length && rbsp[offset] === 0xff) {
            payloadSize += 0xff;
            offset++;
        }
        if (offset >= rbsp.length) break;
        payloadSize += rbsp[offset++];

        if (offset + payloadSize > rbsp.length) {
            console.warn(`SEI message truncated.`);
            break;
        }

        const payload = rbsp.slice(offset, offset + payloadSize);
        offset += payloadSize;

        const message = {
            payloadType,
            typeName: SEI_TYPES[payloadType] || `Unknown (${payloadType})`,
            payloadSize,
            data: null,
            raw: payload,
        };

        try {
            if (payloadType === 0 && sps) {
                message.data = parseBufferingPeriod(payload, sps);
            } else if (payloadType === 1 && sps) {
                message.data = parsePicTiming(payload, sps);
            } else if (payloadType === 4) {
                message.data = parseUserDataT35(payload);
            } else if (payloadType === 137) {
                message.data = parseMasteringDisplay(payload);
            } else if (payloadType === 144) {
                message.data = parseContentLightLevel(payload);
            } else if (payloadType === 5) {
                if (payload.length >= 16) {
                    const uuidBytes = payload.subarray(0, 16);
                    const uuid = Array.from(uuidBytes)
                        .map((b) => b.toString(16).padStart(2, '0'))
                        .join('');
                    const content = payload.subarray(16);
                    let payloadText = null;
                    let payloadHex = null;

                    if (isPrintableText(content)) {
                        payloadText = new TextDecoder().decode(content);
                    } else {
                        payloadHex =
                            Array.from(content.subarray(0, 32))
                                .map((b) => b.toString(16).padStart(2, '0'))
                                .join(' ') + (content.length > 32 ? '...' : '');
                    }

                    message.data = {
                        uuid,
                        info: 'User Unregistered Data',
                        payloadText,
                        payloadHex,
                        payloadSize: content.length,
                    };
                }
            }
        } catch (e) {
            message.error = e.message;
        }

        messages.push(message);

        if (offset < rbsp.length && rbsp[offset] === 0x80) {
            break;
        }
    }

    return messages;
}
