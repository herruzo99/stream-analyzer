/**
 * @param {import('../../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseTkhd(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    const version = view.getUint8(currentParseOffset);
    box.details['version'] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    const flags = view.getUint32(currentParseOffset) & 0x00ffffff; // Flags are part of the full 4-byte field with version
    box.details['flags'] = { value: `0x${flags.toString(16).padStart(6, '0')}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4; // Move past version and flags

    if (version === 1) {
        box.details['creation_time'] = { value: new Date(Number(view.getBigUint64(currentParseOffset)) * 1000 - 2082844800000).toISOString(), offset: box.offset + currentParseOffset, length: 8 };
        currentParseOffset += 8;
        box.details['modification_time'] = { value: new Date(Number(view.getBigUint64(currentParseOffset)) * 1000 - 2082844800000).toISOString(), offset: box.offset + currentParseOffset, length: 8 };
        currentParseOffset += 8;
    } else {
        box.details['creation_time'] = { value: new Date(view.getUint32(currentParseOffset) * 1000 - 2082844800000).toISOString(), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
        box.details['modification_time'] = { value: new Date(view.getUint32(currentParseOffset) * 1000 - 2082844800000).toISOString(), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
    }

    box.details['track_ID'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;

    box.details['reserved_1'] = { value: '4 bytes', offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;

    const durationLength = version === 1 ? 8 : 4;
    const duration = version === 1 ? Number(view.getBigUint64(currentParseOffset)) : view.getUint32(currentParseOffset);
    box.details['duration'] = { value: duration, offset: box.offset + currentParseOffset, length: durationLength };
    currentParseOffset += durationLength;

    box.details['reserved_2'] = { value: '8 bytes', offset: box.offset + currentParseOffset, length: 8 };
    currentParseOffset += 8;

    box.details['layer'] = { value: view.getInt16(currentParseOffset), offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;
    box.details['alternate_group'] = { value: view.getInt16(currentParseOffset), offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;

    box.details['volume'] = { value: `${view.getInt8(currentParseOffset)}.${view.getUint8(currentParseOffset+1)}`, offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;

    box.details['reserved_3'] = { value: '2 bytes', offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;

    const matrixValues = [];
    for(let i = 0; i < 9; i++) {
        matrixValues.push(view.getInt32(currentParseOffset + i * 4));
    }
    box.details['matrix'] = { value: `[${matrixValues.join(', ')}]`, offset: box.offset + currentParseOffset, length: 36 };
    currentParseOffset += 36;

    box.details['width'] = { value: `${view.getUint16(currentParseOffset)}.${view.getUint16(currentParseOffset + 2)}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;

    box.details['height'] = { value: `${view.getUint16(currentParseOffset)}.${view.getUint16(currentParseOffset + 2)}`, offset: box.offset + currentParseOffset, length: 4 };
}

export const tkhdTooltip = {
    tkhd: {
        name: 'Track Header',
        text: 'Specifies characteristics of a single track.',
        ref: 'ISO/IEC 14496-12, 8.3.2',
    },
    'tkhd@version': {
        text: 'Version of this box (0 or 1). Affects the size of time and duration fields.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@flags': {
        text: 'A bitmask of track properties (1=enabled, 2=in movie, 4=in preview).',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@creation_time': {
        text: 'The creation time of this track (in seconds since midnight, Jan. 1, 1904, UTC).',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@modification_time': {
        text: 'The most recent time the track was modified.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@track_ID': {
        text: 'A unique integer that identifies this track.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@duration': {
        text: "The duration of this track in the movie's timescale.",
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@layer': {
        text: 'Specifies the front-to-back ordering of video tracks; tracks with lower numbers are closer to the viewer.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@alternate_group': {
        text: 'An integer that specifies a group of tracks that are alternatives to each other.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@volume': {
        text: 'For audio tracks, a fixed-point 8.8 number indicating the track\'s relative volume.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@matrix': {
        text: 'A transformation matrix for the video in this track.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@width': {
        text: 'The visual presentation width of the track as a fixed-point 16.16 number.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@height': {
        text: 'The visual presentation height of the track as a fixed-point 16.16 number.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
};