/**
 * Parses the 'esds' (Elementary Stream Descriptor) box.
 * This is a simplified parser focusing on key audio parameters.
 * @param {import('../../isobmff-parser.js').Box} box
 * @param {DataView} view
*/
export function parseEsds(box, view) {
    let currentParseOffset = box.headerSize + 4; // Skip version (1 byte) and flags (3 bytes)

    // Find the DecoderConfigDescriptor (tag 0x04)
    while (currentParseOffset < box.size) { // Ensure we don't go past the box size
        if (view.getUint8(currentParseOffset) === 0x04) {
            box.details['decoderConfigDescriptorTag'] = { value: '0x04', offset: box.offset + currentParseOffset, length: 1 };
            // The audioObjectType is in the byte after the descriptor tag and 1-3 bytes of length.
            // Simplified: assuming descriptor length is 1 or 2 bytes then the next byte has audio object type.
            // A more robust parser would parse the full ES_Descriptor structure.
            // For now, looking 2 bytes past the 0x04 tag for AAC object type (first 5 bits of byte 3).
            // This is a simplification and may not be robust for all ESDS structures.
            if (currentParseOffset + 2 < box.size) {
                 const audioObjectType = view.getUint8(currentParseOffset + 2) >> 3;
                 box.details['audioObjectType'] = { value: audioObjectType, offset: box.offset + currentParseOffset + 2, length: 1 };
            }
            break;
        }
        currentParseOffset++;
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