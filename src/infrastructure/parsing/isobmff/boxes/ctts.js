import { BoxParser } from '../utils.js';

/**
 * Parses the 'ctts' (Composition Time to Sample) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseCtts(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    const entryCount = p.readUint32('entry_count');

    if (entryCount !== null && entryCount > 0) {
        const maxEntriesToShow = 10;
        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;
            if (i < maxEntriesToShow) {
                const entryPrefix = `entry_${i + 1}`;
                p.readUint32(`${entryPrefix}_sample_count`);
                if (version === 1) {
                    p.readInt32(`${entryPrefix}_sample_offset`);
                } else {
                    p.readUint32(`${entryPrefix}_sample_offset`);
                }
            } else {
                p.offset += 8; // Skip 8 bytes for each remaining entry
            }
        }

        if (entryCount > maxEntriesToShow) {
            box.details['...more_entries'] = {
                value: `${
                    entryCount - maxEntriesToShow
                } more entries not shown but parsed`,
                offset: 0,
                length: 0,
            };
        }
    }
    p.finalize();
}

export const cttsTooltip = {
    ctts: {
        name: 'Composition Time to Sample',
        text: 'Composition Time to Sample Box (`ctts`). Provides the offset between decoding time (DTS) and composition time (CTS) for each sample. This is essential for streams with B-frames, where the presentation order of frames differs from their decoding order.',
        ref: 'ISO/IEC 14496-12, 8.6.1.3',
    },
    'ctts@version': {
        text: 'Version of this box. Version 0 uses unsigned offsets (CTS >= DTS), while version 1 allows signed offsets, which is necessary for open GOP structures where composition can precede decoding time for leading pictures.',
        ref: 'ISO/IEC 14496-12, 8.6.1.3.2',
    },
    'ctts@entry_count': {
        text: 'The number of entries in the run-length encoded composition time-to-sample table.',
        ref: 'ISO/IEC 14496-12, 8.6.1.3.3',
    },
    'ctts@entry_1_sample_count': {
        text: 'For the first entry, this is the number of consecutive samples that have the same composition offset.',
        ref: 'ISO/IEC 14496-12, 8.6.1.3.3',
    },
    'ctts@entry_1_sample_offset': {
        text: 'For the first entry, this is the composition time offset, such that CompositionTime(n) = DecodingTime(n) + CompositionOffset(n).',
        ref: 'ISO/IEC 14496-12, 8.6.1.3.3',
    },
};
