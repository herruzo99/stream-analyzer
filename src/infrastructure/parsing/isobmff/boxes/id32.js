import { BoxParser } from '../utils.js';

/**
 * Parses the 'ID32' (ID3v2 Metadata) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseId32(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    // The language code is sometimes packed into the flags, but we will treat
    // the rest of the box as an opaque payload containing the ID3v2 tag data.
    p.readRemainingBytes('id3v2_data');
    p.finalize();
}

export const id32Tooltip = {
    ID32: {
        name: 'ID3v2 Metadata Box',
        text: 'A box containing ID3 version 2 metadata tags. This is a common but non-standard box often found in files created by tools like FFmpeg, typically within a `udta` or `meta` box.',
        ref: 'User-defined',
    },
};
