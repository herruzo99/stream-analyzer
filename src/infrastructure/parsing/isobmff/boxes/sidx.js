import { BoxParser } from '../utils.js';

/**
 * @param {import('@/types.js').Box} box
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
        if (p.stopped) break;
        const refTypeAndSize = p.readUint32(`refTypeAndSize_${i}`);
        const duration = p.readUint32(`duration_${i}`);
        const sapInfo = p.readUint32(`sapInfo_${i}`);
        if (refTypeAndSize === null || duration === null || sapInfo === null)
            break;

        box.entries.push({
            type: (refTypeAndSize >> 31) & 1 ? 'sidx' : 'media',
            size: refTypeAndSize & 0x7fffffff,
            duration: duration,
            startsWithSap: (sapInfo >> 31) & 1,
            sapType: (sapInfo >> 28) & 0x07,
            sapDeltaTime: sapInfo & 0x0fffffff,
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
    'sidx@type': {
        text: 'Indicates the type of item being referenced. "media" means it references media data (e.g., a `moof` box), and "sidx" means it references another `sidx` box (for hierarchical indexing).',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@size': {
        text: 'The size in bytes of the referenced item.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@duration': {
        text: 'The duration of the referenced subsegment in `timescale` units.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@startsWithSap': {
        text: 'A flag indicating if the referenced subsegment starts with a Stream Access Point (SAP).',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@sapType': {
        text: 'The type of the leading SAP, if present.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@sapDeltaTime': {
        text: 'The SAP decoding time minus the earliest presentation time of the subsegment.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
};
