import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseTfdt(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    if (version === 1) {
        p.readBigUint64('baseMediaDecodeTime');
    } else {
        p.readUint32('baseMediaDecodeTime');
    }
    p.finalize();
}

export const tfdtTooltip = {
    tfdt: {
        name: 'Track Fragment Decode Time',
        text: 'Provides the absolute decode time for the first sample.',
        ref: 'ISO/IEC 14496-12, 8.8.12',
    },
    'tfdt@version': {
        text: 'Version of this box (0 or 1). Affects the size of the decode time field.',
        ref: 'ISO/IEC 14496-12, 8.8.12.3',
    },
    'tfdt@baseMediaDecodeTime': {
        text: 'The absolute decode time, in media timescale units, for the first sample in this fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.12.3',
    },
};
