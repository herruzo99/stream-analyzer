/**
 * A utility class to simplify the parsing of ISOBMFF boxes.
 * It abstracts away manual offset tracking and provides a declarative API
 * for reading fields, automatically populating the box's `details` object.
 */
export class BoxParser {
    /**
     * @param {import('./parser.js').Box} box The box object to be populated.
     * @param {DataView} view The DataView for the box's content, starting from the beginning of the box.
     */
    constructor(box, view) {
        this.box = box;
        this.view = view;
        // The view is already scoped to the box, so the parser starts after the header.
        this.offset = box.headerSize;
        this.stopped = false;
    }

    /**
     * Adds an issue to the current box's issue list.
     * @param {'error' | 'warn'} type
     * @param {string} message
     */
    addIssue(type, message) {
        if (!this.box.issues) {
            this.box.issues = [];
        }
        this.box.issues.push({ type, message });
    }

    /**
     * @param {number} length The number of bytes required for the next operation.
     * @returns {boolean}
     */
    checkBounds(length) {
        if (this.stopped) return false;
        if (this.offset + length > this.view.byteLength) {
            this.addIssue(
                'error',
                `Read attempt for ${length} bytes at offset ${this.offset} would exceed box '${this.box.type}' size of ${this.view.byteLength}. The box is truncated.`
            );
            this.stopped = true;
            return false;
        }
        return true;
    }

    /**
     * Reads a 32-bit unsigned integer.
     * @param {string} fieldName The name of the field to store in `box.details`.
     * @returns {number | null} The parsed value.
     */
    readUint32(fieldName) {
        if (!this.checkBounds(4)) return null;
        const value = this.view.getUint32(this.offset);
        this.box.details[fieldName] = {
            value,
            offset: this.box.offset + this.offset,
            length: 4,
        };
        this.offset += 4;
        return value;
    }

    /**
     * Reads a 64-bit unsigned integer.
     * @param {string} fieldName The name of the field to store in `box.details`.
     * @returns {bigint | null} The parsed value.
     */
    readBigUint64(fieldName) {
        if (!this.checkBounds(8)) return null;
        const value = this.view.getBigUint64(this.offset);
        this.box.details[fieldName] = {
            value: Number(value),
            offset: this.box.offset + this.offset,
            length: 8,
        };
        this.offset += 8;
        return value;
    }

    /**
     * Reads a 64-bit signed integer.
     * @param {string} fieldName The name of the field to store in `box.details`.
     * @returns {bigint | null} The parsed value.
     */
    readBigInt64(fieldName) {
        if (!this.checkBounds(8)) return null;
        const value = this.view.getBigInt64(this.offset);
        this.box.details[fieldName] = {
            value: Number(value),
            offset: this.box.offset + this.offset,
            length: 8,
        };
        this.offset += 8;
        return value;
    }

    /**
     * Reads an 8-bit unsigned integer.
     * @param {string} fieldName The name of the field to store in `box.details`.
     * @returns {number | null} The parsed value.
     */
    readUint8(fieldName) {
        if (!this.checkBounds(1)) return null;
        const value = this.view.getUint8(this.offset);
        this.box.details[fieldName] = {
            value,
            offset: this.box.offset + this.offset,
            length: 1,
        };
        this.offset += 1;
        return value;
    }

    /**
     * Reads a 16-bit unsigned integer.
     * @param {string} fieldName The name of the field to store in `box.details`.
     * @returns {number | null} The parsed value.
     */
    readUint16(fieldName) {
        if (!this.checkBounds(2)) return null;
        const value = this.view.getUint16(this.offset);
        this.box.details[fieldName] = {
            value,
            offset: this.box.offset + this.offset,
            length: 2,
        };
        this.offset += 2;
        return value;
    }

    /**
     * Reads a 16-bit signed integer.
     * @param {string} fieldName The name of the field to store in `box.details`.
     * @returns {number | null} The parsed value.
     */
    readInt16(fieldName) {
        if (!this.checkBounds(2)) return null;
        const value = this.view.getInt16(this.offset);
        this.box.details[fieldName] = {
            value,
            offset: this.box.offset + this.offset,
            length: 2,
        };
        this.offset += 2;
        return value;
    }

    /**
     * Reads a 32-bit integer.
     * @param {string} fieldName The name of the field to store in `box.details`.
     * @returns {number | null} The parsed value.
     */
    readInt32(fieldName) {
        if (!this.checkBounds(4)) return null;
        const value = this.view.getInt32(this.offset);
        this.box.details[fieldName] = {
            value,
            offset: this.box.offset + this.offset,
            length: 4,
        };
        this.offset += 4;
        return value;
    }

    /**
     * Reads a string of a given length.
     * @param {number} length The number of bytes to read.
     * @param {string} fieldName The name of the field.
     * @returns {string | null}
     */
    readString(length, fieldName) {
        if (!this.checkBounds(length)) return null;
        const bytes = new Uint8Array(
            this.view.buffer,
            this.view.byteOffset + this.offset,
            length
        );
        const value = String.fromCharCode(...bytes);
        this.box.details[fieldName] = {
            value,
            offset: this.box.offset + this.offset,
            length,
        };
        this.offset += length;
        return value;
    }

    /**
     * Reads a null-terminated string (C-style string).
     * @param {string} fieldName The name of the field.
     * @returns {string | null}
     */
    readNullTerminatedString(fieldName) {
        if (this.stopped) return null;
        const startOffset = this.offset;
        let endOffset = startOffset;
        while (
            endOffset < this.view.byteLength &&
            this.view.getUint8(endOffset) !== 0
        ) {
            endOffset++;
        }
        const stringBytes = new Uint8Array(
            this.view.buffer,
            this.view.byteOffset + startOffset,
            endOffset - startOffset
        );
        const value = new TextDecoder('utf-8').decode(stringBytes);
        const totalLength = endOffset - startOffset + 1; // Include null terminator

        this.box.details[fieldName] = {
            value,
            offset: this.box.offset + startOffset,
            length: totalLength,
        };
        this.offset += totalLength;
        return value;
    }

    /**
     * Reads version (1 byte) and flags (3 bytes) from a full box header.
     * @returns {{version: number | null, flags: number | null}}
     */
    readVersionAndFlags() {
        if (!this.checkBounds(4)) return { version: null, flags: null };
        const versionAndFlags = this.view.getUint32(this.offset);
        const version = versionAndFlags >> 24;
        const flags = versionAndFlags & 0x00ffffff;

        this.box.details['version'] = {
            value: version,
            offset: this.box.offset + this.offset,
            length: 1,
        };
        this.box.details['flags'] = {
            value: `0x${flags.toString(16).padStart(6, '0')}`,
            offset: this.box.offset + this.offset,
            length: 4, // Visually it's one field
        };
        this.offset += 4;

        return { version, flags };
    }

    /**
     * Reads the remaining bytes of the box into a field.
     * @param {string} fieldName
     */
    readRemainingBytes(fieldName) {
        if (this.stopped) return;
        const remainingBytes = this.view.byteLength - this.offset;
        if (remainingBytes > 0) {
            this.box.details[fieldName] = {
                value: `... ${remainingBytes} bytes of data ...`,
                offset: this.box.offset + this.offset,
                length: remainingBytes,
            };
            this.offset += remainingBytes;
        }
    }

    /**
     * Skips a specified number of bytes.
     * @param {number} byteCount The number of bytes to skip.
     * @param {string} fieldName The name for the reserved/skipped field.
     */
    skip(byteCount, fieldName = 'reserved') {
        if (!this.checkBounds(byteCount)) return;
        this.box.details[fieldName] = {
            value: `${byteCount} bytes`,
            offset: this.box.offset + this.offset,
            length: byteCount,
        };
        this.offset += byteCount;
    }

    /**
     * Checks for any unparsed bytes at the end of the box and logs an issue if found.
     */
    finalize() {
        if (this.stopped) return;
        const remainingBytes = this.view.byteLength - this.offset;
        if (remainingBytes > 0) {
            this.addIssue(
                'warn',
                `${remainingBytes} extra unparsed bytes found at the end of box '${this.box.type}'.`
            );
        }
    }
}
