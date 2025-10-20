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
    box.entries = [];

    if (referenceCount === null) {
        p.finalize();
        return;
    }

    for (let i = 0; i < referenceCount; i++) {
        if (p.stopped || !p.checkBounds(12)) break;

        const refTypeAndSize = p.view.getUint32(p.offset);
        const duration = p.view.getUint32(p.offset + 4);
        const sapInfo = p.view.getUint32(p.offset + 8);
        p.offset += 12;

        box.entries.push({
            reference_type: (refTypeAndSize >> 31) & 1 ? 'sidx' : 'media',
            referenced_size: refTypeAndSize & 0x7fffffff,
            subsegment_duration: duration,
            starts_with_SAP: (sapInfo >> 31) & 1,
            SAP_type: (sapInfo >> 28) & 0x07,
            SAP_delta_time: sapInfo & 0x0fffffff,
        });
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
