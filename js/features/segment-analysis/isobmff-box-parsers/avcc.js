/**
 * Parses the 'avcC' (AVC Configuration) box.
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseAvcc(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    box.details['configurationVersion'] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 1;
    box.details['AVCProfileIndication'] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 1;
    box.details['profile_compatibility'] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 1;
    box.details['AVCLevelIndication'] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 1;

    const spsByte = view.getUint8(currentParseOffset);
    box.details['lengthSizeMinusOne'] = { value: (spsByte >> 5) & 0x03, offset: box.offset + currentParseOffset, length: 1 };
    box.details['reserved_1'] = { value: (spsByte >> 5) & 0x07, offset: box.offset + currentParseOffset, length: 1 };
    const spsCount = spsByte & 0x1F; 
    box.details['numOfSequenceParameterSets'] = { value: spsCount, offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 1;

    for (let i = 0; i < spsCount; i++) {
        const spsLength = view.getUint16(currentParseOffset);
        box.details[`sps_${i+1}_length`] = { value: spsLength, offset: box.offset + currentParseOffset, length: 2 };
        currentParseOffset += 2;
        box.details[`sps_${i+1}_nal_unit`] = { value: `... ${spsLength} bytes`, offset: box.offset + currentParseOffset, length: spsLength };
        currentParseOffset += spsLength;
    }
    
    const ppsCount = view.getUint8(currentParseOffset);
    box.details['numOfPictureParameterSets'] = { value: ppsCount, offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 1;

    for (let i = 0; i < ppsCount; i++) {
        const ppsLength = view.getUint16(currentParseOffset);
        box.details[`pps_${i+1}_length`] = { value: ppsLength, offset: box.offset + currentParseOffset, length: 2 };
        currentParseOffset += 2;
        box.details[`pps_${i+1}_nal_unit`] = { value: `... ${ppsLength} bytes`, offset: box.offset + currentParseOffset, length: ppsLength };
        currentParseOffset += ppsLength;
    }
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
    'avcC@configurationVersion': {
        text: 'The version of the AVC profile and level indication.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
    'avcC@profile_compatibility': {
        text: 'Flags that indicate compatibility of the stream with AVC profiles.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
    'avcC@numOfSequenceParameterSets': {
        text: 'The number of Sequence Parameter Sets (SPS) in this configuration.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
    'avcC@sps_1_length': {
        text: 'The length in bytes of the first SPS NAL unit.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
    'avcC@sps_1_nal_unit': {
        text: 'The raw bytes of the first SPS NAL unit.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
    'avcC@numOfPictureParameterSets': {
        text: 'The number of Picture Parameter Sets (PPS) in this configuration.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
};