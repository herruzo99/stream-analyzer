/**
 * A bit reader helper for CEA parsing.
 */
class BitReader {
    constructor(data) {
        this.data = data;
        this.byteIndex = 0;
        this.bitIndex = 0;
    }

    read(bits) {
        let result = 0;
        for (let i = 0; i < bits; i++) {
            if (this.byteIndex >= this.data.length) return 0;
            const bit = (this.data[this.byteIndex] >> (7 - this.bitIndex)) & 1;
            result = (result << 1) | bit;
            this.bitIndex++;
            if (this.bitIndex === 8) {
                this.bitIndex = 0;
                this.byteIndex++;
            }
        }
        return result;
    }

    skip(bits) {
        const totalBits = this.byteIndex * 8 + this.bitIndex + bits;
        this.byteIndex = Math.floor(totalBits / 8);
        this.bitIndex = totalBits % 8;
    }

    hasMore() {
        return this.byteIndex < this.data.length;
    }
}

/**
 * Decodes basic CC data pairs to readable text where possible (ASCII subsets).
 * @param {number} b1
 * @param {number} b2
 */
function decodeCcPair(b1, b2) {
    const ccValid = (b1 & 0x04) !== 0;
    const ccType = b1 & 0x03; // 0=608(f1), 1=608(f2), 2=DTVCC, 3=DTVCC

    if (!ccValid) return { type: 'N/A', data: 'Invalid', raw: [b1, b2] };

    const d1 = b1 & 0x7f;
    const d2 = b2 & 0x7f;

    let desc = '';

    if (ccType === 0 || ccType === 1) {
        // CEA-608
        if (d1 >= 0x20 && d1 <= 0x7f) {
            desc = String.fromCharCode(d1);
            if (d2 >= 0x20 && d2 <= 0x7f) desc += String.fromCharCode(d2);
        } else {
            desc = `[CMD: ${d1.toString(16)} ${d2.toString(16)}]`;
        }
        return { type: `CEA-608 (F${ccType + 1})`, data: desc, raw: [b1, b2] };
    } else {
        // CEA-708 (DTVCC)
        return { type: 'CEA-708', data: `Service Block`, raw: [b1, b2] };
    }
}

/**
 * Parses the ATSC1_data() structure found in SEI payloads with ITU-T T.35 + GA94 codes.
 * @param {Uint8Array} buffer
 */
export function parseAtscUserBytes(buffer) {
    // Check "GA94" signature (0x47 0x41 0x39 0x34)
    if (buffer.length < 4) return null;
    if (
        buffer[0] !== 0x47 ||
        buffer[1] !== 0x41 ||
        buffer[2] !== 0x39 ||
        buffer[3] !== 0x34
    ) {
        return null; // Not ATSC user data
    }

    const reader = new BitReader(buffer.subarray(4)); // Skip GA94 signature

    const user_data_type_code = reader.read(8);
    if (user_data_type_code !== 0x03) {
        return { type: 'Unknown ATSC', code: user_data_type_code }; // 0x03 = MPEG_cc_data
    }

    // Parse cc_data()
    const process_em_data_flag = reader.read(1);
    const process_cc_data_flag = reader.read(1);
    const additional_data_flag = reader.read(1);
    const cc_count = reader.read(5);
    const em_data = reader.read(8); // reserved/em_data

    const captions = [];

    for (let i = 0; i < cc_count; i++) {
        const b1 = reader.read(8); // marker + valid + type + data1
        const b2 = reader.read(8); // data2

        const ccInfo = decodeCcPair(b1, b2);
        if (ccInfo) captions.push(ccInfo);
    }

    // Skip marker bits usually 0xFF
    if (reader.hasMore()) {
        reader.read(8);
    }

    return {
        type: 'ATSC A/53 (GA94)',
        ccCount: cc_count,
        captions,
        flags: {
            process_cc: !!process_cc_data_flag,
            process_em: !!process_em_data_flag,
            additional_data: !!additional_data_flag,
            em_data_value: em_data,
        },
    };
}

/**
 * Parses the SCTE 128 structure (often embedded without GA94 in some streams, or inside other containers).
 * This is a simplified detector.
 */
export function parseCaptionPayload(payload) {
    // 1. Try ATSC GA94 first (Most common for H.264/HEVC broadcast)
    const atsc = parseAtscUserBytes(payload);
    if (atsc) return atsc;

    // 2. Raw byte heuristics if generic ITU T.35
    // Sometimes just raw CC pairs exist if country code was US but provider unspecific
    return {
        type: 'Generic ITU-T T.35',
        size: payload.length,
        raw: payload.subarray(0, 10),
    };
}
