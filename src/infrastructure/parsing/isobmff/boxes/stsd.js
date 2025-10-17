import { BoxParser } from '../utils.js';

/**
 * Parses the 'stsd' (Sample Description) box. This is a container for sample entries.
 * The sample entries themselves do not have standard box headers, so they are parsed specially.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseStsd(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags(null); // No flags defined in spec
    p.readUint32('entry_count');
    // This is a container box. The main parsing loop will handle the children (sample entries).
    // We do not call p.finalize() here as that would incorrectly flag the children as "extra data".
}

export const stsdTooltip = {
    stsd: {
        name: 'Sample Description Box',
        text: 'Sample Description Box (`stsd`). A container for one or more sample entries (e.g., `avc1`, `mp4a`). Each sample entry defines the coding format and provides initialization information required by the decoder for a set of samples in the track.',
        ref: 'ISO/IEC 14496-12, 8.5.2',
    },
    'stsd@entry_count': {
        text: 'The number of sample description entries that follow. A track can use multiple coding formats, though this is uncommon.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
    'stsd@version': {
        text: 'Version of this box. Typically 0, but must be 1 if it contains an `AudioSampleEntryV1` for high sample rates.',
        ref: 'ISO/IEC 14496-12, 8.5.2.3',
    },
};
