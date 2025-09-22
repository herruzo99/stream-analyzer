// A library of parsers for various descriptor types found within PSI tables.
// A main function will take a descriptor_tag and raw data, and delegate
// to the appropriate specialized parsing function for that tag.

/**
 * Parses a single CA Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.16 & Table 2-61
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed CA descriptor with byte-level metadata.
 */
function parseCaDescriptor(view, baseOffset) {
    const ca_system_ID = view.getUint16(0);
    const ca_PID = view.getUint16(2) & 0x1fff;
    const privateDataBytes = [];
    for (let i = 4; i < view.byteLength; i++) {
        privateDataBytes.push(view.getUint8(i).toString(16).padStart(2, '0'));
    }

    return {
        ca_system_ID: { value: `0x${ca_system_ID.toString(16).padStart(4, '0')}`, offset: baseOffset, length: 2 },
        reserved: { value: (view.getUint8(2) >> 5) & 0x07, offset: baseOffset + 2, length: 0.375 },
        ca_PID: { value: ca_PID, offset: baseOffset + 2, length: 1.625 },
        private_data: { value: privateDataBytes.length > 0 ? privateDataBytes.join(' ') : 'none', offset: baseOffset + 4, length: privateDataBytes.length },
    };
}

/**
 * Parses a single Video Stream Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.2 & Table 2-46
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed video descriptor.
 */
function parseVideoStreamDescriptor(view, baseOffset) {
    const byte1 = view.getUint8(0);
    const details = {
        multiple_frame_rate_flag: { value: (byte1 >> 7) & 1, offset: baseOffset, length: 0.125 },
        frame_rate_code: { value: (byte1 >> 3) & 0x0f, offset: baseOffset, length: 0.5 },
        MPEG_1_only_flag: { value: (byte1 >> 2) & 1, offset: baseOffset, length: 0.125 },
        constrained_parameter_flag: { value: (byte1 >> 1) & 1, offset: baseOffset, length: 0.125 },
        still_picture_flag: { value: byte1 & 1, offset: baseOffset, length: 0.125 },
    };
    if (details.MPEG_1_only_flag.value === 0) {
        const byte2 = view.getUint8(1);
        details.profile_and_level_indication = { value: byte2, offset: baseOffset + 1, length: 1 };
        const byte3 = view.getUint8(2);
        details.chroma_format = { value: (byte3 >> 6) & 3, offset: baseOffset + 2, length: 0.25 };
        details.frame_rate_extension_flag = { value: (byte3 >> 5) & 1, offset: baseOffset + 2, length: 0.125 };
    }
    return details;
}

/**
 * Parses a single Audio Stream Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.4 & Table 2-48
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed audio descriptor.
 */
function parseAudioStreamDescriptor(view, baseOffset) {
    const byte1 = view.getUint8(0);
    return {
        free_format_flag: { value: (byte1 >> 7) & 1, offset: baseOffset, length: 0.125 },
        ID: { value: (byte1 >> 6) & 1, offset: baseOffset, length: 0.125 },
        layer: { value: (byte1 >> 4) & 3, offset: baseOffset, length: 0.25 },
        variable_rate_audio_indicator: { value: (byte1 >> 3) & 1, offset: baseOffset, length: 0.125 },
    };
}

/**
 * Parses a single AVC Video Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.64 & Table 2-92
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed AVC video descriptor.
 */
function parseAvcVideoDescriptor(view, baseOffset) {
    const byte1 = view.getUint8(1); // constraint flags byte
    const byte2 = view.getUint8(3); // presence flags byte
    return {
        profile_idc: { value: view.getUint8(0), offset: baseOffset, length: 1 },
        constraint_set0_flag: { value: (byte1 >> 7) & 1, offset: baseOffset + 1, length: 0.125 },
        constraint_set1_flag: { value: (byte1 >> 6) & 1, offset: baseOffset + 1, length: 0.125 },
        constraint_set2_flag: { value: (byte1 >> 5) & 1, offset: baseOffset + 1, length: 0.125 },
        constraint_set3_flag: { value: (byte1 >> 4) & 1, offset: baseOffset + 1, length: 0.125 },
        constraint_set4_flag: { value: (byte1 >> 3) & 1, offset: baseOffset + 1, length: 0.125 },
        constraint_set5_flag: { value: (byte1 >> 2) & 1, offset: baseOffset + 1, length: 0.125 },
        AVC_compatible_flags: { value: byte1 & 3, offset: baseOffset + 1, length: 0.25 },
        level_idc: { value: view.getUint8(2), offset: baseOffset + 2, length: 1 },
        AVC_still_present: { value: (byte2 >> 7) & 1, offset: baseOffset + 3, length: 0.125 },
        AVC_24_hour_picture_flag: { value: (byte2 >> 6) & 1, offset: baseOffset + 3, length: 0.125 },
        Frame_Packing_SEI_not_present_flag: { value: (byte2 >> 5) & 1, offset: baseOffset + 3, length: 0.125 },
    };
}

/**
 * Parses a loop of descriptors from a DataView.
 * @param {DataView} view - A DataView starting at the beginning of the descriptor loop.
 * @param {number} baseOffset - The offset of the loop within the segment.
 * @returns {object[]} An array of parsed descriptor objects.
 */
export function parseDescriptors(view, baseOffset) {
    const descriptors = [];
    let offset = 0;
    while (offset < view.byteLength) {
        if (offset + 2 > view.byteLength) break;
        const descriptor_tag = view.getUint8(offset);
        const descriptor_length = view.getUint8(offset + 1);
        
        if (offset + 2 + descriptor_length > view.byteLength) break;

        const payloadView = new DataView(view.buffer, view.byteOffset + offset + 2, descriptor_length);
        const payloadOffset = baseOffset + offset + 2;

        let details;
        let name = 'Unknown/Private Descriptor';

        switch (descriptor_tag) {
            case 0x02:
                name = 'Video Stream Descriptor';
                details = parseVideoStreamDescriptor(payloadView, payloadOffset);
                break;
            case 0x03:
                name = 'Audio Stream Descriptor';
                details = parseAudioStreamDescriptor(payloadView, payloadOffset);
                break;
            case 0x09: // CA Descriptor
                name = 'Conditional Access Descriptor';
                details = parseCaDescriptor(payloadView, payloadOffset);
                break;
            case 0x28: // AVC Video Descriptor
                name = 'AVC Video Descriptor';
                details = parseAvcVideoDescriptor(payloadView, payloadOffset);
                break;
            default:
                details = { data: { value: `${descriptor_length} bytes`, offset: payloadOffset, length: descriptor_length } };
                break;
        }

        descriptors.push({
            tag: descriptor_tag,
            length: descriptor_length,
            name,
            details,
        });
        offset += 2 + descriptor_length;
    }
    return descriptors;
}

export const descriptorTooltipData = {
    CA_descriptor: {
        text: 'Conditional Access Descriptor. Provides information about the CA system used for scrambling.',
        ref: 'Clause 2.6.16',
    },
    'CA_descriptor@ca_system_ID': {
        text: 'A 16-bit identifier for the Conditional Access system.',
        ref: 'Clause 2.6.17',
    },
    'CA_descriptor@ca_PID': {
        text: 'The PID of the transport stream packets that carry the EMM or ECM data for this CA system.',
        ref: 'Clause 2.6.17',
    },
    video_stream_descriptor: {
        text: 'Provides basic coding parameters of a video elementary stream.',
        ref: 'Clause 2.6.2',
    },
    audio_stream_descriptor: {
        text: 'Provides basic information which identifies the coding version of an audio elementary stream.',
        ref: 'Clause 2.6.4',
    },
    AVC_video_descriptor: {
        text: 'Provides basic information for identifying coding parameters of an AVC (H.264) video stream.',
        ref: 'Clause 2.6.64',
    },
};