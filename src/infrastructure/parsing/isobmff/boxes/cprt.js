import { BoxParser } from '../utils.js';

/**
 * Parses the 'cprt' (Copyright) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseCprt(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    const langBits = p.readUint16('language_bits');
    if (langBits !== null) {
        const langValue = String.fromCharCode(
            ((langBits >> 10) & 0x1f) + 0x60,
            ((langBits >> 5) & 0x1f) + 0x60,
            (langBits & 0x1f) + 0x60
        );
        box.details['language'] = {
            value: langValue,
            offset: box.details['language_bits'].offset,
            length: 2,
        };
        delete box.details['language_bits'];
    }

    p.readNullTerminatedString('notice');
    p.finalize();
}

export const cprtTooltip = {
    cprt: {
        name: 'Copyright Box',
        text: 'Copyright Box (`cprt`). Contains a copyright declaration which applies to the entire presentation (if in `moov`) or a specific track (if in `trak`). Multiple boxes can exist for different languages.',
        ref: 'ISO/IEC 14496-12, 8.10.2',
    },
    'cprt@language': {
        text: 'An ISO-639-2/T 3-character language code specifying the language of the copyright notice text.',
        ref: 'ISO/IEC 14496-12, 8.10.2.3',
    },
    'cprt@notice': {
        text: 'A null-terminated string in UTF-8 or UTF-16 containing the human-readable copyright statement.',
        ref: 'ISO/IEC 14496-12, 8.10.2.3',
    },
};
