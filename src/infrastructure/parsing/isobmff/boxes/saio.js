import { BoxParser } from '../utils.js';

const SAIO_FLAGS_SCHEMA = {
    0x000001: 'aux_info_type_present',
};

/**
 * Parses the 'saio' (Sample Auxiliary Information Offsets) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSaio(box, view) {
    const p = new BoxParser(box, view);
    const { version, flags } = p.readVersionAndFlags(SAIO_FLAGS_SCHEMA);

    if (version === null) {
        p.finalize();
        return;
    }

    if (flags & 0x000001) {
        p.readUint32('aux_info_type');
        p.readUint32('aux_info_type_parameter');
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
        text: 'Sample Auxiliary Information Offsets Box (`saio`). Specifies the file offsets for auxiliary information associated with samples, such as CENC Initialization Vectors (IVs) and subsample encryption patterns. It works in tandem with the `saiz` box.',
        ref: 'ISO/IEC 14496-12, 8.7.9',
    },
    'saio@version': {
        text: 'Version of this box (0 or 1). Version 1 uses 64-bit offsets to support very large files.',
        ref: 'ISO/IEC 14496-12, 8.7.9.2',
    },
    'saio@flags': {
        text: 'A bitfield indicating properties of the box. `aux_info_type_present` flag indicates if the `aux_info_type` and `aux_info_type_parameter` fields are present.',
        ref: 'ISO/IEC 14496-12, 8.7.9.2',
    },
    'saio@entry_count': {
        text: 'The number of offset entries. If 1, all auxiliary information is contiguous. Otherwise, it typically matches the number of chunks, with one offset per chunk.',
        ref: 'ISO/IEC 14496-12, 8.7.9.3',
    },
    'saio@offset_1': {
        text: 'The absolute file offset of the auxiliary information for the first chunk or run. In a `traf` box, this offset is relative to the `moof` base offset.',
        ref: 'ISO/IEC 14496-12, 8.7.9.3',
    },
};