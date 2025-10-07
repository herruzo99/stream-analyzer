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
        text: 'Contains a copyright declaration for the track or presentation.',
        ref: 'ISO/IEC 14496-12, 8.10.2',
    },
    'cprt@language': {
        text: 'The ISO-639-2/T language code for the notice text.',
        ref: 'ISO/IEC 14496-12, 8.10.2.3',
    },
    'cprt@notice': {
        text: 'The copyright notice text.',
        ref: 'ISO/IEC 14496-12, 8.10.2.3',
    },
};
