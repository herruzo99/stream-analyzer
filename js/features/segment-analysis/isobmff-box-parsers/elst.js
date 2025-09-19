/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseElst(box, view) {
    const version = view.getUint8(8);
    box.details['version'] = { value: version, offset: box.offset + 8, length: 1 };
    const entryCount = view.getUint32(12);
    box.details['entry_count'] = { value: entryCount, offset: box.offset + 12, length: 4 };
    if (entryCount > 0) {
        const entryOffset = 16;
        if (version === 1) {
            box.details['segment_duration_1'] = { value: Number(view.getBigUint64(entryOffset)), offset: box.offset + entryOffset, length: 8 };
            box.details['media_time_1'] = { value: Number(view.getBigInt64(entryOffset + 8)), offset: box.offset + entryOffset + 8, length: 8 };
        } else {
            box.details['segment_duration_1'] = { value: view.getUint32(entryOffset), offset: box.offset + entryOffset, length: 4 };
            box.details['media_time_1'] = { value: view.getInt32(entryOffset + 4), offset: box.offset + entryOffset + 4, length: 4 };
        }
    }
}

export const elstTooltip = {
elst: {
        name: 'Edit List',
        text: 'Maps the media time-line to the presentation time-line.',
        ref: 'ISO/IEC 14496-12, 8.6.6',
    },
    'elst@version': {
        text: 'Version of this box (0 or 1). Affects the size of duration and time fields.',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
    'elst@entry_count': {
        text: 'The number of entries in the edit list.',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
    'elst@segment_duration_1': {
        text: 'The duration of this edit segment in movie timescale units.',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
    'elst@media_time_1': {
        text: 'The starting time within the media of this edit segment. A value of -1 indicates an empty edit.',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
};
