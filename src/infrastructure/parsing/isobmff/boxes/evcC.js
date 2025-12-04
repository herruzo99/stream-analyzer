import { BoxParser } from '../utils.js';

/**
 * Parses the 'evcC' (EVC Configuration) box.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseEvcC(box, view) {
    const p = new BoxParser(box, view);

    p.readUint8('configurationVersion');

    const byte1 = p.readUint8('profile_level_raw');
    if (byte1 !== null) {
        box.details['profile_idc'] = {
            value: byte1,
            offset: box.details.profile_level_raw.offset,
            length: 1,
        };
        delete box.details.profile_level_raw;
    }

    p.readUint8('level_idc');
    p.readUint8('toolset_idc_h');
    p.readUint8('toolset_idc_l');

    const byte4 = p.readUint8('chroma_format_idc_raw');
    if (byte4 !== null) {
        box.details.chroma_format_idc = {
            value: (byte4 >> 6) & 3,
            offset: box.details.chroma_format_idc_raw.offset,
            length: 0.25,
        };
        box.details.bit_depth_minus8 = {
            value: (byte4 >> 3) & 7,
            offset: box.details.chroma_format_idc_raw.offset,
            length: 0.375,
        };
        delete box.details.chroma_format_idc_raw;
    }

    p.readUint16('reserved');

    const numArrays = p.readUint8('num_of_arrays');
    if (numArrays !== null) {
        box.nal_arrays = [];
        for (let i = 0; i < numArrays; i++) {
            const arrayByte = p.readUint8(`array_${i}_header`);
            if (!arrayByte) break;

            const nal_unit_type = arrayByte & 0x3f;
            const numNalus = p.readUint16(`array_${i}_num_nalus`);
            const currentArray = { nal_unit_type, nalus: [] };

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

    p.finalize();
}

export const evcCTooltip = {
    evcC: {
        name: 'EVC Decoder Configuration Record',
        text: 'EVC Configuration Box (`evcC`). Contains parameters for the EVC decoder, including Profile, Level, and toolset configuration.',
        ref: 'ISO/IEC 14496-15',
    },
    'evcC@profile_idc': {
        text: 'EVC Profile Indication (0=Baseline, 1=Main).',
        ref: 'ISO/IEC 23094-1',
    },
    'evcC@level_idc': {
        text: 'EVC Level Indication.',
        ref: 'ISO/IEC 23094-1',
    },
    'evcC@chroma_format_idc': {
        text: 'Chroma format (1 = 4:2:0).',
        ref: 'ISO/IEC 23094-1',
    },
};
