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
        text: 'Sample Encryption Box (`senc`). Contains sample-specific encryption information, such as Initialization Vectors (IVs) and subsample encryption patterns. This box is central to the Common Encryption (CENC) scheme.',
        ref: 'ISO/IEC 23001-7, 7.1',
    },
    'senc@flags': {
        text: 'A bitfield where bit 1 (0x02) indicates that subsample encryption information is present for each sample.',
        ref: 'ISO/IEC 23001-7, 7.1',
    },
    'senc@sample_count': {
        text: 'The number of samples for which encryption information is provided in this box.',
        ref: 'ISO/IEC 23001-7, 7.1',
    },
    'senc@sample_1_iv': {
        text: "The Initialization Vector for the first sample. Its size is defined in the 'tenc' box (typically 8 or 16 bytes). The IV is required for the decryption process.",
        ref: 'ISO/IEC 23001-7, 7.2',
    },
    'senc@sample_1_subsample_count': {
        text: 'The number of subsamples (contiguous clear and encrypted regions) within the first sample. This is used for pattern encryption where only parts of the sample are encrypted.',
        ref: 'ISO/IEC 23001-7, 7.1',
    },
    'senc@sample_1_subsample_1_clear_bytes': {
        text: 'The number of unencrypted bytes in the first subsample of the first sample.',
        ref: 'ISO/IEC 23001-7, 7.1',
    },
    'senc@sample_1_subsample_1_encrypted_bytes': {
        text: 'The number of encrypted bytes in the first subsample of the first sample.',
        ref: 'ISO/IEC 23001-7, 7.1',
    },
};