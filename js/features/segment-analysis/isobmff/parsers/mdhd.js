/**
 * @param {import('../../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseMdhd(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    const version = view.getUint8(currentParseOffset);
    box.details['version'] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    box.details['flags'] = { value: `0x${(view.getUint32(currentParseOffset) & 0x00ffffff).toString(16)}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4; // Skip version (1 byte) and flags (3 bytes)

    const timeFieldLength = version === 1 ? 8 : 4;
    box.details['creation_time'] = { value: '...', offset: box.offset + currentParseOffset, length: timeFieldLength };
    currentParseOffset += timeFieldLength;
    box.details['modification_time'] = { value: '...', offset: box.offset + currentParseOffset, length: timeFieldLength };
    currentParseOffset += timeFieldLength;

    const timescale = view.getUint32(currentParseOffset);
    box.details['timescale'] = { value: timescale, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;

    const durationLength = version === 1 ? 8 : 4;
    const duration = version === 1 ? Number(view.getBigUint64(currentParseOffset)) : view.getUint32(currentParseOffset);
    box.details['duration'] = { value: duration, offset: box.offset + currentParseOffset, length: durationLength };
    currentParseOffset += durationLength;

    const langBits = view.getUint16(currentParseOffset);
    const langValue = String.fromCharCode(((langBits >> 10) & 0x1f) + 0x60, ((langBits >> 5) & 0x1f) + 0x60, (langBits & 0x1f) + 0x60);
    box.details['language'] = { value: langValue, offset: box.offset + currentParseOffset, length: 2 };
    currentParseOffset += 2;
    
    box.details['pre-defined'] = { value: '0', offset: box.offset + currentParseOffset, length: 2 };
}

export const mdhdTooltip = {
    
    mdhd: {
        name: 'Media Header',
        text: 'Declares media information (timescale, language).',
        ref: 'ISO/IEC 14496-12, 8.4.2',
    },
    'mdhd@version': {
        text: 'Version of this box (0 or 1). Affects the size of time and duration fields.',
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
    'mdhd@timescale': {
        text: "The number of time units that pass in one second for this track's media.",
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
    'mdhd@duration': {
        text: "The duration of this track's media in units of its own timescale.",
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
    'mdhd@language': {
        text: 'The ISO-639-2/T language code for this media.',
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
}