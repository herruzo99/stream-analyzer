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
 * @param {number} flags The flag byte (Marker + Valid + Type).
 * @param {number} d1 The first data byte.
 * @param {number} d2 The second data byte.
 */
function decodeCcPair(flags, d1, d2) {
    const ccValid = (flags & 0x04) !== 0;
    const ccType = flags & 0x03; // 0=608(f1), 1=608(f2), 2=DTVCC, 3=DTVCC

    // Format raw bytes for display
    const raw = [flags, d1, d2];

    if (!ccValid) return { type: 'N/A', data: 'Invalid', raw };

    // Strip parity bit (bit 7) from data bytes for 608
    const data1 = d1 & 0x7f;
    const data2 = d2 & 0x7f;

    let desc = '';

    if (ccType === 0 || ccType === 1) {
        // CEA-608 (NTSC Field 1 or 2)
        const typeLabel = `CEA-608 (F${ccType + 1})`;

        // Check for Control Codes (Mid-Row, Misc Control, PAC)
        // Basic logic: if data1 is control code range
        const isControl =
            (data1 >= 0x10 && data1 <= 0x1f) || (data1 >= 0x10 && data1 <= 0x17);

        if (!isControl) {
            // Text characters
            if (data1 >= 0x20 && data1 <= 0x7f)
                desc += String.fromCharCode(data1);
            if (data2 >= 0x20 && data2 <= 0x7f)
                desc += String.fromCharCode(data2);
        } else {
            // Command visualization
            desc = `[CMD: ${data1.toString(16).padStart(2, '0')} ${data2.toString(16).padStart(2, '0')}]`;
        }

        return { type: typeLabel, data: desc, raw };
    } else {
        // CEA-708 (DTVCC)
        return { type: 'CEA-708', data: `Service Block`, raw };
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

    // Parse cc_data() header
    const process_em_data_flag = reader.read(1);
    const process_cc_data_flag = reader.read(1);
    const additional_data_flag = reader.read(1);
    const cc_count = reader.read(5);
    const em_data = reader.read(8); // reserved/em_data

    // If em_data flag was 0, we effectively "unread" the last 8 bits?
    // ATSC A/53: "if (process_em_data_flag) { em_data } else { reserved }"
    // Actually, the spec structure has `em_data` byte present regardless, but its meaning depends on flag.
    // wait, A/53 Part 4 Table 6.2 says:
    //   if (process_em_data_flag) { em_data 8 }
    //   else { reserved 8 }
    // So the byte IS present physically in both cases.
    // The issue was the loop body consuming 2 bytes instead of 3.

    const captions = [];

    if (process_cc_data_flag) {
        for (let i = 0; i < cc_count; i++) {
            // A/53: Each entry is 24 bits (3 bytes)
            // marker_bits (5) + cc_valid (1) + cc_type (2) = 1 byte (FLAGS)
            // cc_data_1 (8)
            // cc_data_2 (8)

            const flags = reader.read(8);
            const d1 = reader.read(8);
            const d2 = reader.read(8);

            const ccInfo = decodeCcPair(flags, d1, d2);
            if (ccInfo) captions.push(ccInfo);
        }
    }

    // Skip trailing marker bits usually 0xFF
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
    return {
        type: 'Generic ITU-T T.35',
        size: payload.length,
        raw: payload.subarray(0, 10),
    };
}