import { BoxParser } from '../utils.js';

const SENC_FLAGS_SCHEMA = {
    0x000002: 'use_subsample_encryption',
};

/**
 * Parses the 'senc' (Sample Encryption) box.
 * @param {import('../parser.js').Box} box
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

    if (sampleCount !== null) {
        const assumedIvSize = 8;

        for (let i = 0; i < sampleCount; i++) {
            if (p.stopped) break;

            const sampleEntry = {
                iv: null,
                subsamples: [],
            };

            if (p.checkBounds(assumedIvSize)) {
                const ivBytes = new Uint8Array(
                    p.view.buffer,
                    p.view.byteOffset + p.offset,
                    assumedIvSize
                );
                sampleEntry.iv = ivBytes;
                p.box.details[`sample_${i}_iv`] = {
                    value: 'IV Data',
                    offset: p.box.offset + p.offset,
                    length: assumedIvSize,
                };
                p.offset += assumedIvSize;
            } else {
                break;
            }

            if (flags.use_subsample_encryption) {
                const subSampleCount = p.readUint16(
                    `sample_${i}_subsample_count`
                );
                if (subSampleCount !== null) {
                    sampleEntry.subsample_count = subSampleCount;
                    for (let j = 0; j < subSampleCount; j++) {
                        const clearBytes = p.readUint16(
                            `sample_${i}_subsample_${j}_clear`
                        );
                        const protectedBytes = p.readUint32(
                            `sample_${i}_subsample_${j}_protected`
                        );

                        if (clearBytes === null || protectedBytes === null) {
                            p.stopped = true;
                            break;
                        }

                        sampleEntry.subsamples.push({
                            BytesOfClearData: clearBytes,
                            BytesOfProtectedData: protectedBytes,
                        });
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
