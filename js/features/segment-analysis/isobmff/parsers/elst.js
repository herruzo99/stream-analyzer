/**
 * @param {import('../../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseElst(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    const version = view.getUint8(currentParseOffset);
    box.details['version'] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4; // Skip version (1 byte) and flags (3 bytes)

    const entryCount = view.getUint32(currentParseOffset);
    box.details['entry_count'] = { value: entryCount, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;

    if (entryCount > 0) {
        // For simplicity, only parse the first entry
        if (version === 1) {
            box.details['segment_duration_1'] = { value: Number(view.getBigUint64(currentParseOffset)), offset: box.offset + currentParseOffset, length: 8 };
            currentParseOffset += 8;
            box.details['media_time_1'] = { value: Number(view.getBigInt64(currentParseOffset)), offset: box.offset + currentParseOffset, length: 8 };
            currentParseOffset += 8;
        } else {
            box.details['segment_duration_1'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
            currentParseOffset += 4;
            box.details['media_time_1'] = { value: view.getInt32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
            currentParseOffset += 4;
        }
        // If there are more entries, they would follow. We are only parsing the first for now.
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