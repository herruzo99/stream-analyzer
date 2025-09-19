/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseTrun(box, view) {
     let offset = 12;
     const flags = view.getUint32(8) & 0x00ffffff;
     box.details['sample_count'] = { value: view.getUint32(offset), offset: box.offset + offset, length: 4 };
     offset += 4;
     if (flags & 0x000001) { // data_offset
        box.details['data_offset'] = { value: view.getInt32(offset), offset: box.offset + offset, length: 4 };
        offset += 4;
     }
     if (flags & 0x000004) { // first_sample_flags
        box.details['first_sample_flags'] = { value: `0x${view.getUint32(offset).toString(16)}`, offset: box.offset + offset, length: 4 };
        offset += 4;
     }
     // TODO: Individual sample parsing is complex and omitted for this refactoring,
     // but this is where it would live.
}

export const trunTooltip = {
       trun: {
        name: 'Track Run',
        text: 'Contains timing, size, and flags for a run of samples.',
        ref: 'ISO/IEC 14496-12, 8.8.8',
    },
    'trun@version': {
        text: 'Version of this box (0 or 1). Affects signed/unsigned composition time.',
        ref: 'ISO/IEC 14496-12, 8.8.8.2',
    },
    'trun@flags': {
        text: 'A bitfield indicating which optional per-sample fields are present.',
        ref: 'ISO/IEC 14496-12, 8.8.8.2',
    },
    'trun@sample_count': {
        text: 'The number of samples in this run.',
        ref: 'ISO/IEC 14496-12, 8.8.8.3',
    },
    'trun@data_offset': {
        text: 'An optional offset added to the base_data_offset.',
        ref: 'ISO/IEC 14496-12, 8.8.8.3',
    },
    'trun@first_sample_flags': {
        text: 'Flags for the first sample, overriding the default.',
        ref: 'ISO/IEC 14496-12, 8.8.8.3',
    },
    'trun@samples': {
        text: 'A table of sample-specific data (duration, size, flags, composition time offset).',
        ref: 'ISO/IEC 14496-12, 8.8.8.2',
    },
}