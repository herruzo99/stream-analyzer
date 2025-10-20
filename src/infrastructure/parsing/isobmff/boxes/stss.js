import { BoxParser } from '../utils.js';

/**
 * Parses the 'stss' (Sync Sample) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseStss(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    const entryCount = p.readUint32('entry_count');
    box.entries = [];

    if (entryCount !== null && entryCount > 0) {
        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;
            if (!p.checkBounds(4)) break;

            const sample_number = p.view.getUint32(p.offset);
            p.offset += 4;

            box.entries.push({ sample_number });
        }
    }
    p.finalize();
}

export const stssTooltip = {
    stss: {
        name: 'Sync Sample Box',
        text: 'Sync Sample Box (`stss`). Provides a compact list of all the sync samples (e.g., I-frames in video) in the track. Sync samples are random access points from which decoding can begin. If this box is not present, all samples are considered sync samples.',
        ref: 'ISO/IEC 14496-12, 8.6.2',
    },
    'stss@entry_count': {
        text: 'The number of sync samples listed in this table. If zero, there are no sync samples in the track.',
        ref: 'ISO/IEC 14496-12, 8.6.2.2',
    },
    'stss@sample_numbers': {
        text: 'A table of 1-based sample numbers for each sync sample, listed in strictly increasing order.',
        ref: 'ISO/IEC 14496-12, 8.6.2.2',
    },
};
