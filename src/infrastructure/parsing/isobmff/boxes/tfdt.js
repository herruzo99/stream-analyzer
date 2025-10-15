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
        name: 'Track Fragment Decode Time Box',
        text: 'Track Fragment Decode Time Box (`tfdt`). Provides the absolute base media decode time for the first sample in a track fragment. This is a critical architectural element for seeking in fragmented streams, as it provides an absolute time anchor without needing to parse all previous fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.12',
    },
    'tfdt@version': {
        text: 'Version of this box (0 or 1). Version 1 uses a 64-bit `baseMediaDecodeTime` field to support very long presentations.',
        ref: 'ISO/IEC 14496-12, 8.8.12.2',
    },
    'tfdt@baseMediaDecodeTime': {
        text: 'The absolute decode time of the first sample in this fragment, expressed in the media\'s timescale (from `mdhd`). This value is the sum of the durations of all samples in all preceding fragments and the initial movie.',
        ref: 'ISO/IEC 14496-12, 8.8.12.3',
    },
};