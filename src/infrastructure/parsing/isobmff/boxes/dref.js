import { BoxParser } from '../utils.js';

const URL_FLAGS_SCHEMA = {
    0x000001: 'self_contained',
};

/**
 * Parses the 'dref' (Data Reference) box. It's a container for 'url ' or 'urn ' boxes.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseDref(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();
    p.readUint32('entry_count');
    // This is a container. Children ('url ', 'urn ') are parsed by the main loop.
}

/**
 * Parses a 'url ' (Data Entry URL) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseUrl(box, view) {
    const p = new BoxParser(box, view);
    const { flags } = p.readVersionAndFlags(URL_FLAGS_SCHEMA);

    if (flags !== null && (flags & 1) === 0) {
        p.readNullTerminatedString('location');
    }
    p.finalize();
}

/**
 * Parses a 'urn ' (Data Entry URN) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseUrn(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags(URL_FLAGS_SCHEMA);

    p.readNullTerminatedString('name');
    p.readNullTerminatedString('location');
    p.finalize();
}

export const drefTooltip = {
    dref: {
        name: 'Data Reference Box',
        text: 'Data Reference Box (`dref`). A container for one or more data entries (`url ` or `urn `) that declare the location(s) of the media data used within the track. This enables referencing media from external files.',
        ref: 'ISO/IEC 14496-12, 8.7.2',
    },
    'dref@entry_count': {
        text: 'The number of data entries (e.g., `url ` or `urn ` boxes) that follow.',
        ref: 'ISO/IEC 14496-12, 8.7.2.2',
    },
    'url ': {
        name: 'Data Entry URL Box',
        text: 'Data Entry URL Box (`url `). An entry in the Data Reference Box. Its flags indicate if the media is in the same file or at an external URL.',
        ref: 'ISO/IEC 14496-12, 8.7.2.1',
    },
    'url @flags': {
        text: 'A bitfield where `self_contained` indicates that the media data is in the same file as this Movie Box.',
        ref: 'ISO/IEC 14496-12, 8.7.2.3',
    },
    'url @location': {
        text: 'The URL where the media data is located. If the `self_contained` flag is set, this field is absent.',
        ref: 'ISO/IEC 14496-12, 8.7.2.3',
    },
    'urn ': {
        name: 'Data Entry URN Box',
        text: 'Data Entry URN Box (`urn `). An entry in the Data Reference Box containing a Uniform Resource Name and an optional URL.',
        ref: 'ISO/IEC 14496-12, 8.7.2.1',
    },
    'urn @name': {
        text: 'A Uniform Resource Name (URN) identifying the media resource.',
        ref: 'ISO/IEC 14496-12, 8.7.2.3',
    },
    'urn @location': {
        text: 'An optional URL that provides a location to find the resource with the given URN.',
        ref: 'ISO/IEC 14496-12, 8.7.2.3',
    },
};
