import { BoxParser } from '../utils.js';

/**
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseStsz(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    const sampleSize = p.readUint32('sample_size');
    const sampleCount = p.readUint32('sample_count');
    box.entries = [];

    if (sampleSize === 0 && sampleCount !== null && sampleCount > 0) {
        for (let i = 0; i < sampleCount; i++) {
            if (p.stopped) break;
            const sizeField = `entry_${i}_size`;
            const entry_size = p.readUint32(sizeField);
            if (entry_size === null) break;
            box.details[sizeField].internal = true;
            box.entries.push({ entry_size });
        }
    }
    p.finalize();
}

export const stszTooltip = {
    stsz: {
        name: 'Sample Size Box',
        text: 'Sample Size Box (`stsz`). Specifies the size of each sample in bytes. This allows media data to be stored contiguously without framing delimiters. A more compact version, `stz2`, exists for samples with small, varying sizes.',
        ref: 'ISO/IEC 14496-12, 8.7.3',
    },
    'stsz@version': {
        text: 'Version of this box, which must be 0.',
        ref: 'ISO/IEC 14496-12, 8.7.3.2.2',
    },
    'stsz@sample_size': {
        text: 'The default sample size in bytes. If all samples in the track are the same size, this field contains that size and the entry table is empty. If set to 0, each sample has a different size, which is specified in the entry table.',
        ref: 'ISO/IEC 14496-12, 8.7.3.2.2',
    },
    'stsz@sample_count': {
        text: 'The total number of samples in the track.',
        ref: 'ISO/IEC 14496-12, 8.7.3.2.2',
    },
    'stsz@size': {
        text: 'The size of an individual sample in bytes. This field only appears in the entry table if `sample_size` is 0.',
        ref: 'ISO/IEC 14496-12, 8.7.3.2.2',
    },
};