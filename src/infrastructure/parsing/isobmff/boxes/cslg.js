import { BoxParser } from '../utils.js';

/**
 * Parses the 'cslg' (Composition to Decode Box).
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseCslg(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    if (version === 1) {
        p.readBigUint64('compositionToDTSShift');
        p.readBigUint64('leastDecodeToDisplayDelta');
        p.readBigUint64('greatestDecodeToDisplayDelta');
        p.readBigUint64('compositionStartTime');
        p.readBigUint64('compositionEndTime');
    } else {
        p.readUint32('compositionToDTSShift');
        p.readUint32('leastDecodeToDisplayDelta');
        p.readUint32('greatestDecodeToDisplayDelta');
        p.readUint32('compositionStartTime');
        p.readUint32('compositionEndTime');
    }
    p.finalize();
}

export const cslgTooltip = {
    cslg: {
        name: 'Composition to Decode Box',
        text: 'Composition to Decode Box (`cslg`). Provides a summary of the relationship between composition and decoding timelines, especially when negative composition time offsets are used (e.g., with open GOPs). It helps players manage buffer requirements and timeline mapping.',
        ref: 'ISO/IEC 14496-12, 8.6.1.4',
    },
    'cslg@compositionToDTSShift': {
        text: 'A shift value that, when added to composition times (CTS), guarantees that the shifted CTS is always greater than or equal to the decoding time (DTS) for all samples. This helps model decoder buffer delays.',
        ref: 'ISO/IEC 14496-12, 8.6.1.4.3',
    },
    'cslg@leastDecodeToDisplayDelta': {
        text: 'The smallest composition time offset (from the `ctts` box) in the entire track. This represents the earliest a frame is presented relative to its decoding time.',
        ref: 'ISO/IEC 14496-12, 8.6.1.4.3',
    },
    'cslg@greatestDecodeToDisplayDelta': {
        text: 'The largest composition time offset (from the `ctts` box) in the entire track. This represents the latest a frame is presented relative to its decoding time.',
        ref: 'ISO/IEC 14496-12, 8.6.1.4.3',
    },
    'cslg@compositionStartTime': {
        text: 'The smallest computed composition time (CTS) for any sample in the media of this track.',
        ref: 'ISO/IEC 14496-12, 8.6.1.4.3',
    },
    'cslg@compositionEndTime': {
        text: 'The composition time plus the composition duration of the sample with the largest computed composition time (CTS) in the media of this track.',
        ref: 'ISO/IEC 14496-12, 8.6.1.4.3',
    },
};