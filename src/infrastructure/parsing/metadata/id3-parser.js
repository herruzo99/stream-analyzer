/**
 * Decodes a "Synchsafe" integer (used in ID3v2 size headers).
 * 7-bit bytes: 0xxxxxxx 0xxxxxxx ...
 */
function parseSynchsafeInteger(data) {
    let size = 0;
    for (let i = 0; i < data.length; i++) {
        size = (size << 7) | (data[i] & 0x7f);
    }
    return size;
}

/**
 * Decodes a text field based on the ID3 encoding byte.
 * 0: ISO-8859-1, 1: UTF-16 BOM, 2: UTF-16BE, 3: UTF-8
 */
function decodeText(data, encoding) {
    const decoder = new TextDecoder(
        encoding === 0
            ? 'iso-8859-1'
            : encoding === 1 || encoding === 2
              ? 'utf-16'
              : 'utf-8'
    );
    // Remove null termination if present
    let end = data.length;
    while (end > 0 && data[end - 1] === 0) {
        end--;
    }
    return decoder.decode(data.slice(0, end));
}

/**
 * Parses the raw binary payload of an ID3v2 tag.
 * @param {Uint8Array} buffer
 * @returns {object} The parsed ID3 tag structure.
 */
export function parseId3Tag(buffer) {
    if (buffer.length < 10) return { error: 'Buffer too short for ID3 header' };

    // Header: 'ID3' + ver(1) + rev(1) + flags(1) + size(4)
    const id = String.fromCharCode(buffer[0], buffer[1], buffer[2]);
    if (id !== 'ID3') return { error: 'Missing ID3 identifier' };

    const version = buffer[3];
    const flags = buffer[5];
    const sizeBytes = buffer.subarray(6, 10);
    const tagSize = parseSynchsafeInteger(sizeBytes);

    const frames = [];
    let offset = 10;
    const limit = Math.min(buffer.length, 10 + tagSize);

    // Handle Extended Header if present (Bit 6 of flags)
    if (flags & 0x40) {
        const extSize = parseSynchsafeInteger(
            buffer.subarray(offset, offset + 4)
        );
        offset += 4 + extSize; // Skip extended header
    }

    while (offset < limit) {
        // Frame Header is 10 bytes in v2.3/v2.4
        if (offset + 10 > limit) break;

        const frameId = String.fromCharCode(
            buffer[offset],
            buffer[offset + 1],
            buffer[offset + 2],
            buffer[offset + 3]
        );

        // Padding check (hit null bytes)
        if (frameId.charCodeAt(0) === 0) break;

        // v2.4 uses synchsafe for frame size, v2.3 uses regular integer
        // We heuristically assume syncsafe if version is 4
        const sizeSlice = buffer.subarray(offset + 4, offset + 8);
        let frameSize = 0;
        if (version === 4) {
            frameSize = parseSynchsafeInteger(sizeSlice);
        } else {
            const view = new DataView(
                sizeSlice.buffer,
                sizeSlice.byteOffset,
                4
            );
            frameSize = view.getUint32(0);
        }

        // Flags (bytes 8-10)
        const frameFlagsRaw = buffer.subarray(offset + 8, offset + 10);
        // Fix: Correctly combine bytes into a 16-bit integer
        const frameFlags = (frameFlagsRaw[0] << 8) | frameFlagsRaw[1];

        const frameEnd = offset + 10 + frameSize;

        if (frameEnd > limit) break;

        const content = buffer.subarray(offset + 10, frameEnd);
        const frame = { id: frameId, size: frameSize, flags: frameFlags };

        // Parse specific frame content
        if (frameId.startsWith('T')) {
            // Text Frame
            const encoding = content[0];
            frame.value = decodeText(content.subarray(1), encoding);
        } else if (frameId === 'PRIV') {
            // Private Frame: Owner Identifier (Null Terminated) + Binary
            let nullIndex = -1;
            for (let i = 0; i < content.length; i++) {
                if (content[i] === 0) {
                    nullIndex = i;
                    break;
                }
            }
            if (nullIndex !== -1) {
                frame.owner = new TextDecoder('iso-8859-1').decode(
                    content.subarray(0, nullIndex)
                );
                // The rest is binary data (often SCTE-35 or timestamps)
                const binary = content.subarray(nullIndex + 1);
                frame.data = `[${binary.length} bytes binary]`;
                // Heuristic: Check for Timestamp (8 bytes / 33-bit PTS)
                if (
                    frame.owner.includes(
                        'com.apple.streaming.transportStreamTimestamp'
                    )
                ) {
                    const view = new DataView(
                        binary.buffer,
                        binary.byteOffset,
                        binary.byteLength
                    );
                    if (binary.byteLength === 8) {
                        frame.value = view.getBigUint64(0).toString();
                    }
                }
            } else {
                frame.owner = 'Unknown';
                frame.data = 'Malformed PRIV';
            }
        } else if (frameId === 'WXXX') {
            // User defined URL Link frame
            // Structure: <Header> <Text encoding> <Description> <00 (00)> <URL>
            const encoding = content[0];
            let nullIndex = -1;

            // Search for null terminator starting after encoding byte
            for (let i = 1; i < content.length; i++) {
                if (content[i] === 0) {
                    nullIndex = i;
                    break;
                }
            }

            if (nullIndex !== -1) {
                const description = decodeText(
                    content.subarray(1, nullIndex),
                    encoding
                );
                const urlData = content.subarray(nullIndex + 1);
                const url = new TextDecoder('iso-8859-1').decode(urlData); // URLs are usually ISO-8859-1

                frame.description = description;
                frame.value = url;
            } else {
                frame.value = '[Malformed WXXX]';
            }
        } else {
            // Generic binary
            frame.value = `${frameSize} bytes`;
        }

        frames.push(frame);
        offset = frameEnd;
    }

    return {
        version: `2.${version}.0`,
        flags,
        size: tagSize,
        frames,
    };
}
