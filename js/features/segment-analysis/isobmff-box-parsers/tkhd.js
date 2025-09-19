/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseTkhd(box, view) {
    const version = view.getUint8(8);
    const flags = view.getUint32(8) & 0x00ffffff;
    box.details['version'] = { value: version, offset: box.offset + 8, length: 1 };
    box.details['flags'] = { value: `0x${flags.toString(16).padStart(6, '0')}`, offset: box.offset + 8, length: 4 };

    const idOffset = version === 1 ? 28 : 20;
    box.details['track_ID'] = { value: view.getUint32(idOffset), offset: box.offset + idOffset, length: 4 };

    const durationOffset = version === 1 ? 36 : 28;
    const durationLength = version === 1 ? 8 : 4;
    box.details['duration'] = { value: version === 1 ? Number(view.getBigUint64(durationOffset)) : view.getUint32(durationOffset), offset: box.offset + durationOffset, length: durationLength };

    const widthOffset = version === 1 ? 88 : 76;
    box.details['width'] = { value: `${view.getUint16(widthOffset)}.${view.getUint16(widthOffset + 2)}`, offset: box.offset + widthOffset, length: 4 };
    box.details['height'] = { value: `${view.getUint16(widthOffset + 4)}.${view.getUint16(widthOffset + 6)}`, offset: box.offset + widthOffset + 4, length: 4 };
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
        text: 'A bitmask of track properties (enabled, in movie, in preview).',
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
    'tkhd@width': {
        text: 'The visual presentation width of the track as a fixed-point 16.16 number.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@height': {
        text: 'The visual presentation height of the track as a fixed-point 16.16 number.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
}