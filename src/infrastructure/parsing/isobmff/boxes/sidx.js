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
        name: 'Segment Index',
        text: 'Provides a compact index of media stream chunks within a segment.',
        ref: 'ISO/IEC 14496-12, 8.16.3',
    },
    'sidx@version': {
        text: 'Version of this box (0 or 1). Affects the size of time and offset fields.',
        ref: 'ISO/IEC 14496-12, 8.16.3.2',
    },
    'sidx@reference_ID': {
        text: 'The stream ID for the reference stream (typically the track ID).',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@timescale': {
        text: 'The timescale for time and duration fields in this box, in ticks per second.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@earliest_presentation_time': {
        text: 'The earliest presentation time of any access unit in the first subsegment.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@first_offset': {
        text: 'The byte offset from the end of this box to the first byte of the indexed material.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@reference_count': {
        text: 'The number of subsegment references that follow.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@reference_1_type': {
        text: 'The type of the first reference (0 = media, 1 = sidx box).',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@reference_1_size': {
        text: 'The size in bytes of the referenced item.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@reference_1_duration': {
        text: 'The duration of the referenced subsegment in the timescale.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
};
