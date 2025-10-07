import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseHdlr(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    p.skip(4, 'pre_defined');
    p.readString(4, 'handler_type');
    p.skip(12, 'reserved');
    p.readNullTerminatedString('name');
    p.finalize();
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
        text: 'A human-readable name for the track type (for debugging and inspection purposes).',
        ref: 'ISO/IEC 14496-12, 8.4.3.3',
    },
};
