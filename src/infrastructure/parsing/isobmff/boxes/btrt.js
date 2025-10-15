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
        text: 'Bit Rate Box (`btrt`). Provides bitrate information for the elementary stream, typically found within a Sample Entry. This helps a client configure its decoder and buffers.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
    'btrt@bufferSizeDB': {
        text: 'The size of the decoding buffer required for the elementary stream, in bytes. A value of 0 indicates the buffer size is unknown.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
    'btrt@maxBitrate': {
        text: 'The maximum instantaneous bitrate in bits per second over any one-second window. This is critical for network bandwidth estimation and buffer management.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
    'btrt@avgBitrate': {
        text: 'The average bitrate in bits per second over the entire presentation. Useful for content selection and overall bandwidth planning.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
};
