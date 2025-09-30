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

    if (entryCount !== null && entryCount > 0) {
        const sampleNumbers = [];
        const maxEntriesToShow = 10;
        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;

            if (i < maxEntriesToShow) {
                const sampleNum = p.readUint32(`sample_number_entry_${i + 1}`);
                if (sampleNum !== null) {
                    sampleNumbers.push(sampleNum);
                    delete box.details[`sample_number_entry_${i + 1}`];
                }
            } else {
                p.offset += 4;
            }
        }

        if (entryCount > 0) {
            box.details['sample_numbers'] = {
                value:
                    sampleNumbers.join(', ') +
                    (entryCount > maxEntriesToShow
                        ? `... (${
                              entryCount - maxEntriesToShow
                          } more entries not shown but parsed)`
                        : ''),
                offset: box.offset + p.offset, // This offset isn't quite right but the field is virtual
                length: entryCount * 4,
            };
        }
    }
    p.finalize();
}

export const stssTooltip = {
    stss: {
        name: 'Sync Sample Box',
        text: 'Provides a compact list of the sync samples (keyframes/random access points) in the track.',
        ref: 'ISO/IEC 14496-12, 8.6.2',
    },
    'stss@entry_count': {
        text: 'The number of sync samples in this track.',
        ref: 'ISO/IEC 14496-12, 8.6.2.3',
    },
    'stss@sample_numbers': {
        text: 'The sample numbers of the sync samples, in increasing order.',
        ref: 'ISO/IEC 14496-12, 8.6.2.3',
    },
};
