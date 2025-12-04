import { parseSPS } from '../../video/sps.js';
import { BoxParser } from '../utils.js';

/**
 * Parses the 'avcC' (AVC Configuration) box.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseAvcc(box, view) {
    const p = new BoxParser(box, view);

    p.readUint8('configurationVersion');
    const profile = p.readUint8('AVCProfileIndication');
    p.readUint8('profile_compatibility');
    p.readUint8('AVCLevelIndication');

    const lengthSizeByte = p.readUint8('length_size_byte');
    if (lengthSizeByte !== null) {
        box.details['length_size_byte'].internal = true;
        box.details['lengthSizeMinusOne'] = {
            value: lengthSizeByte & 0x03,
            offset: box.offset + p.offset - 1,
            length: 0.25,
        };
        box.details['reserved_6_bits'] = {
            value: (lengthSizeByte >> 2) & 0x3f,
            offset: box.offset + p.offset - 1,
            length: 0.75,
            internal: true,
        };
    }

    const spsCountByte = p.readUint8('sps_count_byte');
    if (spsCountByte !== null) {
        box.details['sps_count_byte'].internal = true;

        const spsCount = spsCountByte & 0x1f;
        box.details['numOfSequenceParameterSets'] = {
            value: spsCount,
            offset: box.offset + p.offset - 1,
            length: 0.625,
        };
        box.details['reserved_3_bits'] = {
            value: (spsCountByte >> 5) & 0x07,
            offset: box.offset + p.offset - 1,
            length: 0.375,
            internal: true,
        };

        box.spsList = [];
        for (let i = 0; i < spsCount; i++) {
            const spsLengthField = `sps_length_${i}`;
            const spsLength = p.readUint16(spsLengthField);
            if (spsLength === null) break;
            box.details[spsLengthField].internal = true;

            const spsStartOffset = p.offset;
            if (p.checkBounds(spsLength)) {
                const spsNalUnit = new Uint8Array(
                    p.view.buffer,
                    p.view.byteOffset + spsStartOffset,
                    spsLength
                );
                const parsedSPS = parseSPS(spsNalUnit);

                const spsEntry = {
                    length: spsLength,
                    nal_unit_bytes: spsNalUnit,
                    parsed: parsedSPS, // Store full parsed object including HRD
                };

                if (parsedSPS) {
                    spsEntry.decoded_profile = parsedSPS.profile_idc;
                    spsEntry.decoded_level = parsedSPS.level_idc;
                    spsEntry.decoded_resolution = parsedSPS.resolution;
                }

                box.spsList.push(spsEntry);
                p.skip(spsLength, `sps_nal_unit_${i}`);
                box.details[`sps_nal_unit_${i}`].internal = true;
            }
        }
    }

    const ppsCount = p.readUint8('numOfPictureParameterSets');
    if (ppsCount !== null) {
        box.ppsList = [];
        for (let i = 0; i < ppsCount; i++) {
            const ppsLengthField = `pps_length_${i}`;
            const ppsLength = p.readUint16(ppsLengthField);
            if (ppsLength === null) break;
            box.details[ppsLengthField].internal = true;

            if (p.checkBounds(ppsLength)) {
                const ppsNalUnit = new Uint8Array(
                    p.view.buffer,
                    p.view.byteOffset + p.offset,
                    ppsLength
                );
                box.ppsList.push({
                    length: ppsLength,
                    nal_unit_bytes: ppsNalUnit,
                });
                p.skip(ppsLength, `pps_nal_unit_${i}`);
                box.details[`pps_nal_unit_${i}`].internal = true;
            }
        }
    }

    if (
        p.offset < box.size &&
        (profile === 100 ||
            profile === 110 ||
            profile === 122 ||
            profile === 144)
    ) {
        p.readRemainingBytes('profile_specific_extensions');
    }

    p.finalize();
}

export const avccTooltip = {
    avcC: {
        name: 'AVC Decoder Configuration Record',
        text: 'AVC Configuration Box (`avcC`). Contains the essential Sequence Parameter Sets (SPS) and Picture Parameter Sets (PPS) required by an H.264/AVC decoder to initialize and decode the video stream.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
    'avcC@configurationVersion': {
        text: 'The version of the avcC record. Must be 1.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
    'avcC@AVCProfileIndication': {
        text: 'Specifies the AVC profile the stream conforms to (e.g., 66 for Baseline, 77 for Main, 100 for High). This determines the set of coding features used.',
        ref: 'ISO/IEC 14496-10',
    },
    'avcC@profile_compatibility': {
        text: 'A bitfield indicating compatibility with a set of profiles, used by the decoder to ensure it can handle all coding tools present in the stream.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
    'avcC@AVCLevelIndication': {
        text: 'Specifies the AVC level, which defines constraints on parameters like resolution, frame rate, and bitrate.',
        ref: 'ISO/IEC 14496-10',
    },
    'avcC@lengthSizeMinusOne': {
        text: 'Defines the number of bytes used to specify the length of each NAL unit in the samples (e.g., a value of 3 means 4 bytes). Critical for parsing the sample data.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
    'avcC@numOfSequenceParameterSets': {
        text: 'The number of Sequence Parameter Set (SPS) NAL units that follow. Typically 1.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
    'avcC@sps_1_length': {
        text: 'The length in bytes of the first SPS NAL unit.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
    'avcC@sps_1_nal_unit': {
        text: 'The raw bytes of the first Sequence Parameter Set (SPS) NAL unit. Contains high-level encoding parameters like profile, level, and resolution.',
        ref: 'ISO/IEC 14496-10, 7.3.2.1',
    },
    'avcC@numOfPictureParameterSets': {
        text: 'The number of Picture Parameter Set (PPS) NAL units that follow. Typically 1.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
    'avcC@pps_1_length': {
        text: 'The length in bytes of the first PPS NAL unit.',
        ref: 'ISO/IEC 14496-15, 5.3.3.1.2',
    },
    'avcC@pps_1_nal_unit': {
        text: 'The raw bytes of the first Picture Parameter Set (PPS) NAL unit. Contains parameters that apply to a sequence of pictures, like entropy coding mode.',
        ref: 'ISO/IEC 14496-10, 7.3.2.2',
    },
    'avcC@sps_1_decoded_profile': {
        text: 'The profile_idc decoded from the SPS NAL unit. This should match AVCProfileIndication.',
        ref: 'ISO/IEC 14496-10, 7.3.2.1.1',
    },
    'avcC@sps_1_decoded_level': {
        text: 'The level_idc decoded from the SPS NAL unit. This should match AVCLevelIndication.',
        ref: 'ISO/IEC 14496-10, 7.3.2.1.1',
    },
    'avcC@sps_1_decoded_resolution': {
        text: 'The video resolution (width x height) decoded from the Sequence Parameter Set.',
        ref: 'ISO/IEC 14496-10, 7.3.2.1.1',
    },
};
