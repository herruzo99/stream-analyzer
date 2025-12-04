import { BoxParser } from '../utils.js';

/**
 * Parses the 'evc1' (EVC Sample Entry) box.
 * ISO/IEC 14496-15: EVC binding
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseEvc1(box, view) {
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
}

export const evc1Tooltip = {
    evc1: {
        name: 'EVC Sample Entry',
        text: "EVC Sample Entry (`evc1`). A type of `VisualSampleEntry` specific to MPEG-5 EVC (Essential Video Coding). It contains the video's dimensions and resolution, and is the parent to the `evcC` box.",
        ref: 'ISO/IEC 14496-15',
    },
    'evc1@width': {
        text: 'The maximum width of the video frames in this track.',
        ref: 'ISO/IEC 14496-12',
    },
    'evc1@height': {
        text: 'The maximum height of the video frames in this track.',
        ref: 'ISO/IEC 14496-12',
    },
};
