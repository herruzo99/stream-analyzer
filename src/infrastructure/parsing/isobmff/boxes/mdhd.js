import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseMdhd(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    if (version === 1) {
        p.readBigUint64('creation_time');
        p.readBigUint64('modification_time');
    } else {
        p.readUint32('creation_time');
        p.readUint32('modification_time');
    }

    p.readUint32('timescale');

    if (version === 1) {
        p.readBigUint64('duration');
    } else {
        p.readUint32('duration');
    }

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
    p.skip(2, 'pre-defined');
    p.finalize();
}

export const mdhdTooltip = {
    mdhd: {
        name: 'Media Header',
        text: 'Declares media information (timescale, language).',
        ref: 'ISO/IEC 14496-12, 8.4.2',
    },
    'mdhd@version': {
        text: 'Version of this box (0 or 1). Affects the size of time and duration fields.',
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
    'mdhd@timescale': {
        text: "The number of time units that pass in one second for this track's media.",
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
    'mdhd@duration': {
        text: "The duration of this track's media in units of its own timescale.",
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
    'mdhd@language': {
        text: 'The ISO-639-2/T language code for this media.',
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
};
