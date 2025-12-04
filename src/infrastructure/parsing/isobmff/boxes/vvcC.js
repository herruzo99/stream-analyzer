import { BoxParser } from '../utils.js';

/**
 * Parses the 'vvcC' (VVC Configuration) box.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseVvcC(box, view) {
    const p = new BoxParser(box, view);

    // Header
    const byte0 = p.readUint8('reserved_and_lengthSizeMinusOne');
    if (byte0 !== null) {
        box.details['reserved_header'] = {
            value: (byte0 >> 3) & 0x1f, // top 5 bits reserved
            offset: box.details.reserved_and_lengthSizeMinusOne.offset,
            length: 0.625,
            internal: true,
        };
        box.details['lengthSizeMinusOne'] = {
            value: byte0 & 0x07,
            offset: box.details.reserved_and_lengthSizeMinusOne.offset,
            length: 0.375,
        };
        delete box.details.reserved_and_lengthSizeMinusOne;
    }

    const byte1 = p.readUint8('ptl_present_flag_raw');
    if (byte1 !== null) {
        box.details.ptl_present_flag = {
            value: (byte1 >> 7) & 1,
            offset: box.details.ptl_present_flag_raw.offset,
            length: 0.125,
        };
        delete box.details.ptl_present_flag_raw;
    }

    if (box.details.ptl_present_flag?.value === 1) {
        p.readUint16('ols_idx');
        p.readUint8('num_sublayers');
        p.readUint8('constant_frame_rate');
        p.readUint16('chroma_format_idc');
        p.readUint16('bit_depth_minus8');
        p.readRemainingBytes('native_ptl_info'); // Simplify complex PTL parsing for now
    }

    // Array parsing similar to HEVC but for VVC NAL types
    // Only parsing structure if remaining bytes allow
    if (!p.stopped && p.offset < box.size) {
        const numArrays = p.readUint8('num_of_arrays');
        if (numArrays !== null) {
            box.nal_arrays = [];
            for (let i = 0; i < numArrays; i++) {
                const arrayByte = p.readUint8(`array_${i}_header`);
                if (!arrayByte) break;

                const array_completeness = (arrayByte >> 7) & 1;
                const nal_unit_type = arrayByte & 0x1f;

                const numNalus = p.readUint16(`array_${i}_num_nalus`);
                const currentArray = {
                    array_completeness,
                    nal_unit_type,
                    nalus: [],
                };

                for (let j = 0; j < (numNalus || 0); j++) {
                    const len = p.readUint16(`nal_${i}_${j}_len`);
                    if (len) {
                        p.skip(len, `nal_${i}_${j}_data`);
                        currentArray.nalus.push({ length: len });
                    }
                }
                box.nal_arrays.push(currentArray);
            }
        }
    }

    p.finalize();
}

export const vvcCTooltip = {
    vvcC: {
        name: 'VVC Decoder Configuration Record',
        text: 'VVC Configuration Box (`vvcC`). Contains parameters for the VVC decoder, including Profile, Tier, Level (PTL) information and parameter set arrays (VPS, SPS, PPS).',
        ref: 'ISO/IEC 14496-15',
    },
    'vvcC@lengthSizeMinusOne': {
        text: 'The length in bytes of the NALUnitLength field minus one. (e.g., value 3 indicates 4-byte length fields).',
        ref: 'ISO/IEC 14496-15',
    },
    'vvcC@ptl_present_flag': {
        text: 'Indicates if profile, tier, and level information is present in this configuration record.',
        ref: 'ISO/IEC 14496-15',
    },
    'vvcC@num_sublayers': {
        text: 'The number of temporal sub-layers encoded in the stream.',
        ref: 'ISO/IEC 14496-15',
    },
};
