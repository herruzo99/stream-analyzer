import { BoxParser } from '../utils.js';

/**
 * Parses the 'pdin' (Progressive Download Information) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parsePdin(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    let entryIndex = 1;
    while (p.offset < box.size) {
        if (p.stopped) break;
        if (entryIndex > 5) {
            // To avoid cluttering UI, show first few and summarize
            box.details['...more_entries'] = {
                value: 'More entries not shown.',
                offset: 0,
                length: 0,
            };
            break;
        }

        const entryPrefix = `entry_${entryIndex}`;
        p.readUint32(`${entryPrefix}_rate`);
        p.readUint32(`${entryPrefix}_initial_delay`);
        entryIndex++;
    }
    p.finalize();
}

export const pdinTooltip = {
    pdin: {
        name: 'Progressive Download Info',
        text: 'Contains pairs of download rates and suggested initial playback delays to aid progressive downloading.',
        ref: 'ISO/IEC 14496-12, 8.1.3',
    },
    'pdin@entry_1_rate': {
        text: 'The download rate in bytes/second for the first entry.',
        ref: 'ISO/IEC 14496-12, 8.1.3.3',
    },
    'pdin@entry_1_initial_delay': {
        text: 'The suggested initial playback delay in milliseconds for the first entry.',
        ref: 'ISO/IEC 14496-12, 8.1.3.3',
    },
};
