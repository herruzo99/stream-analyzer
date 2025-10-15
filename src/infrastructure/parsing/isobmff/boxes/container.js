import { BoxParser } from '../utils.js';

/**
 * A generic parser for simple container boxes that have no fields of their own.
 * Their children are parsed by the main parser loop.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
function parseSimpleContainer(box, view) {
    // This function is intentionally empty. These boxes are pure containers.
}

/**
 * A generic parser for simple container boxes that are also "Full Boxes"
 * (i.e., they have version and flags).
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
function parseFullBoxContainer(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    // Do not call p.finalize() as children will be parsed by the main loop.
}

// According to ISO/IEC 14496-12, these are pure containers.
export const parseMoov = parseSimpleContainer;
export const parseTrak = parseSimpleContainer;
export const parseEdts = parseSimpleContainer;
export const parseMvex = parseSimpleContainer;
export const parseMfra = parseSimpleContainer;
export const parseUdta = parseSimpleContainer;

// These containers are also "Full Boxes".
export const parseMdia = parseFullBoxContainer;
export const parseMinf = parseFullBoxContainer;
export const parseStbl = parseFullBoxContainer;
export const parseMoof = parseFullBoxContainer;
export const parseTraf = parseFullBoxContainer;
export const parseDinf = parseFullBoxContainer;

export const groupTooltipData = {
    moov: {
        name: 'Movie',
        text: 'Container for all metadata defining the presentation.',
        ref: 'ISO/IEC 14496-12, 8.2.1',
    },
    trak: {
        name: 'Track',
        text: 'Container for a single track, including its media data references and descriptions.',
        ref: 'ISO/IEC 14496-12, 8.3.1',
    },
    edts: {
        name: 'Edit Box',
        text: 'A container for an edit list, which maps the media timeline to the presentation timeline.',
        ref: 'ISO/IEC 14496-12, 8.6.5',
    },
    mdia: {
        name: 'Media',
        text: 'Container for all objects that declare information about the media data within a track.',
        ref: 'ISO/IEC 14496-12, 8.4.1',
    },
    minf: {
        name: 'Media Information',
        text: 'Container for the media information in a track. Explains how to interpret the media data.',
        ref: 'ISO/IEC 14496-12, 8.4.4',
    },
    dinf: {
        name: 'Data Information',
        text: 'Container for objects that declare where the media data is located (e.g., in this file or a remote URL).',
        ref: 'ISO/IEC 14496-12, 8.7.1',
    },
    stbl: {
        name: 'Sample Table',
        text: 'Container for all the time and data indexing of the media samples in a track.',
        ref: 'ISO/IEC 14496-12, 8.5.1',
    },
    mvex: {
        name: 'Movie Extends',
        text: 'Signals that the movie may contain fragments, and provides defaults for those fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.1',
    },
    moof: {
        name: 'Movie Fragment',
        text: 'Container for all metadata for a single movie fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.4',
    },
    traf: {
        name: 'Track Fragment',
        text: "Container for metadata for a single track's fragment.",
        ref: 'ISO/IEC 14496-12, 8.8.6',
    },
    pssh: {
        name: 'Protection System Specific Header',
        text: 'Contains DRM initialization data.',
        ref: 'ISO/IEC 23001-7',
    },
    mdat: {
        name: 'Media Data',
        text: 'Contains the actual audio/video sample data.',
        ref: 'ISO/IEC 14496-12, 8.1.1',
    },
    meta: {
        name: 'Metadata',
        text: 'A container for metadata.',
        ref: 'ISO/IEC 14496-12, 8.11.1',
    },
    mfra: {
        name: 'Movie Fragment Random Access',
        text: 'A container for random access information for movie fragments, often found at the end of the file.',
        ref: 'ISO/IEC 14496-12, 8.8.9',
    },
};
