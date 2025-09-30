import { BoxParser } from '../utils.js';

/**
 * Parses the 'frma' (Original Format) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseFrma(box, view) {
    const p = new BoxParser(box, view);
    p.readString(4, 'data_format');
    p.finalize();
}

export const frmaTooltip = {
    frma: {
        name: 'Original Format Box',
        text: 'Stores the original, unencrypted four-character-code of the sample description.',
        ref: 'ISO/IEC 14496-12, 8.12.2',
    },
    'frma@data_format': {
        text: 'The original format of the sample entry (e.g., "avc1", "mp4a").',
        ref: 'ISO/IEC 14496-12, 8.12.2.3',
    },
};
