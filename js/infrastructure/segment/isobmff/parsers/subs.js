import { BoxParser } from '../utils.js';

/**
 * Parses the 'subs' (Sub-Sample Information) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSubs(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    const entryCount = p.readUint32('entry_count');

    if (entryCount !== null && entryCount > 0) {
        p.readUint32('entry_1_sample_delta');
        const subsampleCount = p.readUint16('entry_1_subsample_count');

        if (subsampleCount !== null && subsampleCount > 0) {
            if (version === 1) {
                p.readUint32('subsample_1_size');
            } else {
                p.readUint16('subsample_1_size');
            }
        }
    }
    p.finalize();
}

export const subsTooltip = {
    subs: {
        name: 'Sub-Sample Information',
        text: 'Defines the size of sub-samples, often used in CENC to separate clear vs. encrypted parts of a sample.',
        ref: 'ISO/IEC 14496-12, 8.7.7',
    },
    'subs@entry_count': {
        text: 'The number of samples that have sub-sample information.',
        ref: 'ISO/IEC 14496-12, 8.7.7.3',
    },
    'subs@entry_1_subsample_count': {
        text: 'The number of sub-samples in the first sample.',
        ref: 'ISO/IEC 14496-12, 8.7.7.3',
    },
    'subs@subsample_1_size': {
        text: 'The size in bytes of the first sub-sample.',
        ref: 'ISO/IEC 14496-12, 8.7.7.3',
    },
};
