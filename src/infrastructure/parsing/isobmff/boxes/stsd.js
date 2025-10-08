import { BoxParser } from '../utils.js';

/**
 * Parses the 'stsd' (Sample Description) box. This is a container for sample entries.
 * The sample entries themselves do not have standard box headers, so they are parsed specially.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseStsd(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    p.readUint32('entry_count');
    // This is a container box. The main parsing loop will handle the children (sample entries).
    // We do not call p.finalize() here as that would incorrectly flag the children as "extra data".
}

export const stsdTooltip = {
    stsd: {
        name: 'Sample Description',
        text: 'Stores information for decoding samples (codec type, initialization data). Contains one or more Sample Entry boxes.',
        ref: 'ISO/IEC 14496-12, 8.5.2',
    },
    'stsd@entry_count': {
        text: 'The number of sample entries that follow.',
        ref: 'ISO/IEC 14496-12, 8.5.2.3',
    },
    'stsd@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.5.2.3',
    },
    // Tooltips for common sample entries (avc1, mp4a) are handled via their own boxes now.
};
