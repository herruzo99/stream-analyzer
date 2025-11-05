import { BoxParser } from '../utils.js';

/**
 * Parses the 'pdin' (Progressive Download Information) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parsePdin(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    box.entries = [];

    while (p.offset < box.size) {
        if (p.stopped) break;

        const rate = p.readUint32(`entry_${box.entries.length}_rate`);
        const initial_delay = p.readUint32(
            `entry_${box.entries.length}_initial_delay`
        );

        if (rate === null || initial_delay === null) break;

        box.details[`entry_${box.entries.length}_rate`].internal = true;
        box.details[
            `entry_${box.entries.length}_initial_delay`
        ].internal = true;

        box.entries.push({ rate, initial_delay });
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