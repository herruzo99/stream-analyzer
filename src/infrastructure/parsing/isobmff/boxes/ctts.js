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
    box.entries = [];

    if (entryCount !== null && entryCount > 0) {
        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;
            if (!p.checkBounds(8)) break;

            const sample_count = p.view.getUint32(p.offset);
            let sample_offset;
            if (version === 1) {
                sample_offset = p.view.getInt32(p.offset + 4);
            } else {
                sample_offset = p.view.getUint32(p.offset + 4);
            }
            p.offset += 8;

            box.entries.push({ sample_count, sample_offset });
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