import { BoxParser } from '../utils.js';

/**
 * A generic parser for simple container boxes that have no fields of their own.
 * Their children are parsed by the main parser loop.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
function parseSimpleContainer(box, view) {
    // This function is intentionally empty. These boxes are pure containers.
}

/**
 * A generic parser for simple container boxes that are also "Full Boxes"
 * (i.e., they have version and flags).
 * @param {import('@/types.js').Box} box
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
        text: 'Movie Box (`moov`). The top-level container for all presentation metadata. It defines the timescale, duration, and individual tracks (video, audio, etc.) that make up the media. Its location in the file (e.g., at the beginning) is critical for fast playback startup.',
        ref: 'ISO/IEC 14496-12, 8.2.1',
    },
    trak: {
        name: 'Track',
        text: 'Track Box (`trak`). A container for a single track of a presentation. A track is a timed sequence of media samples (e.g., video frames or audio samples). It contains all information for processing a single media stream, including timing, layout, and sample descriptions.',
        ref: 'ISO/IEC 14496-12, 8.3.1',
    },
    edts: {
        name: 'Edit Box',
        text: 'Edit Box (`edts`). A container for an edit list, which maps the media timeline to the overall presentation timeline. It allows for effects like starting a track at a non-zero time or looping sections of media.',
        ref: 'ISO/IEC 14496-12, 8.6.5',
    },
    mdia: {
        name: 'Media',
        text: 'Media Box (`mdia`). A container for all objects that declare information about the media data within a single track.',
        ref: 'ISO/IEC 14496-12, 8.4.1',
    },
    minf: {
        name: 'Media Information',
        text: 'Media Information Box (`minf`). Contains all objects that declare characteristic information of the media in the track, such as the media type header (`vmhd`, `smhd`) and the sample table (`stbl`).',
        ref: 'ISO/IEC 14496-12, 8.4.4',
    },
    dinf: {
        name: 'Data Information',
        text: 'Data Information Box (`dinf`). A container for objects that declare where the media data is located. It contains the Data Reference Box (`dref`).',
        ref: 'ISO/IEC 14496-12, 8.7.1',
    },
    stbl: {
        name: 'Sample Table',
        text: 'Sample Table Box (`stbl`). Contains all the time and data indexing information for the media samples in a track. This is the heart of the file format, mapping time to data bytes.',
        ref: 'ISO/IEC 14496-12, 8.5.1',
    },
    mvex: {
        name: 'Movie Extends',
        text: 'Movie Extends Box (`mvex`). A container that signals the presence of movie fragments (`moof`) in the file and provides default values for the samples within those fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.1',
    },
    moof: {
        name: 'Movie Fragment',
        text: 'Movie Fragment Box (`moof`). Contains the metadata for a single segment of the media presentation. Used for fragmented MP4s, enabling streaming and live content.',
        ref: 'ISO/IEC 14496-12, 8.8.4',
    },
    traf: {
        name: 'Track Fragment',
        text: "Track Fragment Box (`traf`). Contains metadata for a single track's portion of a movie fragment, including timing and location of samples.",
        ref: 'ISO/IEC 14496-12, 8.8.6',
    },
    pssh: {
        name: 'Protection System Specific Header',
        text: 'Protection System Specific Header (`pssh`). Contains initialization data required by a specific DRM system (e.g., Widevine, PlayReady) to acquire a license for playback.',
        ref: 'ISO/IEC 23001-7, 5.1',
    },
    mdat: {
        name: 'Media Data',
        text: "Media Data Box (`mdat`). Contains the actual audiovisual sample data (e.g., video frames, audio samples). The file's metadata in other boxes points to byte ranges within this box. The structure of this data is described by the metadata in the preceding `moof` box. It is not parsed further at this structural level.",
        ref: 'ISO/IEC 14496-12, 8.1.1',
    },
    meta: {
        name: 'Metadata',
        text: 'Metadata Box (`meta`). A container for timed or untimed metadata. It must contain a Handler Reference (`hdlr`) box to declare the metadata format.',
        ref: 'ISO/IEC 14496-12, 8.11.1',
    },
    mfra: {
        name: 'Movie Fragment Random Access',
        text: 'Movie Fragment Random Access Box (`mfra`). A container for random access information for movie fragments, often found at the end of the file to facilitate seeking.',
        ref: 'ISO/IEC 14496-12, 8.8.9',
    },
    udta: {
        name: 'User Data',
        text: 'User Data Box (`udta`). A container for user-defined or non-standard metadata, such as copyright information or track titles.',
        ref: 'ISO/IEC 14496-12, 8.10.1',
    },
};