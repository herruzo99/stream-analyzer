import { BoxParser } from '../utils.js';

/**
 * Parses a variable-length descriptor size field.
 * @param {BoxParser} p The BoxParser instance.
 * @param {string} fieldName The name to use for the calculated size field.
 * @returns {number | null} The size of the descriptor payload.
 */
function parseDescriptorSize(p, fieldName) {
    const startOffset = p.offset;
    let size = 0;
    let byte;
    let bytesRead = 0;
    do {
        byte = p.readUint8(`size_byte_${bytesRead}`);
        if (byte === null) return null;
        size = (size << 7) | (byte & 0x7f);
        bytesRead++;
    } while (byte & 0x80 && bytesRead < 4);

    p.box.details[fieldName] = {
        value: size,
        offset: p.box.offset + startOffset,
        length: bytesRead,
    };
    for (let i = 0; i < bytesRead; i++) {
        delete p.box.details[`size_byte_${i}`];
    }
    return size;
}

/**
 * Parses the 'iods' (Initial Object Descriptor) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseIods(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    // --- InitialObjectDescriptor ---
    const iodTag = p.readUint8('InitialObjectDescriptor_tag');
    // Per ISO/IEC 14496-1, valid tags can be InitialObjectDescriptorTag (0x02),
    // ES_DescrTag (0x03), or MP4_IOD_Tag (0x10).
    if (iodTag !== 0x02 && iodTag !== 0x03 && iodTag !== 0x10) {
        p.addIssue(
            'warn',
            `Expected IOD tag (0x02, 0x03, or 0x10), but found ${iodTag}.`
        );
        p.readRemainingBytes('unknown_descriptor_data');
        p.finalize();
        return;
    }

    const iodSize = parseDescriptorSize(p, 'InitialObjectDescriptor_size');
    if (iodSize === null) {
        p.finalize();
        return;
    }

    p.readUint16('objectDescriptorID');
    p.readUint8('ODProfileLevelIndication');
    p.readUint8('sceneProfileLevelIndication');
    p.readUint8('audioProfileLevelIndication');
    p.readUint8('visualProfileLevelIndication');
    p.readUint8('graphicsProfileLevelIndication');

    // The rest of the IOD contains a list of other descriptors.
    // We will skip this for now but mark it as such.
    p.readRemainingBytes('other_descriptors_data');
    p.finalize();
}

export const iodsTooltip = {
    iods: {
        name: 'Initial Object Descriptor Box',
        text: 'Initial Object Descriptor Box (`iods`). Part of the MPEG-4 Systems framework, this box serves as the root for describing the elementary streams in a presentation. It contains profile and level indications for different media types.',
        ref: 'ISO/IEC 14496-14, 5.5',
    },
    'iods@objectDescriptorID': {
        text: 'A 10-bit ID for this Object Descriptor. The top 6 bits are flags that define properties of the Object Descriptor stream itself.',
        ref: 'ISO/IEC 14496-1, 8.2.2',
    },
    'iods@ODProfileLevelIndication': {
        text: 'Indicates the profile and level of the Object Descriptor stream, which defines the complexity and features of the scene description.',
        ref: 'ISO/IEC 14496-1, 8.2.2',
    },
    'iods@sceneProfileLevelIndication': {
        text: 'Indicates the profile and level required for any scene description (e.g., BIFS) in the presentation.',
        ref: 'ISO/IEC 14496-1, 8.2.2',
    },
    'iods@audioProfileLevelIndication': {
        text: 'Indicates the highest MPEG-4 audio profile and level required to play back the audio content in the presentation.',
        ref: 'ISO/IEC 14496-1, 8.2.2',
    },
    'iods@visualProfileLevelIndication': {
        text: 'Indicates the highest MPEG-4 Visual profile and level required to play back the visual content.',
        ref: 'ISO/IEC 14496-1, 8.2.2',
    },
    'iods@graphicsProfileLevelIndication': {
        text: 'Indicates the profile and level required for any 2D graphics content in the presentation.',
        ref: 'ISO/IEC 14496-1, 8.2.2',
    },
};
