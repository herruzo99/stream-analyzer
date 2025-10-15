import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSidx(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    p.readUint32('reference_ID');
    p.readUint32('timescale');

    if (version === 1) {
        p.readBigUint64('earliest_presentation_time');
        p.readBigUint64('first_offset');
    } else {
        p.readUint32('earliest_presentation_time');
        p.readUint32('first_offset');
    }

    p.skip(2, 'reserved');

    const referenceCount = p.readUint16('reference_count');
    if (referenceCount === null) {
        p.finalize();
        return;
    }

    for (let i = 0; i < referenceCount; i++) {
        const refTypeAndSize = p.readUint32(`ref_${i + 1}_type_and_size`);
        if (refTypeAndSize === null) break;

        const refType = (refTypeAndSize >> 31) & 1;
        const refSize = refTypeAndSize & 0x7fffffff;

        const baseOffset =
            box.details[`ref_${i + 1}_type_and_size`]?.offset || 0;
        delete box.details[`ref_${i + 1}_type_and_size`];

        box.details[`reference_${i + 1}_type`] = {
            value: refType === 1 ? 'sidx' : 'media',
            offset: baseOffset,
            length: 4,
        };
        box.details[`reference_${i + 1}_size`] = {
            value: refSize,
            offset: baseOffset,
            length: 4,
        };

        p.readUint32(`reference_${i + 1}_duration`);

        const sapInfo = p.readUint32(`sap_info_dword_${i + 1}`);
        if (sapInfo !== null) {
            delete box.details[`sap_info_dword_${i + 1}`];
            box.details[`reference_${i + 1}_sap_info`] = {
                value: `0x${sapInfo.toString(16)}`,
                offset: baseOffset + 8,
                length: 4,
            };
        }
    }
    p.finalize();
}

export const sidxTooltip = {
    sidx: {
        name: 'Segment Index Box',
        text: 'Segment Index Box (`sidx`). Provides a compact index for a media segment. It allows a client to locate subsegments (e.g., individual `moof`/`mdat` pairs) in time and by byte offset without having to download the entire segment.',
        ref: 'ISO/IEC 14496-12, 8.16.3',
    },
    'sidx@version': {
        text: 'Version of this box (0 or 1). Affects the size of time and offset fields, with version 1 using 64-bit values.',
        ref: 'ISO/IEC 14496-12, 8.16.3.2',
    },
    'sidx@reference_ID': {
        text: 'The stream ID for the reference stream to which this index applies. In DASH, this is the track ID.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@timescale': {
        text: 'The timescale for all time and duration fields within this box, in ticks per second. This should match the media timescale.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@earliest_presentation_time': {
        text: 'The earliest presentation time of any content in the first subsegment referenced by this index, in the specified `timescale`.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@first_offset': {
        text: 'The byte offset from the end of this `sidx` box to the start of the first referenced item. This is the base offset for all subsegment locations.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@reference_count': {
        text: 'The number of subsegment references that follow in the table.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@reference_1_type': {
        text: 'For the first reference, this bit indicates the type of item being referenced. 0 means it references media data (e.g., a `moof` box), and 1 means it references another `sidx` box (for hierarchical indexing).',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@reference_1_size': {
        text: 'The size in bytes of the first referenced item.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@reference_1_duration': {
        text: 'The duration of the first referenced subsegment in `timescale` units.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@reference_1_sap_info': {
        text: 'A bitfield containing information about Stream Access Points (SAPs) within the first referenced subsegment.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
};
