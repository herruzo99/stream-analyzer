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
        name: 'Progressive Download Information Box',
        text: 'Progressive Download Information Box (`pdin`). Provides a table of download bitrates and corresponding initial playback delays. This allows a client to choose an appropriate initial buffer time to avoid playback stalls during progressive download.',
        ref: 'ISO/IEC 14496-12, 8.1.3',
    },
    'pdin@entry_1_rate': {
        text: 'For the first entry, this is a download rate in bytes per second.',
        ref: 'ISO/IEC 14496-12, 8.1.3.3',
    },
    'pdin@entry_1_initial_delay': {
        text: 'For the first entry, this is the suggested initial playback delay in milliseconds that should be used if the download is proceeding at the corresponding rate.',
        ref: 'ISO/IEC 14496-12, 8.1.3.3',
    },
};
