import { BoxParser } from '../utils.js';

/**
 * Parses the Dolby Vision Configuration Box.
 * Handles both 'dvcC' (version 1, profiles <= 7) and 'dvvC' (version 2, profiles >= 8).
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseDvcc(box, view) {
    const p = new BoxParser(box, view);

    const versionMajor = p.readUint8('dv_version_major');
    const versionMinor = p.readUint8('dv_version_minor');

    if (versionMajor === null || versionMinor === null) {
        p.finalize();
        return;
    }

    const profile = p.readUint8('dv_profile');
    const level = p.readUint8('dv_level');

    p.readUint8('rpu_present_flag');
    p.readUint8('el_present_flag');
    p.readUint8('bl_present_flag');

    // Parsing logic differences based on version/profile
    // Profiles > 7 use 'dvvC' (v2.0), others 'dvcC' (v1.0)
    // However, the box structure is largely backward compatible for the header.
    // The 'bl_signal_compatibility_id' is critical for Profile 8 (backward compatibility).

    const compatibilityByte = p.readUint8('compatibility_id_raw');
    if (compatibilityByte !== null) {
        // In 'dvcC' this byte is reserved (0), in 'dvvC' it is the compatibility ID (4 bits)
        // We extract it if the major version indicates v2 or if profile is >= 8
        if (versionMajor >= 2 || (profile && profile >> 1 >= 8)) {
            box.details['compatibility_id_raw'].internal = true;
            box.details['dv_bl_signal_compatibility_id'] = {
                value: (compatibilityByte >> 4) & 0x0f,
                offset: box.details['compatibility_id_raw'].offset,
                length: 0.5,
            };
            box.details['reserved_bits'] = {
                value: compatibilityByte & 0x0f,
                offset: box.details['compatibility_id_raw'].offset,
                length: 0.5,
                internal: true,
            };
        } else {
            // Just reserved
        }
    }

    // Normalize profile/level for display (bit shifting logic depends on specific spec version,
    // but usually these are 7-bit values packed into the byte)
    if (profile !== null) {
        // Profile is 7 bits
        const profileVal = profile >> 1;
        box.details['dv_profile'].value = `${profileVal} (Raw: ${profile})`;
    }
    if (level !== null) {
        // Level is 6 bits
        const levelVal = level >> 2;
        box.details['dv_level'].value = `${levelVal} (Raw: ${level})`;
    }

    p.finalize();
}

export const dvccTooltip = {
    dvcC: {
        name: 'Dolby Vision Configuration Box (v1)',
        text: 'Dolby Vision Configuration Box (`dvcC`). Contains configuration data for Dolby Vision content with Profiles ≤ 7. It defines the profile, level, and presence of enhancement layers.',
        ref: 'ETSI GS TS 103 596 / Dolby Vision Streams within ISO Base Media File Format',
    },
    dvvC: {
        name: 'Dolby Vision Configuration Box (v2)',
        text: 'Dolby Vision Configuration Box (`dvvC`). Used for Dolby Vision Profiles ≥ 8. It includes the `bl_signal_compatibility_id` to indicate backward compatibility with SDR or HDR10.',
        ref: 'Dolby Vision Streams within ISO Base Media File Format v2.0',
    },
    'dvcC@dv_version_major': {
        text: 'Major version of the Dolby Vision configuration.',
        ref: 'Dolby Vision Spec',
    },
    'dvcC@dv_profile': {
        text: 'The Dolby Vision profile ID (e.g., 5, 8). Profile 5 is proprietary IPTPQ, Profile 8 is backward compatible (HLG/PQ).',
        ref: 'Dolby Vision Profiles and Levels',
    },
    'dvcC@dv_level': {
        text: 'The Dolby Vision level ID, indicating resolution and bitrate tiers.',
        ref: 'Dolby Vision Profiles and Levels',
    },
    'dvcC@rpu_present_flag': {
        text: 'If 1, indicates that Reference Picture Unit (RPU) metadata is present in the stream.',
        ref: 'Dolby Vision Spec',
    },
    'dvcC@el_present_flag': {
        text: 'If 1, indicates that an Enhancement Layer (EL) is present.',
        ref: 'Dolby Vision Spec',
    },
    'dvcC@bl_present_flag': {
        text: 'If 1, indicates that a Base Layer (BL) is present.',
        ref: 'Dolby Vision Spec',
    },
    'dvcC@dv_bl_signal_compatibility_id': {
        text: 'Indicates the backward compatibility of the base layer. 0=None, 1=HDR10 (PQ), 2=SDR (BT.709), 4=HLG.',
        ref: 'Dolby Vision Spec',
    },
    // Aliases for dvvC
    'dvvC@dv_profile': {
        text: 'The Dolby Vision profile ID (e.g., 5, 8).',
        ref: 'Dolby Vision Profiles and Levels',
    },
    'dvvC@dv_bl_signal_compatibility_id': {
        text: 'Indicates the backward compatibility. Critical for Profile 8.1 (HDR10) vs 8.4 (HLG).',
        ref: 'Dolby Vision Spec',
    },
};
