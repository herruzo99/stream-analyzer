import { BoxParser } from '../utils.js';

/**
 * Parses the 'av1C' (AV1 Codec Configuration) box.
 * Reference: AV1 Codec ISO Media File Format Binding
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseAv1C(box, view) {
    const p = new BoxParser(box, view);

    const byte0 = p.readUint8('marker_version_raw');
    if (byte0 !== null) {
        box.details['marker_version_raw'].internal = true;
        // marker is top bit, must be 1
        box.details['version'] = {
            value: byte0 & 0x7f,
            offset: box.details['marker_version_raw'].offset,
            length: 0.875,
        };
    }

    const byte1 = p.readUint8('seq_profile_level_tier_raw');
    if (byte1 !== null) {
        box.details['seq_profile_level_tier_raw'].internal = true;
        box.details['seq_profile'] = {
            value: (byte1 >> 5) & 0x07,
            offset: box.details['seq_profile_level_tier_raw'].offset,
            length: 0.375,
        };
        box.details['seq_level_idx_0'] = {
            value: byte1 & 0x1f,
            offset: box.details['seq_profile_level_tier_raw'].offset,
            length: 0.625,
        };
    }

    const byte2 = p.readUint8('bits_flags_raw');
    if (byte2 !== null) {
        box.details['bits_flags_raw'].internal = true;
        box.details['seq_tier_0'] = {
            value: (byte2 >> 7) & 1,
            offset: box.details['bits_flags_raw'].offset,
            length: 0.125,
        };
        box.details['high_bitdepth'] = {
            value: (byte2 >> 6) & 1,
            offset: box.details['bits_flags_raw'].offset,
            length: 0.125,
        };
        box.details['twelve_bit'] = {
            value: (byte2 >> 5) & 1,
            offset: box.details['bits_flags_raw'].offset,
            length: 0.125,
        };
        box.details['monochrome'] = {
            value: (byte2 >> 4) & 1,
            offset: box.details['bits_flags_raw'].offset,
            length: 0.125,
        };
        box.details['chroma_subsampling_x'] = {
            value: (byte2 >> 3) & 1,
            offset: box.details['bits_flags_raw'].offset,
            length: 0.125,
        };
        box.details['chroma_subsampling_y'] = {
            value: (byte2 >> 2) & 1,
            offset: box.details['bits_flags_raw'].offset,
            length: 0.125,
        };
        box.details['chroma_sample_position'] = {
            value: byte2 & 0x03,
            offset: box.details['bits_flags_raw'].offset,
            length: 0.25,
        };
    }

    // reserved 3 bits + initial_presentation_delay_present (1) + initial_presentation_delay_minus_one (4)
    const byte3 = p.readUint8('presentation_delay_raw');
    if (byte3 !== null) {
        box.details['presentation_delay_raw'].internal = true;
        const present = (byte3 >> 4) & 1;
        box.details['initial_presentation_delay_present'] = {
            value: present,
            offset: box.details['presentation_delay_raw'].offset,
            length: 0.125,
        };
        if (present) {
            box.details['initial_presentation_delay_minus_one'] = {
                value: byte3 & 0x0f,
                offset: box.details['presentation_delay_raw'].offset,
                length: 0.5,
            };
        }
    }

    // configOBUs (remaining bytes)
    p.readRemainingBytes('configOBUs');

    p.finalize();
}

export const av1CTooltip = {
    av1C: {
        name: 'AV1 Codec Configuration Box',
        text: 'AV1 Codec Configuration Box (`av1C`). Contains setup information for the AV1 decoder, including profile, level, tier, and bit depth.',
        ref: 'AV1 Codec ISO Media File Format Binding, Section 2.3',
    },
    'av1C@seq_profile': {
        text: 'Specifies the AV1 profile. 0=Main, 1=High, 2=Professional.',
        ref: 'AV1 Bitstream Specification',
    },
    'av1C@seq_level_idx_0': {
        text: 'Specifies the level index for the sequence, determining max resolution and bitrate.',
        ref: 'AV1 Bitstream Specification',
    },
    'av1C@seq_tier_0': {
        text: 'Specifies the tier for the sequence. 0=Main Tier, 1=High Tier.',
        ref: 'AV1 Bitstream Specification',
    },
    'av1C@high_bitdepth': {
        text: 'If 1, the bit depth is greater than 8.',
        ref: 'AV1 Bitstream Specification',
    },
    'av1C@twelve_bit': {
        text: 'If 1, the bit depth is 12. If 0 and high_bitdepth is 1, the bit depth is 10.',
        ref: 'AV1 Bitstream Specification',
    },
    'av1C@configOBUs': {
        text: 'Contains zero or more Open Bitstream Units (OBUs), typically the Sequence Header OBU.',
        ref: 'AV1 ISOBMFF Binding',
    },
};
