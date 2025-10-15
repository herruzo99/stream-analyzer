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
        text: 'XML Subtitle Sample Entry (`stpp`). A sample entry for subtitle tracks that are based on XML, such as TTML (e.g., IMSC1). It defines the XML namespace and schema location.',
        ref: 'ISO/IEC 14496-12, 12.6.3',
    },
    'stpp@namespace': {
        text: 'A URI that defines the namespace of the XML schema for the subtitle format (e.g., "http://www.w3.org/ns/ttml").',
        ref: 'ISO/IEC 14496-12, 12.6.3.2',
    },
    'stpp@schema_location': {
        text: 'An optional URI pointing to the location of the schema definition (XSD) for the namespace.',
        ref: 'ISO/IEC 14496-12, 12.6.3.2',
    },
    'stpp@auxiliary_mime_types': {
        text: 'A space-separated list of MIME types for any auxiliary data (e.g., images, fonts) that may be referenced by the XML documents.',
        ref: 'ISO/IEC 14496-12, 12.6.3.2',
    },
    mime: {
        name: 'MIME Type Box',
        text: 'MIME Type Box (`mime`). A child of `stpp`, this box stores the specific MIME type of the subtitle document, which can include the `codecs` parameter (e.g., "application/ttml+xml;codecs=im1t").',
        ref: 'ISO/IEC 14496-30',
    },
    'mime@content_type': {
        text: 'The MIME type string that precisely identifies the subtitle format and profile.',
        ref: 'ISO/IEC 14496-30',
    },
};
