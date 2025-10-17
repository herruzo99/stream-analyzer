import { BoxParser } from '../utils.js';

const SAIZ_FLAGS_SCHEMA = {
    0x000001: 'aux_info_type_present',
};

/**
 * Parses the 'saiz' (Sample Auxiliary Information Sizes) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSaiz(box, view) {
    const p = new BoxParser(box, view);

    if (!p.checkBounds(4)) {
        p.finalize();
        return;
    }
    const versionAndFlags = p.view.getUint32(p.offset);
    const version = versionAndFlags >> 24;
    const flagsInt = versionAndFlags & 0x00ffffff;

    const decodedFlags = {};
    for (const mask in SAIZ_FLAGS_SCHEMA) {
        decodedFlags[SAIZ_FLAGS_SCHEMA[mask]] =
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

    if (decodedFlags.aux_info_type_present) {
        p.readUint32('aux_info_type');
        p.readUint32('aux_info_type_parameter');
    }

    const defaultSampleInfoSize = p.readUint8('default_sample_info_size');
    const sampleCount = p.readUint32('sample_count');
    box.entries = [];

    if (
        defaultSampleInfoSize === 0 &&
        sampleCount !== null &&
        sampleCount > 0
    ) {
        for (let i = 0; i < sampleCount; i++) {
            if (p.stopped) break;
            const size = p.readUint8(`sample_info_size_${i + 1}`);
            if (size !== null) {
                box.entries.push({ sample_info_size: size });
            }
            // Clean up details to avoid clutter
            delete box.details[`sample_info_size_${i + 1}`];
        }
    }
    p.finalize();
}

export const saizTooltip = {
    saiz: {
        name: 'Sample Auxiliary Information Sizes',
        text: 'Sample Auxiliary Information Sizes Box (`saiz`). Specifies the size of the auxiliary information for each sample, such as CENC encryption parameters. It is paired with an `saio` box that provides the offsets.',
        ref: 'ISO/IEC 14496-12, 8.7.8',
    },
    'saiz@flags': {
        text: 'A bitfield indicating properties of the box. `aux_info_type_present` flag indicates if the `aux_info_type` and `aux_info_type_parameter` fields are present.',
        ref: 'ISO/IEC 14496-12, 8.7.8.2',
    },
    'saiz@default_sample_info_size': {
        text: 'Specifies a default size for the auxiliary info of each sample. If set to 0, each sample has a variable size, which is then listed in the entry table.',
        ref: 'ISO/IEC 14496-12, 8.7.8.3',
    },
    'saiz@sample_count': {
        text: 'The total number of samples for which auxiliary information size is provided in this box.',
        ref: 'ISO/IEC 14496-12, 8.7.8.3',
    },
    'saiz@entries': {
        text: 'A table containing the size for each sample if `default_sample_info_size` is 0.',
        ref: 'ISO/IEC 14496-12, 8.7.8.2',
    },
};
