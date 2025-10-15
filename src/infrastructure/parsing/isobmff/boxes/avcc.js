import { BoxParser } from '../utils.js';
import { parseSPS } from './sps.js';

/**
 * Parses the 'avcC' (AVC Configuration) box.
 * @param {import('../parser.js').Box} box
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
        delete box.details['length_size_byte'];
        box.details['lengthSizeMinusOne'] = {
            value: lengthSizeByte & 0x03,
            offset: box.offset + p.offset - 1,
            length: 0.25,
        };
        box.details['reserved_6_bits'] = {
            value: (lengthSizeByte >> 2) & 0x3f,
            offset: box.offset + p.offset - 1,
            length: 0.75,
        };
    }

    const spsCountByte = p.readUint8('sps_count_byte');
    if (spsCountByte !== null) {
        delete box.details['sps_count_byte'];

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
        };

        for (let i = 0; i < spsCount; i++) {
            const spsLength = p.readUint16(`sps_${i + 1}_length`);
            if (spsLength === null) break;

            const spsStartOffset = p.offset;
            if (p.checkBounds(spsLength)) {
                const spsNalUnit = new Uint8Array(
                    p.view.buffer,
                    p.view.byteOffset + spsStartOffset,
                    spsLength
                );
                const parsedSPS = parseSPS(spsNalUnit);
                if (parsedSPS) {
                    box.details[`sps_${i + 1}_decoded_profile`] = {
                        value: parsedSPS.profile_idc,
                        offset: 0,
                        length: 0,
                    };
                    box.details[`sps_${i + 1}_decoded_level`] = {
                        value: parsedSPS.level_idc,
                        offset: 0,
                        length: 0,
                    };
                    box.details[`sps_${i + 1}_decoded_resolution`] = {
                        value: parsedSPS.resolution,
                        offset: 0,
                        length: 0,
                    };
                }
                p.skip(spsLength, `sps_${i + 1}_nal_unit`);
            }
        }
    }

    const ppsCount = p.readUint8('numOfPictureParameterSets');
    if (ppsCount !== null) {
        for (let i = 0; i < ppsCount; i++) {
            const ppsLength = p.readUint16(`pps_${i + 1}_length`);
            if (ppsLength === null) break;
            p.skip(ppsLength, `pps_${i + 1}_nal_unit`);
        }
    }

    if (
        p.offset < box.size &&
        (profile === 100 ||
            profile === 110 ||
            profile === 122 ||
            profile === 144)
    ) {
        // Handle profile-specific extensions, skipping for now to keep focus
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