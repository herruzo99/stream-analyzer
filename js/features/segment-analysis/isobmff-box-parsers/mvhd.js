/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseMvhd(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    const version = view.getUint8(currentParseOffset);
    box.details['version'] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    currentParseOffset += 4; // Skip version (1 byte) and flags (3 bytes)

    if (version === 1) {
        box.details['creation_time'] = { value: new Date(Number(view.getBigUint64(currentParseOffset)) * 1000 - 2082844800000).toISOString(), offset: box.offset + currentParseOffset, length: 8 };
        currentParseOffset += 8;
        box.details['modification_time'] = { value: new Date(Number(view.getBigUint64(currentParseOffset)) * 1000 - 2082844800000).toISOString(), offset: box.offset + currentParseOffset, length: 8 };
        currentParseOffset += 8;
        box.details['timescale'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
        box.details['duration'] = { value: Number(view.getBigUint64(currentParseOffset)), offset: box.offset + currentParseOffset, length: 8 };
        currentParseOffset += 8;
    } else {
        box.details['creation_time'] = { value: new Date(view.getUint32(currentParseOffset) * 1000 - 2082844800000).toISOString(), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
        box.details['modification_time'] = { value: new Date(view.getUint32(currentParseOffset) * 1000 - 2082844800000).toISOString(), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
        box.details['timescale'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
        box.details['duration'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
    }

    box.details['rate'] = { value: `${view.getInt16(currentParseOffset)}.${view.getUint16(currentParseOffset + 2)}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;

    box.details['volume'] = { value: `${view.getInt8(currentParseOffset)}.${view.getUint8(currentParseOffset + 1)}`, offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;

    box.details['reserved'] = { value: '10 bytes', offset: box.offset + currentParseOffset, length: 10 };
    currentParseOffset += 10;

    const matrixValues = [];
    for(let i = 0; i < 9; i++) {
        matrixValues.push(view.getInt32(currentParseOffset + i * 4));
    }
    box.details['matrix'] = { value: `[${matrixValues.join(', ')}]`, offset: box.offset + currentParseOffset, length: 36 };
    currentParseOffset += 36;
    
    box.details['pre_defined'] = { value: '24 bytes', offset: box.offset + currentParseOffset, length: 24 };
    currentParseOffset += 24;

    box.details['next_track_ID'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
}

export const mvhdTooltip = {
    mvhd: {
        name: 'Movie Header',
        text: 'Contains global information for the presentation (timescale, duration).',
        ref: 'ISO/IEC 14496-12, 8.2.2',
    },
    'mvhd@version': {
        text: 'Version of this box (0 or 1). Affects the size of time and duration fields.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@creation_time': {
        text: 'The creation time of the presentation (in seconds since midnight, Jan. 1, 1904, UTC).',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@modification_time': {
        text: 'The most recent time the presentation was modified.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@timescale': {
        text: 'The number of time units that pass in one second for the presentation.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@duration': {
        text: 'The duration of the presentation in units of the timescale.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@rate': {
        text: 'A fixed-point 16.16 number that specifies the preferred playback rate (1.0 is normal speed).',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@volume': {
        text: 'A fixed-point 8.8 number that specifies the preferred playback volume (1.0 is full volume).',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@matrix': {
        text: 'A transformation matrix for the video, mapping points from video coordinates to display coordinates.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@next_track_ID': {
        text: 'A non-zero integer indicating a value for the track ID of the next track to be added to this presentation.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
};