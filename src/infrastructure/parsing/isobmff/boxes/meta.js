import { BoxParser } from '../utils.js';

/**
 * Parses the 'meta' (Metadata) container box.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseMeta(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    // This is a container box. Its children ('hdlr' and others) will be parsed by the main parser.
}

export const metaTooltip = {
    meta: {
        name: 'Metadata Box',
        text: 'Metadata Box (`meta`). A container for descriptive or annotative metadata. It is required to contain a Handler Reference (`hdlr`) box that declares the format of its contents. It can be found at the file, movie, or track level.',
        ref: 'ISO/IEC 14496-12, 8.11.1',
    },
};
