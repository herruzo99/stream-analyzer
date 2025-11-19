import { BoxParser } from '../utils.js';

const SENC_FLAGS_SCHEMA = {
    0x000002: 'use_subsample_encryption',
};

/**
 * Parses the 'senc' (Sample Encryption) box.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseSenc(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags(SENC_FLAGS_SCHEMA);
    const flags = box.details.flags.value;

    if (flags === null) {
        p.finalize();
        return;
    }

    const sampleCount = p.readUint32('sample_count');
    box.samples = []; // Initialize for detailed sample data

    if (sampleCount !== null && sampleCount > 0) {
        // --- ARCHITECTURAL FIX: More robust IV size heuristic ---
        let perSampleIvSize = 8; // Default for 'cenc'
        if (flags.use_subsample_encryption) {
            // Heuristic: 'cbcs' is a common scheme using subsamples, and it implies
            // the IV is not present in the 'senc' box per-sample.
            // A full entry with subsamples and no IV is at least 2 bytes (subsample_count).
            // A full entry with an 8-byte IV is at least 10 bytes.
            const remainingBytes = box.size - p.offset;
            const avgEntrySize = remainingBytes / sampleCount;
            if (avgEntrySize < 10) {
                perSampleIvSize = 0; // Likely 'cbcs', which has no per-sample IV in this box.
            }
        }
        // --- END FIX ---

        for (let i = 0; i < sampleCount; i++) {
            if (p.stopped) break;

            const sampleEntry = {
                encryption: {
                    iv: null,
                    subsamples: [],
                },
            };

            const ivField = `sample_${i}_iv`;

            if (perSampleIvSize > 0) {
                if (p.checkBounds(perSampleIvSize)) {
                    const ivBytes = new Uint8Array(
                        p.view.buffer,
                        p.view.byteOffset + p.offset,
                        perSampleIvSize
                    );
                    sampleEntry.encryption.iv = ivBytes;
                    p.box.details[ivField] = {
                        value: `[${perSampleIvSize} bytes]`,
                        offset: p.box.offset + p.offset,
                        length: perSampleIvSize,
                        internal: true,
                    };
                    p.offset += perSampleIvSize;
                } else {
                    break;
                }
            }

            if (flags.use_subsample_encryption) {
                const subSampleCountField = `sample_${i}_subsample_count`;
                const subSampleCount = p.readUint16(subSampleCountField);

                if (subSampleCount !== null) {
                    p.box.details[subSampleCountField].internal = true;

                    for (let j = 0; j < subSampleCount; j++) {
                        const clearBytesField = `sample_${i}_subsample_${j}_BytesOfClearData`;
                        const protectedBytesField = `sample_${i}_subsample_${j}_BytesOfProtectedData`;

                        const BytesOfClearData = p.readUint16(clearBytesField);
                        const BytesOfProtectedData =
                            p.readUint32(protectedBytesField);

                        if (
                            BytesOfClearData === null ||
                            BytesOfProtectedData === null
                        ) {
                            p.stopped = true;
                            break;
                        }

                        p.box.details[clearBytesField].internal = true;
                        p.box.details[protectedBytesField].internal = true;

                        sampleEntry.encryption.subsamples.push({
                            BytesOfClearData,
                            BytesOfProtectedData,
                        });
                    }
                }
            }
            box.samples.push(sampleEntry);
        }

        // --- ARCHITECTURAL FIX: Add validation check ---
        if (box.samples.length !== sampleCount) {
            p.addIssue(
                'warn',
                `Parsed ${box.samples.length} samples, but expected ${sampleCount}. The box may be truncated or the IV size heuristic (${perSampleIvSize} bytes) may be incorrect for this encryption scheme.`
            );
        }
        // --- END FIX ---
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
