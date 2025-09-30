import { BoxParser } from '../utils.js';

/**
 * Parses the 'saiz' (Sample Auxiliary Information Sizes) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSaiz(box, view) {
    const p = new BoxParser(box, view);
    const { flags } = p.readVersionAndFlags();

    if (flags !== null && (flags & 1) !== 0) {
        p.readUint32('aux_info_type');
        p.readUint32('aux_info_type_parameter');
    }

    const defaultSampleInfoSize = p.readUint8('default_sample_info_size');
    const sampleCount = p.readUint32('sample_count');

    if (
        defaultSampleInfoSize === 0 &&
        sampleCount !== null &&
        sampleCount > 0
    ) {
        const maxEntriesToShow = 10;
        for (let i = 0; i < sampleCount; i++) {
            if (p.stopped) break;
            if (i < maxEntriesToShow) {
                p.readUint8(`sample_info_size_${i + 1}`);
            } else {
                p.offset += 1;
            }
        }

        if (sampleCount > maxEntriesToShow) {
            box.details['...more_entries'] = {
                value: `${
                    sampleCount - maxEntriesToShow
                } more entries not shown but parsed`,
                offset: 0,
                length: 0,
            };
        }
    }
    p.finalize();
}

export const saizTooltip = {
    saiz: {
        name: 'Sample Auxiliary Information Sizes',
        text: 'Provides the size of auxiliary information for each sample, used for CENC encryption parameters.',
        ref: 'ISO/IEC 14496-12, 8.7.8',
    },
    'saiz@default_sample_info_size': {
        text: 'Default size of the auxiliary info. If 0, sizes are in the table.',
        ref: 'ISO/IEC 14496-12, 8.7.8.3',
    },
    'saiz@sample_count': {
        text: 'The number of samples for which size information is provided.',
        ref: 'ISO/IEC 14496-12, 8.7.8.3',
    },
};
