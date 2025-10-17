import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseHdlr(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags(null); // No flags defined in spec
    p.skip(4, 'pre_defined');
    p.readString(4, 'handler_type');
    p.skip(12, 'reserved');
    p.readNullTerminatedString('name');
    p.finalize();
}

export const hdlrTooltip = {
    hdlr: {
        name: 'Handler Reference Box',
        text: 'Handler Reference Box (`hdlr`). Declares the media type of the track and thus the process by which the media-data in the track is presented. It specifies whether the track contains video (`vide`), audio (`soun`), subtitles (`subt`), or other media types.',
        ref: 'ISO/IEC 14496-12, 8.4.3',
    },
    'hdlr@handler_type': {
        text: 'A four-character code that identifies the media type. Common values include `vide` (video), `soun` (sound), `hint` (hint track for streaming), `subt` (subtitles), and `meta` (metadata).',
        ref: 'ISO/IEC 14496-12, 8.4.3.3 & 12',
    },
    'hdlr@name': {
        text: 'A human-readable, null-terminated string in UTF-8 that gives a name for the track type (e.g., "VideoHandler"). This is primarily for inspection and debugging.',
        ref: 'ISO/IEC 14496-12, 8.4.3.3',
    },
};
