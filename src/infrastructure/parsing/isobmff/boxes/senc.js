import { BoxParser } from '../utils.js';

/**
 * Parses the 'senc' (Sample Encryption) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSenc(box, view) {
    const p = new BoxParser(box, view);
    const { flags } = p.readVersionAndFlags();

    if (flags === null) {
        p.finalize();
        return;
    }

    const sampleCount = p.readUint32('sample_count');
    box.samples = []; // Initialize for detailed sample data

    if (sampleCount !== null) {
        // NOTE: The IV size is defined in the associated Track Encryption ('tenc') box.
        // This context-free parser cannot access it. We assume a default IV size of 8 bytes,
        // which is common for CENC ('cbcs', 'cenc'). This is a known limitation.
        // The validation logic, which has more context, will perform the final checks.
        const assumedIvSize = 8;

        for (let i = 0; i < sampleCount; i++) {
            if (p.stopped) break;

            const sampleEntry = {
                iv: null,
                subsamples: [],
            };

            // --- Parse Initialization Vector ---
            if (p.checkBounds(assumedIvSize)) {
                const ivBytes = new Uint8Array(
                    p.view.buffer,
                    p.view.byteOffset + p.offset,
                    assumedIvSize
                );
                sampleEntry.iv = ivBytes;
                p.offset += assumedIvSize;
            } else {
                break; // Not enough data for even an IV
            }

            // --- Parse subsample data if flag is set ---
            if ((flags & 2) !== 0) {
                // use_subsample_encryption
                if (p.checkBounds(2)) {
                    const subSampleCount = p.view.getUint16(p.offset);
                    sampleEntry.subsample_count = subSampleCount;
                    p.offset += 2;

                    for (let j = 0; j < subSampleCount; j++) {
                        if (p.checkBounds(6)) {
                            const clearBytes = p.view.getUint16(p.offset);
                            const protectedBytes = p.view.getUint32(
                                p.offset + 2
                            );
                            sampleEntry.subsamples.push({
                                BytesOfClearData: clearBytes,
                                BytesOfProtectedData: protectedBytes,
                            });
                            p.offset += 6;
                        } else {
                            p.stopped = true;
                            break;
                        }
                    }
                }
            }
            box.samples.push(sampleEntry);
        }
    }

    p.finalize();
}

export const sencTooltip = {
    senc: {
        name: 'Sample Encryption Box',
        text: 'Contains sample-specific encryption information, such as Initialization Vectors (IVs) and sub-sample encryption data for Common Encryption (CENC).',
        ref: 'ISO/IEC 23001-7, 7.1',
    },
    'senc@sample_count': {
        text: 'The number of samples described in this box.',
        ref: 'ISO/IEC 23001-7, 7.1',
    },
    'senc@sample_1_iv': {
        text: "The Initialization Vector for the first sample. Its size is defined in the 'tenc' box (typically 8 or 16 bytes).",
        ref: 'ISO/IEC 23001-7, 7.2',
    },
    'senc@sample_1_subsample_count': {
        text: 'The number of subsamples (clear/encrypted pairs) in the first sample.',
        ref: 'ISO/IEC 23001-7, 7.1',
    },
    'senc@sample_1_subsample_1_clear_bytes': {
        text: 'The number of unencrypted bytes in the first subsample.',
        ref: 'ISO/IEC 23001-7, 7.1',
    },
    'senc@sample_1_subsample_1_encrypted_bytes': {
        text: 'The number of encrypted bytes in the first subsample.',
        ref: 'ISO/IEC 23001-7, 7.1',
    },
};
