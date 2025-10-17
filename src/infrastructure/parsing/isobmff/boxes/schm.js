import { BoxParser } from '../utils.js';

const SCHM_FLAGS_SCHEMA = {
    0x000001: 'scheme_uri_present',
};

/**
 * Parses the 'schm' (Scheme Type) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSchm(box, view) {
    const p = new BoxParser(box, view);

    if (!p.checkBounds(4)) {
        p.finalize();
        return;
    }
    const versionAndFlags = p.view.getUint32(p.offset);
    const version = versionAndFlags >> 24;
    const flagsInt = versionAndFlags & 0x00ffffff;

    const decodedFlags = {};
    for (const mask in SCHM_FLAGS_SCHEMA) {
        decodedFlags[SCHM_FLAGS_SCHEMA[mask]] =
            (flagsInt & parseInt(mask, 16)) !== 0;
    }

    p.box.details['version'] = {
        value: version,
        offset: p.box.offset + p.offset,
        length: 1,
    };
    p.box.details['flags_raw'] = {
        value: `0x${flagsInt.toString(16).padStart(6, '0')}`,
        offset: p.box.offset + p.offset + 1,
        length: 3,
    };
    p.box.details['flags'] = {
        value: decodedFlags,
        offset: p.box.offset + p.offset + 1,
        length: 3,
    };
    p.offset += 4;

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

    if (decodedFlags.scheme_uri_present) {
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
