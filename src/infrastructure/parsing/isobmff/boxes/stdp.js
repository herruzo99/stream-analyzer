import { BoxParser } from '../utils.js';

/**
 * Parses the 'stdp' (Degradation Priority) box.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseStdp(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    const sampleCount = (box.size - p.offset) / 2;
    box.details['sample_count'] = {
        value: sampleCount,
        offset: 0,
        length: 0,
    };
    box.entries = [];

    for (let i = 0; i < sampleCount; i++) {
        if (p.stopped) break;
        const priority = p.readUint16(`priority_${i}`);
        if (priority !== null) {
            box.entries.push(priority);
        }
        delete box.details[`priority_${i}`];
    }
    p.finalize();
}

export const stdpTooltip = {
    stdp: {
        name: 'Sample Degradation Priority Box',
        text: 'Sample Degradation Priority Box (`stdp`). Provides a priority value for each sample in the track. This can be used by a streaming server or player to decide which samples to drop or degrade first under constrained conditions (e.g., low bandwidth).',
        ref: 'ISO/IEC 14496-12, 8.5.3',
    },
    'stdp@sample_count': {
        text: 'The total number of samples for which priority is specified.',
        ref: 'ISO/IEC 14496-12, 8.5.3.2',
    },
    'stdp@priority': {
        text: 'An integer specifying the degradation priority for each sample. Lower values are typically more important and should be preserved.',
        ref: 'ISO/IEC 14496-12, 8.5.3.3',
    },
};
