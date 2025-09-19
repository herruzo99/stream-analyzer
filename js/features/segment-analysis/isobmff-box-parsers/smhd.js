/**
 * @param {import('../isobmff-parser.js').Box} box
 * @param {DataView} view
 */
export function parseSmhd(box, view) {
    box.details['version'] = { value: view.getUint8(8), offset: box.offset + 8, length: 1 };
    box.details['balance'] = { value: view.getInt16(12), offset: box.offset + 12, length: 2 };
}

export const smhdTooltip = {
    smhd: {
        name: 'Sound Media Header',
        text: 'Contains header information specific to sound media.',
        ref: 'ISO/IEC 14496-12, 8.4.5.3',
    },
    'smhd@balance': {
        text: 'A fixed-point 8.8 number that places mono audio tracks in a stereo space (0 = center).',
        ref: 'ISO/IEC 14496-12, 8.4.5.3.2',
    },
};