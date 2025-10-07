import { BoxParser } from '../utils.js';

/**
 * Parses the 'btrt' (Bit Rate) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseBtrt(box, view) {
    const p = new BoxParser(box, view);
    p.readUint32('bufferSizeDB');
    p.readUint32('maxBitrate');
    p.readUint32('avgBitrate');
    p.finalize();
}

export const btrtTooltip = {
    btrt: {
        name: 'Bit Rate Box',
        text: 'Provides bitrate information for the stream, found within a Sample Entry.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
    'btrt@bufferSizeDB': {
        text: 'The size of the decoding buffer for the elementary stream in bytes.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
    'btrt@maxBitrate': {
        text: 'The maximum rate in bits/second over any one-second window.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
    'btrt@avgBitrate': {
        text: 'The average rate in bits/second over the entire presentation.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
};
