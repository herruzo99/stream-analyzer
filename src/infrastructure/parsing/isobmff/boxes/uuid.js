import { BoxParser } from '../utils.js';
import { formatUUID } from '../../utils/drm.js';

/**
 * Parses the 'uuid' (User-defined Extension) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseUuid(box, view) {
    const p = new BoxParser(box, view);

    if (p.checkBounds(16)) {
        const usertypeBytes = new Uint8Array(
            p.view.buffer,
            p.view.byteOffset + p.offset,
            16
        );
        box.details['usertype'] = {
            value: formatUUID(usertypeBytes),
            offset: p.box.offset + p.offset,
            length: 16,
        };
        p.offset += 16;
    }

    p.readRemainingBytes('user_data');
    p.finalize();
}

export const uuidTooltip = {
    uuid: {
        name: 'User-defined Extension Box',
        text: 'A generic box containing user-defined or proprietary data. The specific meaning is identified by the `usertype` UUID.',
        ref: 'ISO/IEC 14496-12, 8.1.1',
    },
    'uuid@usertype': {
        text: 'A 16-byte UUID that uniquely identifies the format of the user data. This is often used for DRM-specific information like the PlayReady PSSH.',
        ref: 'ISO/IEC 14496-12, 8.1.1',
    },
    'uuid@user_data': {
        text: 'The proprietary data payload for this extension.',
        ref: 'ISO/IEC 14496-12, 8.1.1',
    },
};
