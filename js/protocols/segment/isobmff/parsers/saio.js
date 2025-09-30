import { BoxParser } from '../utils.js';

/**
 * Parses the 'saio' (Sample Auxiliary Information Offsets) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSaio(box, view) {
    const p = new BoxParser(box, view);
    const { version, flags } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    if ((flags & 1) !== 0) {
        p.skip(8, 'aux_info_type_and_param');
    }

    const entryCount = p.readUint32('entry_count');

    if (entryCount !== null && entryCount > 0) {
        if (version === 1) {
            p.readBigUint64('offset_1');
        } else {
            p.readUint32('offset_1');
        }
    }
    p.finalize();
}

export const saioTooltip = {
    saio: {
        name: 'Sample Auxiliary Information Offsets',
        text: 'Provides the location of auxiliary information for samples, such as CENC Initialization Vectors.',
        ref: 'ISO/IEC 14496-12, 8.7.9',
    },
    'saio@entry_count': {
        text: 'The number of offset entries.',
        ref: 'ISO/IEC 14496-12, 8.7.9.3',
    },
    'saio@offset_1': {
        text: 'The offset of the auxiliary information for the first chunk or run.',
        ref: 'ISO/IEC 14496-12, 8.7.9.3',
    },
};
