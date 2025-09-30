import { BoxParser } from '../utils.js';

/**
 * Parses the 'stz2' (Compact Sample Size) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseStz2(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    p.skip(3, 'reserved');

    const fieldSize = p.readUint8('field_size');
    const sampleCount = p.readUint32('sample_count');

    if (sampleCount !== null && sampleCount > 0) {
        let entryValue;
        if (fieldSize === 4) {
            const byte = p.readUint8('entry_size_1_byte');
            if (byte !== null) {
                entryValue = `(nibbles) ${(byte >> 4) & 0x0f}, ${byte & 0x0f}`;
            }
        } else if (fieldSize === 8) {
            entryValue = p.readUint8('entry_size_1');
        } else if (fieldSize === 16) {
            entryValue = p.readUint16('entry_size_1');
        }
        if (entryValue !== undefined) {
            box.details['entry_size_1'].value = entryValue;
        }
    }
    p.finalize();
}

export const stz2Tooltip = {
    stz2: {
        name: 'Compact Sample Size',
        text: 'A compact version of the Sample Size Box for smaller, varying sample sizes.',
        ref: 'ISO/IEC 14496-12, 8.7.3.3',
    },
    'stz2@field_size': {
        text: 'The size in bits of each entry in the sample size table (4, 8, or 16).',
        ref: 'ISO/IEC 14496-12, 8.7.3.3.2',
    },
    'stz2@sample_count': {
        text: 'The total number of samples in the track.',
        ref: 'ISO/IEC 14496-12, 8.7.3.3.2',
    },
    'stz2@entry_size_1': {
        text: 'The size of the first sample, with the size determined by field_size.',
        ref: 'ISO/IEC 14496-12, 8.7.3.3.2',
    },
};
