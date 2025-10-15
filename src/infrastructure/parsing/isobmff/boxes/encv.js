import { BoxParser } from '../utils.js';

/**
 * Parses the 'encv' (Encrypted Video Sample Entry) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseEncv(box, view) {
    const p = new BoxParser(box, view);

    // From SampleEntry
    p.skip(6, 'reserved_sample_entry');
    p.readUint16('data_reference_index');

    // From VisualSampleEntry
    p.skip(16, 'pre_defined_and_reserved');
    p.readUint16('width');
    p.readUint16('height');
    p.readUint32('horizresolution');
    p.readUint32('vertresolution');
    p.readUint32('reserved_3');
    p.readUint16('frame_count');
    p.skip(32, 'compressorname');
    p.readUint16('depth');
    p.readInt16('pre_defined_3');

    // Child boxes (sinf) will be parsed by the main parser.
}

export const encvTooltip = {
    encv: {
        name: 'Encrypted Video Sample Entry',
        text: 'Encrypted Video Sample Entry (`encv`). A sample entry that acts as a wrapper for a video stream that has been encrypted. It contains a Protection Scheme Information (`sinf`) box which details the encryption scheme and original format.',
        ref: 'ISO/IEC 14496-12, 8.12',
    },
    'encv@data_reference_index': {
        text: 'Index into the Data Reference Box (`dref`), specifying the location of the media data.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
    'encv@width': {
        text: 'The width of the video in pixels. This should match the original, unencrypted video format.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
    'encv@height': {
        text: 'The height of the video in pixels.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
};