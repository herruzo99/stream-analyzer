import { parseDescriptors } from './descriptors.js';

// Parses the payload of a Program Map Table (PMT) section.
// Extracts the PCR_PID and the list of elementary streams, including
// their stream_type, elementary_PID, and any associated descriptors.

/**
 * Parses the elementary stream mappings from a PMT section payload.
 * @param {DataView} view - A DataView of the PMT section's payload.
 * @param {number} baseOffset - The offset of the payload within the segment.
 * @returns {object} An object containing the PCR PID and a list of streams.
 */
export function parsePmtPayload(view, baseOffset) {
    const pcr_pid = view.getUint16(0) & 0x1fff;
    const program_info_length = view.getUint16(2) & 0x0fff;

    const programDescriptorsView = new DataView(view.buffer, view.byteOffset + 4, program_info_length);
    const program_descriptors = parseDescriptors(programDescriptorsView, baseOffset + 4);

    const streams = [];
    let streamInfoOffset = 4 + program_info_length;
    while (streamInfoOffset < view.byteLength) {
        if (streamInfoOffset + 5 > view.byteLength) break;
        const stream_type = view.getUint8(streamInfoOffset);
        const elementary_PID = view.getUint16(streamInfoOffset + 1) & 0x1fff;
        const es_info_length = view.getUint16(streamInfoOffset + 3) & 0x0fff;

        const descriptorsView = new DataView(view.buffer, view.byteOffset + streamInfoOffset + 5, es_info_length);
        const es_descriptors = parseDescriptors(descriptorsView, baseOffset + streamInfoOffset + 5);

        streams.push({
            stream_type: { value: `0x${stream_type.toString(16).padStart(2, '0')}`, offset: baseOffset + streamInfoOffset, length: 1 },
            elementary_PID: { value: elementary_PID, offset: baseOffset + streamInfoOffset + 1, length: 1.625 },
            es_info_length: { value: es_info_length, offset: baseOffset + streamInfoOffset + 3, length: 1.5 },
            es_descriptors,
        });
        streamInfoOffset += 5 + es_info_length;
    }

    return { type: 'PMT', pcr_pid: { value: pcr_pid, offset: baseOffset, length: 1.625 }, program_descriptors, streams };
}

export const pmtTooltipData = {
    PMT: {
        text: 'Program Map Table. Lists all elementary streams (video, audio, etc.) that constitute a single program.',
        ref: 'Clause 2.4.4.9',
    },
    'PMT@pcr_pid': {
        text: 'The PID of the transport stream packets that carry the PCR fields valid for this program.',
        ref: 'Table 2-33',
    },
    'PMT@stream_type': {
        text: 'An 8-bit field specifying the type of the elementary stream.',
        ref: 'Table 2-34',
    },
    'PMT@elementary_PID': {
        text: 'The PID of the transport stream packets that carry the elementary stream data.',
        ref: 'Table 2-33',
    },
};