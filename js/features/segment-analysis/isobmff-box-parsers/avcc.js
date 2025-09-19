/**
 * Parses the 'avcC' (AVC Configuration) box.
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseAvcc(box, view) {
    let offset = box.contentOffset - box.offset + 8; // Start after box header
    box.details['configurationVersion'] = { value: view.getUint8(offset), offset: box.offset + offset, length: 1 };
    offset += 1;
    box.details['AVCProfileIndication'] = { value: view.getUint8(offset), offset: box.offset + offset, length: 1 };
    offset += 1;
    box.details['profile_compatibility'] = { value: view.getUint8(offset), offset: box.offset + offset, length: 1 };
    offset += 1;
    box.details['AVCLevelIndication'] = { value: view.getUint8(offset), offset: box.offset + offset, length: 1 };
    offset += 1;
    const spsCount = view.getUint8(offset + 1) & 0x1F;
    box.details['numOfSequenceParameterSets'] = { value: spsCount, offset: box.offset + offset + 1, length: 1 };
    offset += 2;
    if (spsCount > 0) {
        const spsLength = view.getUint16(offset);
        box.details['sps_1_length'] = { value: spsLength, offset: box.offset + offset, length: 2 };
        offset += 2;
        box.details['sps_1_nal_unit'] = { value: `... ${spsLength} bytes`, offset: box.offset + offset, length: spsLength };
        offset += spsLength;
    }
    const ppsCount = view.getUint8(offset);
    box.details['numOfPictureParameterSets'] = { value: ppsCount, offset: box.offset + offset, length: 1 };
}

export const avccTooltip = {
    avcC: {
        name: 'AVC Configuration',
        text: 'Contains the decoder configuration information for an H.264/AVC video track, including SPS and PPS.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
    'avcC@AVCProfileIndication': {
        text: 'Specifies the profile to which the stream conforms (e.g., 66=Baseline, 77=Main, 100=High).',
        ref: 'ISO/IEC 14496-10',
    },
    'avcC@AVCLevelIndication': {
        text: 'Specifies the level to which the stream conforms.',
        ref: 'ISO/IEC 14496-10',
    },
};