/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseTrun(box, view) {
    const version = view.getUint8(8);
    const flags = view.getUint32(8) & 0x00ffffff;
    let offset = 12;

    const sample_count = view.getUint32(offset);
    box.details['sample_count'] = { value: sample_count, offset: box.offset + offset, length: 4 };
    offset += 4;

    if (flags & 0x000001) { // data_offset
        box.details['data_offset'] = { value: view.getInt32(offset), offset: box.offset + offset, length: 4 };
        offset += 4;
    }
    if (flags & 0x000004) { // first_sample_flags
        box.details['first_sample_flags'] = { value: `0x${view.getUint32(offset).toString(16)}`, offset: box.offset + offset, length: 4 };
        offset += 4;
    }

    // Parse first sample details if present
    if (sample_count > 0) {
        let sample_details = '';
        if (flags & 0x000100) { // sample_duration
            const duration = view.getUint32(offset);
            sample_details += `Duration: ${duration}`;
            offset += 4;
        }
        if (flags & 0x000200) { // sample_size
            const size = view.getUint32(offset);
            sample_details += `${sample_details ? ', ' : ''}Size: ${size}`;
            offset += 4;
        }
        if (flags & 0x000400) { // sample_flags
            const sFlags = view.getUint32(offset);
            sample_details += `${sample_details ? ', ' : ''}Flags: 0x${sFlags.toString(16)}`;
            offset += 4;
        }
        if (flags & 0x000800) { // sample_composition_time_offset
            const compOffset = version === 0 ? view.getUint32(offset) : view.getInt32(offset);
            sample_details += `${sample_details ? ', ' : ''}Comp. Offset: ${compOffset}`;
        }
        if (sample_details) {
            box.details['sample_1_details'] = { value: sample_details, offset: box.offset + 12, length: offset - 12};
        }
    }
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
    'trun@sample_1_details': {
        text: 'A summary of the per-sample data fields for the first sample in this run.',
        ref: 'ISO/IEC 14496-12, 8.8.8.2',
    },
};