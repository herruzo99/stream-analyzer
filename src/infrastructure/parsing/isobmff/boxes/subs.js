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
    box.entries = [];

    if (entryCount !== null) {
        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;

            const sample_delta = p.readUint32('sample_delta');
            const subsample_count = p.readUint16('subsample_count');

            const entry = {
                sample_delta,
                subsamples: [],
            };

            if (subsample_count !== null) {
                for (let j = 0; j < subsample_count; j++) {
                    if (p.stopped) break;
                    let subsample_size;
                    if (version === 1) {
                        subsample_size = p.readUint32('subsample_size');
                    } else {
                        subsample_size = p.readUint16('subsample_size');
                    }
                    const subsample_priority =
                        p.readUint8('subsample_priority');
                    const discardable = p.readUint8('discardable');

                    entry.subsamples.push({
                        subsample_size,
                        subsample_priority,
                        discardable,
                    });
                }
            }
            box.entries.push(entry);
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
