import { BoxParser } from '../utils.js';

/**
 * Parses the 'mfro' (Movie Fragment Random Access Offset) box.
 * @param {import('@/types.js').Box} box
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
        name: 'Movie Fragment Random Access Offset Box',
        text: 'Movie Fragment Random Access Offset Box (`mfro`). This box is placed at the very end of a Movie Fragment Random Access Box (`mfra`) and contains the size of the `mfra` box itself. This architectural design allows a player to find the `mfra` by reading the last few bytes of a file, enabling efficient seeking in fragmented streams.',
        ref: 'ISO/IEC 14496-12, 8.8.11',
    },
    'mfro@size': {
        text: 'The size in bytes of the enclosing Movie Fragment Random Access (`mfra`) box. This value must be accurate for the seeking mechanism to work correctly.',
        ref: 'ISO/IEC 14496-12, 8.8.11.3',
    },
};
