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
        text: 'ID3v2 Box (`ID32` or `id32`). A box containing ID3 version 2 metadata tags, commonly used for carrying timed metadata in MP4 files, especially for HLS streams. This is a common but non-standard box often found within a `meta` box inside a sample entry.',
        ref: 'ID3v2 Specification',
    },
    'ID32@language': {
        text: 'The language of the ID3 tag content, packed into the flags field.',
        ref: 'User-defined',
    },
    'ID32@id3v2_data': {
        text: 'The raw binary payload of the ID3v2 tag, which contains one or more ID3 frames (e.g., TIT2 for title, TXXX for custom text).',
        ref: 'ID3v2 Specification',
    },
};