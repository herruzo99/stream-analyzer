/**
 * @param {import('../../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseTrun(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header

    const version = view.getUint8(currentParseOffset);
    box.details['version'] = { value: version, offset: box.offset + currentParseOffset, length: 1 };
    const flags = view.getUint32(currentParseOffset) & 0x00ffffff; // Flags are part of the full 4-byte field with version
    box.details['flags'] = { value: `0x${flags.toString(16).padStart(6, '0')}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4; // Move past version and flags

    const sample_count = view.getUint32(currentParseOffset);
    box.details['sample_count'] = { value: sample_count, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;

    if (flags & 0x000001) { // data_offset_present
        box.details['data_offset'] = { value: view.getInt32(currentParseOffset), offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
    }
    if (flags & 0x000004) { // first_sample_flags_present
        box.details['first_sample_flags'] = { value: `0x${view.getUint32(currentParseOffset).toString(16)}`, offset: box.offset + currentParseOffset, length: 4 };
        currentParseOffset += 4;
    }

    // Parse first sample details if present
    if (sample_count > 0 && currentParseOffset < box.size) { // Ensure there's data left to parse for sample details
        let sample_details = '';
        const sample1DetailsStartOffset = currentParseOffset;

        if (flags & 0x000100) { // sample_duration_present
            if (currentParseOffset + 4 > box.size) return; // Prevent OOB
            const duration = view.getUint32(currentParseOffset);
            sample_details += `Duration: ${duration}`;
            currentParseOffset += 4;
        }
        if (flags & 0x000200) { // sample_size_present
            if (currentParseOffset + 4 > box.size) return; // Prevent OOB
            const size = view.getUint32(currentParseOffset);
            sample_details += `${sample_details ? ', ' : ''}Size: ${size}`;
            currentParseOffset += 4;
        }
        if (flags & 0x000400) { // sample_flags_present
            if (currentParseOffset + 4 > box.size) return; // Prevent OOB
            const sFlags = view.getUint32(currentParseOffset);
            sample_details += `${sample_details ? ', ' : ''}Flags: 0x${sFlags.toString(16)}`;
            currentParseOffset += 4;
        }
        if (flags & 0x000800) { // sample_composition_time_offset_present
            if (currentParseOffset + 4 > box.size) return; // Prevent OOB
            const compOffset = version === 0 ? view.getUint32(currentParseOffset) : view.getInt32(currentParseOffset);
            sample_details += `${sample_details ? ', ' : ''}Comp. Offset: ${compOffset}`;
            currentParseOffset += 4;
        }
        if (sample_details) {
            box.details['sample_1_details'] = { value: sample_details, offset: box.offset + sample1DetailsStartOffset, length: currentParseOffset - sample1DetailsStartOffset};
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