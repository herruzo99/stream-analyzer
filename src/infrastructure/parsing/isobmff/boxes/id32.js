import { BoxParser } from '../utils.js';

/**
 * Parses the 'ID32' (ID3v2 Metadata) box.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseId32(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags(); // Reads version and raw flags

    // Manually decode the 15-bit language code from the raw flags.
    // The language code is packed into the 24-bit flags field.
    const flagsInt = parseInt(box.details.flags.value, 16);
    const langBits = flagsInt & 0x7fff; // Mask the lower 15 bits for the language code

    // The language code is a packed 15-bit value, with each 5 bits representing a character code
    // offset from 0x60, as per ISO-639-2/T.
    const char1 = ((langBits >> 10) & 0x1f) + 0x60;
    const char2 = ((langBits >> 5) & 0x1f) + 0x60;
    const char3 = (langBits & 0x1f) + 0x60;
    const langValue = String.fromCharCode(char1, char2, char3);

    box.details['language'] = {
        value: langValue,
        offset: box.details.flags.offset,
        length: 2, // The language code is packed within the 24-bit flags field
    };

    // The rest of the box is an opaque payload containing the ID3v2 tag data.
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
        text: 'The language of the ID3 tag content, packed into the flags field as a 15-bit ISO-639-2/T code.',
        ref: 'User-defined',
    },
    'ID32@id3v2_data': {
        text: 'The raw binary payload of the ID3v2 tag, which contains one or more ID3 frames (e.g., TIT2 for title, TXXX for custom text).',
        ref: 'ID3v2 Specification',
    },
};
