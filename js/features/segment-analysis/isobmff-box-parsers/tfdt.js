/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseTfdt(box, view) {
    const version = view.getUint8(8);
    box.details['version'] = { value: version, offset: box.offset + 8, length: 1 };
    if (version === 1) {
        box.details['baseMediaDecodeTime'] = { value: Number(view.getBigUint64(12)), offset: box.offset + 12, length: 8 };
    } else {
        box.details['baseMediaDecodeTime'] = { value: view.getUint32(12), offset: box.offset + 12, length: 4 };
    }
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
  
}