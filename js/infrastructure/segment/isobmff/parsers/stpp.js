import { BoxParser } from '../utils.js';

/**
 * Parses the 'mime' (MIME Type) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
function parseMime(box, view) {
    const p = new BoxParser(box, view);
    p.readNullTerminatedString('content_type');
    if (p.offset < box.size) {
        p.readNullTerminatedString('content_encoding');
    }
    p.finalize();
}

/**
 * Parses the 'stpp' (XML Subtitle Sample Entry) box. This is a container.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseStpp(box, view) {
    const p = new BoxParser(box, view);

    // From SampleEntry
    p.skip(6, 'reserved_sample_entry');
    p.readUint16('data_reference_index');

    // stpp-specific fields
    p.readNullTerminatedString('namespace');
    p.readNullTerminatedString('schema_location');
    p.readNullTerminatedString('auxiliary_mime_types');

    // Children (like 'mime') are parsed by the main parser loop.
}

export const stppParsers = {
    stpp: parseStpp,
    mime: parseMime,
};

export const stppTooltip = {
    stpp: {
        name: 'XML Subtitle Sample Entry',
        text: 'Defines the coding for an XML-based subtitle track, such as TTML/IMSC1.',
        ref: 'ISO/IEC 14496-12, 12.4.3',
    },
    'stpp@namespace': {
        text: 'A URI defining the namespace of the XML schema for the subtitle format.',
        ref: 'ISO/IEC 14496-12, 12.4.3.2',
    },
    'stpp@schema_location': {
        text: 'The location of the schema for the namespace.',
        ref: 'ISO/IEC 14496-12, 12.4.3.2',
    },
    'stpp@auxiliary_mime_types': {
        text: 'A list of MIME types for auxiliary data (e.g., images) referenced by the XML.',
        ref: 'ISO/IEC 14496-12, 12.4.3.2',
    },
    mime: {
        name: 'MIME Type Box',
        text: 'Stores the MIME type of the subtitle document, including any codecs parameters.',
        ref: 'ISO/IEC 14496-30',
    },
    'mime@content_type': {
        text: 'The MIME type string, e.g., "application/ttml+xml;codecs=im1t".',
        ref: 'ISO/IEC 14496-30',
    },
};
