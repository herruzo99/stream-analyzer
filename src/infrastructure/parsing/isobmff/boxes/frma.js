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
        text: 'Original Format Box (`frma`). Specifies the original four-character code (e.g., "avc1", "mp4a") of a sample entry that has been transformed, typically by encryption. It is contained within a `sinf` box.',
        ref: 'ISO/IEC 14496-12, 8.12.2',
    },
    'frma@data_format': {
        text: 'The four-character code of the original, unencrypted sample entry. This allows a player that can handle the protection scheme to understand the underlying media format.',
        ref: 'ISO/IEC 14496-12, 8.12.2.3',
    },
};