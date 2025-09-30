import { BoxParser } from '../utils.js';

/**
 * Parses the 'mfro' (Movie Fragment Random Access Offset) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseMfro(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    p.readUint32('size');
    p.finalize();
}

export const mfroTooltip = {
    mfro: {
        name: 'Movie Fragment Random Access Offset',
        text: 'Contains the size of the enclosing `mfra` box to aid in locating it by scanning from the end of the file.',
        ref: 'ISO/IEC 14496-12, 8.8.11',
    },
    'mfro@size': {
        text: 'The size of the `mfra` box in bytes.',
        ref: 'ISO/IEC 14496-12, 8.8.11.3',
    },
};
