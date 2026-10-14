// MOQT variable-length integers (draft-ietf-moq-transport, Section 8.1).
// Encoding: (size-1) leading 1-bits in the first byte give the total length
// in bytes (1-9); the remaining 8*size - size bits are the value in network
// byte order. Pure and heux-contract tested against the draft's example table.

const MAX_UINT64 = 18446744073709551615n;

/**
 * Number of bytes needed to encode a value (minimal form).
 * @param {number|bigint} value
 * @returns {number} 1..9
 */
export function varintSize(value) {
    const v = BigInt(value);
    if (v < 0n || v > MAX_UINT64) throw new RangeError('varint out of 64-bit range');
    if (v < 2 ** 7) return 1;
    if (v < 2 ** 14) return 2;
    if (v < 2 ** 21) return 3;
    if (v < 2 ** 28) return 4;
    if (v < 2 ** 35) return 5;
    if (v < 2 ** 42) return 6;
    if (v < 2 ** 49) return 7;
    if (v < 2 ** 56) return 8;
    return 9;
}

/**
 * Write a varint at the given offset using the minimal-length form.
 * @param {DataView} view
 * @param {number} offset byte offset into the view
 * @param {number|bigint} value
 * @returns {number} bytes written
 */
export function writeVarint(view, offset, value) {
    const v = BigInt(value);
    if (v < 0n || v > MAX_UINT64) throw new RangeError('varint out of 64-bit range');
    const size = varintSize(v);
    if (size === 1) {
        view.setUint8(offset, Number(v));
        return 1;
    }
    // (size-1) leading one-bits at the TOP of the first byte, then value bits.
    // size=2 → 0b10xxxxxx (1 prefix bit + 6 value bits); size=9 → 0xFF + 8 bytes.
    let first = 0;
    if (size === 9) first = 0xff;
    else first = ((1 << (size - 1)) - 1) << (9 - size);
    const firstBits = Math.max(0, 8 - size);
    if (firstBits > 0) {
        first |= Number((v >> BigInt(8 * (size - 1))) & BigInt((1 << firstBits) - 1));
    }
    view.setUint8(offset, first);
    let shift = BigInt(8 * (size - 1)) - 8n;
    for (let i = 1; i < size; i++) {
        view.setUint8(offset + i, Number((v >> shift) & 0xffn));
        shift -= 8n;
    }
    return size;
}

/**
 * Read a varint (any valid encoding length; non-minimal encodings decode too).
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @returns {{value: bigint, bytesRead: number}}
 */
export function readVarint(bytes, offset) {
    const first = bytes[offset];
    if (first === undefined) throw new RangeError('varint truncated');
    let size = 1;
    if (first !== 0) {
        let mask = 0x80;
        while ((first & mask) !== 0 && size < 9) {
            size++;
            mask >>= 1;
        }
    }
    if (offset + size > bytes.length) throw new RangeError('varint truncated');
    if (size === 1) return { value: BigInt(first), bytesRead: 1 };
    const firstBits = Math.max(0, 8 - size);
    let value = BigInt(first & ((1 << firstBits) - 1));
    for (let i = 1; i < size; i++) {
        value = (value << 8n) | BigInt(bytes[offset + i]);
    }
    return { value, bytesRead: size };
}

/** Encode a varint to a fresh Uint8Array. */
export function encodeVarint(value) {
    const size = varintSize(value);
    const out = new Uint8Array(size);
    const view = new DataView(out.buffer);
    writeVarint(view, 0, value);
    return out;
}
