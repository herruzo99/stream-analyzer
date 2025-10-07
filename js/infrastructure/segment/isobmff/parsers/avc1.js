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
        text: 'Defines the coding type and initialization information for an H.264/AVC video track.',
        ref: 'ISO/IEC 14496-12, 12.1.3',
    },
    'avc1@data_reference_index': {
        text: 'Index to the Data Reference Box, indicating where the media data is stored.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
    'avc1@width': {
        text: 'The width of the video in pixels.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
    'avc1@height': {
        text: 'The height of the video in pixels.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
    'avc1@horizresolution': {
        text: 'Horizontal resolution of the image in pixels-per-inch (16.16 fixed point). Default is 72 dpi.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
    'avc1@vertresolution': {
        text: 'Vertical resolution of the image in pixels-per-inch (16.16 fixed point). Default is 72 dpi.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
    'avc1@frame_count': {
        text: 'The number of frames of compressed video stored in each sample. Typically 1.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
    'avc1@compressorname': {
        text: 'An informative name for the compressor used. A Pascal-style string within a 32-byte field.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
    'avc1@depth': {
        text: 'The color depth of the video. 0x0018 (24) is typical for color with no alpha.',
        ref: 'ISO/IEC 14496-12, 12.1.3.2',
    },
};
