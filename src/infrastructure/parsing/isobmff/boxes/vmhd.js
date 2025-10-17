import { BoxParser } from '../utils.js';

const VMHD_FLAGS_SCHEMA = {
    0x000001: 'no_lean_ahead', // The only defined flag
};

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseVmhd(box, view) {
    const p = new BoxParser(box, view);

    if (!p.checkBounds(4)) {
        p.finalize();
        return;
    }
    const versionAndFlags = p.view.getUint32(p.offset);
    const version = versionAndFlags >> 24;
    const flagsInt = versionAndFlags & 0x00ffffff;

    const decodedFlags = {};
    for (const mask in VMHD_FLAGS_SCHEMA) {
        decodedFlags[VMHD_FLAGS_SCHEMA[mask]] =
            (flagsInt & parseInt(mask, 16)) !== 0;
    }

    p.box.details['version'] = {
        value: version,
        offset: p.box.offset + p.offset,
        length: 1,
    };
    p.box.details['flags_raw'] = {
        value: `0x${flagsInt.toString(16).padStart(6, '0')}`,
        offset: p.box.offset + p.offset + 1,
        length: 3,
    };
    p.box.details['flags'] = {
        value: decodedFlags,
        offset: p.box.offset + p.offset + 1,
        length: 3,
    };
    p.offset += 4;

    p.readUint16('graphicsmode');

    const r = p.readUint16('opcolor_r');
    const g = p.readUint16('opcolor_g');
    const b = p.readUint16('opcolor_b');

    if (r !== null && g !== null && b !== null) {
        const baseOffset = box.details['opcolor_r'].offset;
        delete box.details['opcolor_r'];
        delete box.details['opcolor_g'];
        delete box.details['opcolor_b'];
        box.details['opcolor'] = {
            value: `R:${r}, G:${g}, B:${b}`,
            offset: baseOffset,
            length: 6,
        };
    }
    p.finalize();
}

export const vmhdTooltip = {
    vmhd: {
        name: 'Video Media Header Box',
        text: 'Video Media Header Box (`vmhd`). Contains general presentation information for a video track, independent of the specific codec.',
        ref: 'ISO/IEC 14496-12, 12.1.2',
    },
    'vmhd@version': {
        text: 'Version of this box, always 0 in this specification.',
        ref: 'ISO/IEC 14496-12, 12.1.2.2',
    },
    'vmhd@flags': {
        text: 'A bitmask of flags. The least significant bit must be set to 1, indicating a "no lean ahead" hint for older QuickTime compatibility.',
        ref: 'ISO/IEC 14496-12, 12.1.2.1',
    },
    'vmhd@graphicsmode': {
        text: 'Specifies a composition mode for this video track, defining how it should be blended with other tracks. A value of 0 means "copy" (replace the underlying pixels).',
        ref: 'ISO/IEC 14496-12, 12.1.2.3',
    },
    'vmhd@opcolor': {
        text: 'A set of three 16-bit RGB color values (red, green, blue) available for use by some graphics modes.',
        ref: 'ISO/IEC 14496-12, 12.1.2.3',
    },
};
