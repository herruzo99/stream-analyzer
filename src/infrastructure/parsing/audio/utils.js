/**
 * Scans a buffer for AAC ADTS frames.
 * @param {Uint8Array} data
 * @returns {Uint8Array | null} A buffer containing only the ADTS frames (concatenated).
 */
export function scanForAdts(data) {
    const frames = [];
    let totalSize = 0;
    const len = data.length;

    for (let i = 0; i < len - 7; i++) {
        // Sync word: 0xFFF (12 bits) -> Byte 0 is FF, Byte 1 top 4 bits are F
        if (data[i] === 0xff && (data[i + 1] & 0xf0) === 0xf0) {
            // Parse header for length
            // Protection absent? (Byte 1 bit 0)

            // Frame Length: 13 bits starting at Byte 3 bit 1 (0-indexed)
            // Byte 3: bits 1-0 are top 2 bits of length
            // Byte 4: all 8 bits are mid bits
            // Byte 5: top 3 bits are low bits

            const s1 = data[i + 3] & 0x03;
            const s2 = data[i + 4];
            const s3 = data[i + 5] >> 5;
            const frameLen = (s1 << 11) | (s2 << 3) | s3;

            if (frameLen > 7 && i + frameLen <= len) {
                frames.push(data.subarray(i, i + frameLen));
                totalSize += frameLen;
                // Move index to end of frame (loop increments i, so -1)
                i += frameLen - 1;
            }
        }
    }

    if (totalSize === 0) return null;

    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const f of frames) {
        result.set(f, offset);
        offset += f.length;
    }
    return result;
}
