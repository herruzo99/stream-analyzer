import { BoxParser } from '../utils.js';

/**
 * Parses the 'avc1' (AVC Sample Entry) box, which is a type of VisualSampleEntry.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseAvc1(box, view) {
    const p = new BoxParser(box, view);

    // From SampleEntry
    p.skip(6, 'reserved_sample_entry');
    p.readUint16('data_reference_index');

    // From VisualSampleEntry
    p.skip(2, 'pre_defined_1');
    p.skip(2, 'reserved_2');
    p.skip(12, 'pre_defined_2');
    p.readUint16('width');
    p.readUint16('height');

    const horizresolution = p.readUint32('horizresolution_fixed_point');
    if (horizresolution !== null) {
        box.details['horizresolution'] = {
            ...box.details['horizresolution_fixed_point'],
            value: (horizresolution / 65536).toFixed(2) + ' dpi',
        };
        delete box.details['horizresolution_fixed_point'];
    }

    const vertresolution = p.readUint32('vertresolution_fixed_point');
    if (vertresolution !== null) {
        box.details['vertresolution'] = {
            ...box.details['vertresolution_fixed_point'],
            value: (vertresolution / 65536).toFixed(2) + ' dpi',
        };
        delete box.details['vertresolution_fixed_point'];
    }

    p.readUint32('reserved_3');
    p.readUint16('frame_count');

    const nameStartOffset = p.offset;
    if (p.checkBounds(32)) {
        const nameLength = p.view.getUint8(p.offset);
        const nameBytes = new Uint8Array(
            p.view.buffer,
            p.view.byteOffset + p.offset + 1,
            nameLength
        );
        const name = new TextDecoder().decode(nameBytes);
        box.details['compressorname'] = {
            value: name,
            offset: p.box.offset + nameStartOffset,
            length: 32,
        };
        p.offset += 32;
    }

    p.readUint16('depth');
    p.readInt16('pre_defined_3');

    // Child boxes (like avcC) will be parsed by the main parser.
    // Do not call p.finalize() here.
}

export const avc1Tooltip = {
    avc1: {
        name: 'AVC Sample Entry',
        text: "AVC Sample Entry (`avc1`). A type of `VisualSampleEntry` specific to H.264/AVC video. It contains the video's dimensions, resolution, and is the parent to the `avcC` box which holds critical decoder configuration data.",
        ref: 'ISO/IEC 14496-15, 5.2.4.1.1',
    },
    'avc1@data_reference_index': {
        text: 'An index into the Data Reference Box (`dref`) that identifies the file or resource containing the media data for this track.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
    'avc1@width': {
        text: 'The maximum width of the video frames in this track, in pixels. This value, along with height, helps determine the buffer size needed for decoding.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
    'avc1@height': {
        text: 'The maximum height of the video frames in this track, in pixels.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
    'avc1@horizresolution': {
        text: 'Horizontal resolution of the image in pixels per inch, expressed as a 16.16 fixed-point number. Default is 72 dpi.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
    'avc1@vertresolution': {
        text: 'Vertical resolution of the image in pixels per inch, expressed as a 16.16 fixed-point number. Default is 72 dpi.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
    'avc1@frame_count': {
        text: 'The number of frames of compressed video stored in each sample. For AVC, this value must be 1.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
    'avc1@compressorname': {
        text: 'An informative, human-readable name for the compressor used to create the content. Stored as a Pascal-style string in a 32-byte field.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
    'avc1@depth': {
        text: 'The color depth of the video frames. A value of 0x0018 (24) indicates standard 24-bit color.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
};
