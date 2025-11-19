import { BoxParser } from '../utils.js';

/**
 * Parses the 'hvcC' (HEVC Configuration) box.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseHvcC(box, view) {
    const p = new BoxParser(box, view);

    p.readUint8('configurationVersion');

    const profileByte = p.readUint8('profile_byte_raw');
    if (profileByte !== null) {
        box.details['profile_byte_raw'].internal = true;
        box.details.general_profile_space = {
            value: (profileByte >> 6) & 0x03,
            offset: box.details.profile_byte_raw.offset,
            length: 0.25,
        };
        box.details.general_tier_flag = {
            value: (profileByte >> 5) & 0x01,
            offset: box.details.profile_byte_raw.offset,
            length: 0.125,
        };
        box.details.general_profile_idc = {
            value: profileByte & 0x1f,
            offset: box.details.profile_byte_raw.offset,
            length: 0.625,
        };
    }

    p.readUint32('general_profile_compatibility_flags');

    if (p.checkBounds(6)) {
        const bytes = [];
        for (let i = 0; i < 6; i++) {
            bytes.push(
                p.view
                    .getUint8(p.offset + i)
                    .toString(16)
                    .padStart(2, '0')
            );
        }
        box.details.general_constraint_indicator_flags = {
            value: `0x${bytes.join('')}`,
            offset: box.offset + p.offset,
            length: 6,
        };
        p.offset += 6;
    }

    p.readUint8('general_level_idc');

    const minSpatialByte = p.readUint16('min_spatial_byte_raw');
    if (minSpatialByte !== null) {
        box.details.min_spatial_byte_raw.internal = true;
        box.details.min_spatial_segmentation_idc = {
            value: minSpatialByte & 0x0fff,
            offset: box.details.min_spatial_byte_raw.offset,
            length: 1.5,
        };
    }

    const parallelismByte = p.readUint8('parallelism_byte_raw');
    if (parallelismByte !== null) {
        box.details.parallelism_byte_raw.internal = true;
        box.details.parallelismType = {
            value: parallelismByte & 0x03,
            offset: box.details.parallelism_byte_raw.offset,
            length: 0.25,
        };
    }

    const chromaFormatByte = p.readUint8('chroma_format_byte_raw');
    if (chromaFormatByte !== null) {
        box.details.chroma_format_byte_raw.internal = true;
        box.details.chroma_format_idc = {
            value: chromaFormatByte & 0x03,
            offset: box.details.chroma_format_byte_raw.offset,
            length: 0.25,
        };
    }

    const bitDepthLumaByte = p.readUint8('bit_depth_luma_byte_raw');
    if (bitDepthLumaByte !== null) {
        box.details.bit_depth_luma_byte_raw.internal = true;
        box.details.bit_depth_luma_minus8 = {
            value: bitDepthLumaByte & 0x07,
            offset: box.details.bit_depth_luma_byte_raw.offset,
            length: 0.375,
        };
    }

    const bitDepthChromaByte = p.readUint8('bit_depth_chroma_byte_raw');
    if (bitDepthChromaByte !== null) {
        box.details.bit_depth_chroma_byte_raw.internal = true;
        box.details.bit_depth_chroma_minus8 = {
            value: bitDepthChromaByte & 0x07,
            offset: box.details.bit_depth_chroma_byte_raw.offset,
            length: 0.375,
        };
    }

    p.readUint16('avgFrameRate');

    const frameRateByte = p.readUint8('frame_rate_byte_raw');
    if (frameRateByte !== null) {
        box.details.frame_rate_byte_raw.internal = true;
        box.details.constantFrameRate = {
            value: (frameRateByte >> 6) & 0x03,
            offset: box.details.frame_rate_byte_raw.offset,
            length: 0.25,
        };
        box.details.numTemporalLayers = {
            value: (frameRateByte >> 3) & 0x07,
            offset: box.details.frame_rate_byte_raw.offset,
            length: 0.375,
        };
        box.details.temporalIdNested = {
            value: (frameRateByte >> 2) & 0x01,
            offset: box.details.frame_rate_byte_raw.offset,
            length: 0.125,
        };
        box.details.lengthSizeMinusOne = {
            value: frameRateByte & 0x03,
            offset: box.details.frame_rate_byte_raw.offset,
            length: 0.25,
        };
    }

    const numOfArrays = p.readUint8('numOfArrays');
    box.nal_unit_arrays = [];
    if (numOfArrays !== null) {
        for (let i = 0; i < numOfArrays; i++) {
            if (p.stopped) break;

            const arrayByte = p.readUint8(`nal_array_${i}_byte_raw`);
            if (arrayByte === null) break;
            box.details[`nal_array_${i}_byte_raw`].internal = true;

            const array_completeness = (arrayByte >> 7) & 1;
            const NAL_unit_type = arrayByte & 0x3f;

            const nalArray = {
                array_completeness,
                NAL_unit_type,
                nal_units: [],
            };

            const numNalus = p.readUint16(`nal_array_${i}_num_nalus`);
            if (numNalus === null) break;
            box.details[`nal_array_${i}_num_nalus`].internal = true;

            for (let j = 0; j < numNalus; j++) {
                if (p.stopped) break;
                const nalUnitLength = p.readUint16(`nal_${i}_${j}_length`);
                if (nalUnitLength === null) break;
                box.details[`nal_${i}_${j}_length`].internal = true;

                if (p.checkBounds(nalUnitLength)) {
                    const nalUnit = new Uint8Array(
                        p.view.buffer,
                        p.view.byteOffset + p.offset,
                        nalUnitLength
                    );
                    nalArray.nal_units.push({
                        length: nalUnitLength,
                        data: nalUnit,
                    });
                    p.skip(nalUnitLength, `nal_${i}_${j}_data`);
                    box.details[`nal_${i}_${j}_data`].internal = true;
                }
            }
            box.nal_unit_arrays.push(nalArray);
        }
    }

    p.finalize();
}

export const hvcCTooltip = {
    hvcC: {
        name: 'HEVC Decoder Configuration Record',
        text: 'HEVC Configuration Box (`hvcC`). Contains the essential Video Parameter Set (VPS), Sequence Parameter Set (SPS), and Picture Parameter Set (PPS) required by an H.265/HEVC decoder to initialize and decode the video stream.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@configurationVersion': {
        text: 'The version of the hvcC record. Must be 1.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@general_profile_space': {
        text: 'Specifies the context for the interpretation of general_profile_idc and other profile-related syntax elements.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@general_tier_flag': {
        text: 'Specifies the tier context for the interpretation of general_level_idc. 0 for Main tier, 1 for High tier.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@general_profile_idc': {
        text: 'Specifies the profile to which the bitstream conforms.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@general_profile_compatibility_flags': {
        text: 'A bitfield indicating compatibility with a set of profiles.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@general_constraint_indicator_flags': {
        text: 'A 48-bit field specifying constraints on the bitstream.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@general_level_idc': {
        text: 'Specifies the level to which the bitstream conforms, defining limits on parameters like resolution and bitrate.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@min_spatial_segmentation_idc': {
        text: 'Specifies the minimum spatial segmentation. A value of 0 indicates no constraint.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@parallelismType': {
        text: 'Indicates the type of parallelism used in encoding (e.g., 0 for mixed-type, 1 for slice-based, 2 for tile-based).',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@chroma_format_idc': {
        text: 'The chroma sampling format (e.g., 1 for 4:2:0, 2 for 4:2:2, 3 for 4:4:4).',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@bit_depth_luma_minus8': {
        text: 'The bit depth of the luma samples minus 8 (e.g., 0 for 8-bit, 2 for 10-bit).',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@bit_depth_chroma_minus8': {
        text: 'The bit depth of the chroma samples minus 8.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@avgFrameRate': {
        text: 'The average frame rate in frames per 256 seconds. A value of 0 indicates an unspecified frame rate.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@constantFrameRate': {
        text: 'Indicates if the frame rate is constant (1), or variable (2).',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@numTemporalLayers': {
        text: 'The number of temporal layers present in the bitstream.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@temporalIdNested': {
        text: 'Indicates if temporal sub-layer access is supported.',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@lengthSizeMinusOne': {
        text: 'The number of bytes used to specify the length of each NAL unit minus one (e.g., 3 for 4-byte length fields).',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
    'hvcC@numOfArrays': {
        text: 'The number of arrays of NAL units that follow (e.g., one array for VPS, one for SPS, one for PPS).',
        ref: 'ISO/IEC 14496-15, 8.3.3.1.2',
    },
};
