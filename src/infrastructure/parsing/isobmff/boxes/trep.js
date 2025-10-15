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
        name: 'Track Extension Properties Box',
        text: 'Track Extension Properties Box (`trep`). A container box within `mvex` that can be used to document or summarize characteristics of a specific track across all subsequent movie fragments (e.g., providing a `cslg` box to summarize composition times for all fragments).',
        ref: 'ISO/IEC 14496-12, 8.8.15',
    },
    'trep@track_id': {
        text: 'The ID of the track for which the extension properties contained within this box are provided.',
        ref: 'ISO/IEC 14496-12, 8.8.15.3',
    },
};