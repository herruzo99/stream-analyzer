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
    'avcC@sps_1_decoded_resolution': {
        text: 'The video resolution (width x height) decoded from the Sequence Parameter Set.',
        ref: 'ISO/IEC 14496-10, 7.3.2.1.1',
    },
};
