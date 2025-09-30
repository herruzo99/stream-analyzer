import { BoxParser } from '../utils.js';

/**
 * Parses the 'trep' (Track Extension Properties) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseTrep(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    p.readUint32('track_id');
    // This is a container box, children are parsed by the main parser.
}

export const trepTooltip = {
    trep: {
        name: 'Track Extension Properties',
        text: 'A container box that documents characteristics of the track in subsequent movie fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.15',
    },
    'trep@track_id': {
        text: 'The ID of the track for which these extension properties are provided.',
        ref: 'ISO/IEC 14496-12, 8.8.15.3',
    },
};
