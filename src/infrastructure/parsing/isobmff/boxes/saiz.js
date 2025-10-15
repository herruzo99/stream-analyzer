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
    p.readVersionAndFlags(SAIZ_FLAGS_SCHEMA);

    const flags = box.details.flags?.value;
    if (flags === undefined) {
        p.finalize();
        return;
    }

    if (flags.aux_info_type_present) {
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