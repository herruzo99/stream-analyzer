/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseHdlr(box, view) {
    let currentParseOffset = box.headerSize; // Start immediately after the standard box header
    
    box.details['version'] = { value: view.getUint8(currentParseOffset), offset: box.offset + currentParseOffset, length: 1 };
    box.details['flags'] = { value: `0x${(view.getUint32(currentParseOffset) & 0x00ffffff).toString(16)}`, offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4; 

    box.details['pre_defined'] = { value: '0', offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4; 
    
    const handlerTypeBytes = new Uint8Array(view.buffer, view.byteOffset + currentParseOffset, 4);
    box.details['handler_type'] = { value: String.fromCharCode(...handlerTypeBytes), offset: box.offset + currentParseOffset, length: 4 };
    currentParseOffset += 4;

    box.details['reserved'] = { value: '12 bytes', offset: box.offset + currentParseOffset, length: 12 };
    currentParseOffset += 12;

    const nameLength = box.size - (currentParseOffset);
    if (nameLength > 0) {
        const nameBytes = new Uint8Array(view.buffer, view.byteOffset + currentParseOffset, nameLength);
        const name = String.fromCharCode(...nameBytes).replace(/\0/g, '');
        box.details['name'] = { value: name, offset: box.offset + currentParseOffset, length: nameLength };
        currentParseOffset += nameLength;
    }
}

export const hdlrTooltip = {

    hdlr: {
        name: 'Handler Reference',
        text: "Declares the media type of the track (e.g., 'vide', 'soun').",
        ref: 'ISO/IEC 14496-12, 8.4.3',
    },
    'hdlr@handler_type': {
        text: "A four-character code identifying the media type (e.g., 'vide', 'soun', 'hint').",
        ref: 'ISO/IEC 14496-12, 8.4.3.3',
    },
    'hdlr@name': {
        text: 'A human-readable name for the track type (for debugging).',
        ref: 'ISO/IEC 14496-12, 8.4.3.3',
    },
}