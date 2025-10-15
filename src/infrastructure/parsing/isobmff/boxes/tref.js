import { BoxParser } from '../utils.js';

/**
 * Parses the 'tref' (Track Reference) container box.
 * This box does not have its own fields but contains other boxes
 * whose type indicates the reference type (e.g., 'hint', 'cdsc').
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseTref(box, view) {
    // The tref box is a container. Its children are parsed by the main
    // parseISOBMFF function. This function is a placeholder to define
    // tooltip data and could be extended if tref itself had fields.
}

/**
 * A generic parser for boxes within a 'tref' box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
function parseTrefTypeBox(box, view) {
    const p = new BoxParser(box, view);
    const trackIDs = [];
    while (p.offset < box.size) {
        if (p.stopped) break;
        const id = p.readUint32(`track_ID_${trackIDs.length + 1}`);
        if (id !== null) {
            trackIDs.push(id);
        } else {
            break; // Stop if a read fails
        }
    }
    box.details['track_IDs'] = {
        value: trackIDs.join(', '),
        offset: box.offset + box.headerSize,
        length: box.size - box.headerSize,
    };
    p.finalize();
}

// We need to export parsers for the known tref child boxes
export const trefTypeParsers = {
    hint: parseTrefTypeBox,
    cdsc: parseTrefTypeBox,
    font: parseTrefTypeBox,
    hind: parseTrefTypeBox,
    vdep: parseTrefTypeBox,
    vplx: parseTrefTypeBox,
    subt: parseTrefTypeBox,
};

export const trefTooltip = {
    tref: {
        name: 'Track Reference Box',
        text: 'Track Reference Box (`tref`). A container that defines typed references from this track to other tracks. This is the primary mechanism for establishing dependencies or relationships between tracks.',
        ref: 'ISO/IEC 14496-12, 8.3.3',
    },
    hint: {
        name: 'Hint Track Reference',
        text: 'A track reference of type `hint`. It indicates that the referenced track(s) contain the original media data that this hint track provides streaming instructions for.',
        ref: 'ISO/IEC 14496-12, 8.3.3.3',
    },
    cdsc: {
        name: 'Content Description Reference',
        text: 'A track reference of type `cdsc`. It indicates that this track (e.g., a timed metadata track) provides a description of the referenced content track.',
        ref: 'ISO/IEC 14496-12, 8.3.3.3',
    },
    'hint@track_IDs': {
        text: 'A list of track IDs that this track references for this specific reference type.',
        ref: 'ISO/IEC 14496-12, 8.3.3.2',
    },
};
