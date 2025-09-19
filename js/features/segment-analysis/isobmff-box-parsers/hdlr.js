/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseHdlr(box, view) {
    const getString = (start, len) => String.fromCharCode.apply(null, new Uint8Array(view.buffer, view.byteOffset + start, len));
    box.details['handler_type'] = { value: getString(16, 4), offset: box.offset + 16, length: 4 };
    const nameLength = box.size - 32;
    box.details['name'] = { value: getString(32, nameLength).replace(/\0/g, ''), offset: box.offset + 32, length: nameLength };
}

export const hdlrTooltip = {

    hdlr: {
        name: 'Handler Reference',
        text: "Declares the media type of the track (e.g., 'vide', 'soun').",
        ref: 'ISO/IEC 14496-12, 8.4.3',
    },
    'hdlr@handler_type': {
        text: "A four-character code identifying the media type (e.g., 'vide', 'soun', 'hint').",
        ref: 'ISO/IEC 14496-12, 8.4.3.3',
    },
    'hdlr@name': {
        text: 'A human-readable name for the track type (for debugging).',
        ref: 'ISO/IEC 14496-12, 8.4.3.3',
    },
}