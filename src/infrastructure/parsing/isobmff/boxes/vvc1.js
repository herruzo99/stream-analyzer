import { BoxParser } from '../utils.js';

/**
 * Parses the 'vvc1' or 'vvi1' (VVC Sample Entry) box.
 * ISO/IEC 14496-15:2019 Amd 2
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseVvc1(box, view) {
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

    // Child boxes (like vvcC) will be parsed by the main parser.
}

export const vvc1Tooltip = {
    vvc1: {
        name: 'VVC Sample Entry',
        text: "VVC Sample Entry (`vvc1`). A type of `VisualSampleEntry` specific to H.266/VVC video. It contains the video's dimensions and resolution, and is the parent to the `vvcC` box.",
        ref: 'ISO/IEC 14496-15',
    },
    vvi1: {
        name: 'VVC Sample Entry (vvi1)',
        text: 'VVC Sample Entry (`vvi1`). Indicates VVC video where parameter sets may be stored in-band (in the samples) rather than strictly in the configuration box.',
        ref: 'ISO/IEC 14496-15',
    },
    'vvc1@width': {
        text: 'The maximum width of the video frames in this track.',
        ref: 'ISO/IEC 14496-12',
    },
    'vvc1@height': {
        text: 'The maximum height of the video frames in this track.',
        ref: 'ISO/IEC 14496-12',
    },
};
