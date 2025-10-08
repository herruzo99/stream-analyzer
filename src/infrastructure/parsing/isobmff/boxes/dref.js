import { BoxParser } from '../utils.js';

/**
 * Parses a 'url ' (Data Entry URL) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseUrl(box, view) {
    const p = new BoxParser(box, view);
    const { flags } = p.readVersionAndFlags();

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
    p.readVersionAndFlags();

    p.readNullTerminatedString('name');
    p.readNullTerminatedString('location');
    p.finalize();
}

export const drefTooltip = {
    dref: {
        name: 'Data Reference Box',
        text: 'A container for data references (e.g., URLs) that declare the location of media data.',
        ref: 'ISO/IEC 14496-12, 8.7.2',
    },
    'url ': {
        name: 'Data Entry URL Box',
        text: 'An entry in the Data Reference Box containing a URL.',
        ref: 'ISO/IEC 14496-12, 8.7.2.1',
    },
    'url @location': {
        text: 'The URL where the media data is located. If the "self-contained" flag is set, this field is absent.',
        ref: 'ISO/IEC 14496-12, 8.7.2.3',
    },
    'urn ': {
        name: 'Data Entry URN Box',
        text: 'An entry in the Data Reference Box containing a URN.',
        ref: 'ISO/IEC 14496-12, 8.7.2.1',
    },
};
