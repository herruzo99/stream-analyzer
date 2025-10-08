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
        name: 'Composition to Decode',
        text: 'Provides a mapping from the composition timeline to the decoding timeline.',
        ref: 'ISO/IEC 14496-12, 8.6.1.4',
    },
    'cslg@compositionToDTSShift': {
        text: 'A shift value that, when added to composition times, guarantees CTS >= DTS.',
        ref: 'ISO/IEC 14496-12, 8.6.1.4.3',
    },
    'cslg@leastDecodeToDisplayDelta': {
        text: 'The smallest composition time offset found in the track.',
        ref: 'ISO/IEC 14496-12, 8.6.1.4.3',
    },
};
