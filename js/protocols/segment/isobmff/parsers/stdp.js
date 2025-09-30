import { BoxParser } from '../utils.js';

/**
 * Parses the 'stdp' (Degradation Priority) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseStdp(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    const sampleCount = (box.size - p.offset) / 2;
    box.details['sample_count'] = {
        value: sampleCount,
        offset: 0,
        length: 0,
    };

    if (sampleCount > 0) {
        const maxEntriesToShow = 10;
        for (let i = 0; i < sampleCount; i++) {
            if (p.stopped) break;
            if (i < maxEntriesToShow) {
                p.readUint16(`priority_${i + 1}`);
            } else {
                p.offset += 2;
            }
        }

        if (sampleCount > maxEntriesToShow) {
            box.details['...more_entries'] = {
                value: `${
                    sampleCount - maxEntriesToShow
                } more entries not shown but parsed`,
                offset: 0,
                length: 0,
            };
        }
    }
    p.finalize();
}

export const stdpTooltip = {
    stdp: {
        name: 'Degradation Priority',
        text: 'Contains the degradation priority for each sample in the track.',
        ref: 'ISO/IEC 14496-12, 8.5.3',
    },
    'stdp@priority_1': {
        text: 'The priority for the first sample. Lower values are typically more important.',
        ref: 'ISO/IEC 14496-12, 8.5.3.3',
    },
};
