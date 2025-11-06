import { BoxParser } from '../utils.js';

const SCHM_FLAGS_SCHEMA = {
    0x000001: 'scheme_uri_present',
};

/**
 * Parses the 'schm' (Scheme Type) box.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseSchm(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags(SCHM_FLAGS_SCHEMA);
    const flags = box.details.flags.value;

    if (flags === null) {
        p.finalize();
        return;
    }

    p.readString(4, 'scheme_type');

    const schemeVersion = p.readUint32('scheme_version_raw');
    if (schemeVersion !== null) {
        box.details['scheme_version'] = {
            value: `0x${schemeVersion.toString(16)}`,
            offset: box.details['scheme_version_raw'].offset,
            length: 4,
        };
        delete box.details['scheme_version_raw'];
    }

    if (flags.scheme_uri_present) {
        p.readNullTerminatedString('scheme_uri');
    }

    p.finalize();
}

export const schmTooltip = {
    schm: {
        name: 'Scheme Type Box',
        text: 'Scheme Type Box (`schm`). Identifies the protection scheme used for the encrypted track (e.g., "cenc" for Common Encryption, "cbc1", "cbs1"). This box is a critical part of the DRM signaling within the `sinf` box.',
        ref: 'ISO/IEC 14496-12, 8.12.5',
    },
    'schm@flags': {
        text: "A bitfield where the `scheme_uri_present` flag indicates if a URL pointing to the scheme's specification is included.",
        ref: 'ISO/IEC 14496-12, 8.12.5.2',
    },
    'schm@scheme_type': {
        text: 'A four-character code identifying the protection scheme. "cenc" is the most common value for Common Encryption.',
        ref: 'ISO/IEC 14496-12, 8.12.5.3',
    },
    'schm@scheme_version': {
        text: 'The version of the scheme that was used to create the content, allowing for evolution of protection schemes.',
        ref: 'ISO/IEC 14496-12, 8.12.5.3',
    },
    'schm@scheme_uri': {
        text: 'An optional, null-terminated URI that points to a human-readable page describing the protection scheme.',
        ref: 'ISO/IEC 14496-12, 8.12.5.3',
    },
};
