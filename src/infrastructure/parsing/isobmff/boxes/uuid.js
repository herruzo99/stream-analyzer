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
        text: 'User-defined Extension Box (`uuid`). A generic container for proprietary or non-standard data. The meaning of the data is defined by the `usertype` UUID, which identifies the specific extension.',
        ref: 'ISO/IEC 14496-12, 4.2',
    },
    'uuid@usertype': {
        text: 'A 128-bit UUID that uniquely identifies the format of the `user_data`. This is frequently used for DRM-specific information, such as a PlayReady PSSH box (`uuid` with PlayReady System ID) or other custom metadata.',
        ref: 'ISO/IEC 14496-12, 4.2',
    },
    'uuid@user_data': {
        text: 'The proprietary data payload for this extension. Its structure and meaning are defined by the specification associated with the `usertype` UUID.',
        ref: 'ISO/IEC 14496-12, 4.2',
    },
};
