/**
 * Parses the 'esds' (Elementary Stream Descriptor) box.
 * This is a simplified parser focusing on key audio parameters.
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseEsds(box, view) {
    let offset = box.contentOffset - box.offset + 4; // Skip version and flags
    // Find the DecoderConfigDescriptor (tag 0x04)
    while (offset < box.size - 5) {
        if (view.getUint8(offset) === 0x04) {
            box.details['decoderConfigDescriptorTag'] = { value: '0x04', offset: box.offset + offset, length: 1 };
            const audioObjectType = view.getUint8(offset + 2) >> 3;
            box.details['audioObjectType'] = { value: audioObjectType, offset: box.offset + offset + 2, length: 1 };
            break;
        }
        offset++;
    }
}

export const esdsTooltip = {
    esds: {
        name: 'Elementary Stream Descriptor',
        text: 'Contains information about the elementary stream, such as the audio object type for AAC.',
        ref: 'ISO/IEC 14496-1, 7.2.6.5',
    },
    'esds@audioObjectType': {
        text: 'Specifies the audio coding profile (e.g., 2 = AAC LC, 5 = SBR).',
        ref: 'ISO/IEC 14496-3, Table 1.17',
    },
};