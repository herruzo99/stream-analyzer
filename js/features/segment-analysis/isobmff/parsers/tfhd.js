/**
 * @param {import('../../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseTfhd(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header
    const flags = view.getUint32(currentParseOffset) & 0x00ffffff; // Flags are part of the full 4-byte field with version
    
    box.details['version'] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 }; // Version is first byte
    box.details['flags'] = { value: `0x${flags.toString(16).padStart(6, '0')}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4; // Move past version and flags

    box.details['track_ID'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;

    if (flags & 0x000001) { // base_data_offset_present
        box.details['base_data_offset'] = { value: Number(view.getBigUint64(currentParseOffset)), offset: box.offset + currentParseOffset, length: 8 };
        currentParseOffset += 8;
    }
    if (flags & 0x000002) { // sample_description_index_present
        box.details['sample_description_index'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
    }
    if (flags & 0x000008) { // default_sample_duration_present
        box.details['default_sample_duration'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
    }
    if (flags & 0x000010) { // default_sample_size_present
        box.details['default_sample_size'] = { value: view.getUint32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
    }
    if (flags & 0x000020) { // default_sample_flags_present
        box.details['default_sample_flags'] = { value: `0x${view.getUint32(currentParseOffset).toString(16)}`, offset: box.offset + currentParseOffset, length: 4 };
        // currentParseOffset += 4; // Not needed if no more fields are parsed
    }
}

export const tfhdTooltip = {
    tfhd: {
        name: 'Track Fragment Header',
        text: 'Declares defaults for a track fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7',
    },
    'tfhd@track_ID': {
        text: 'The unique identifier of the track for this fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@flags': {
        text: 'A bitfield indicating which optional fields are present.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@base_data_offset': {
        text: 'The base offset for data within the current mdat.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@sample_description_index': {
        text: 'The index of the sample description for this fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@version': {
        text: 'Version of this box (0 or 1). Affects the size of the decode time field.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@default_sample_duration': {
        text: 'Default duration of samples in this track fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@default_sample_size': {
        text: 'Default size of samples in this track fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@default_sample_flags': {
        text: 'Default flags for samples in this track fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
}