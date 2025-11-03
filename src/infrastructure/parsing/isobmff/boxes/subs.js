import { BoxParser } from '../utils.js';

/**
 * Parses the 'subs' (Sub-Sample Information) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSubs(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    const entryCount = p.readUint32('entry_count');
    box.entries = [];

    if (entryCount !== null) {
        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;

            const delta = p.readUint32(`entry_${i}_sample_delta`);
            const subsampleCount = p.readUint16(`entry_${i}_subsample_count`);

            const entry = {
                delta,
                subsamples: [],
            };

            if (subsampleCount !== null) {
                for (let j = 0; j < subsampleCount; j++) {
                    if (p.stopped) break;
                    let size;
                    if (version === 1) {
                        size = p.readUint32(`entry_${i}_subsample_${j}_size`);
                    } else {
                        size = p.readUint16(`entry_${i}_subsample_${j}_size`);
                    }
                    const priority = p.readUint8(
                        `entry_${i}_subsample_${j}_priority`
                    );
                    const discardable = p.readUint8(
                        `entry_${i}_subsample_${j}_discardable`
                    );

                    if (
                        size === null ||
                        priority === null ||
                        discardable === null
                    ) {
                        p.stopped = true;
                        break;
                    }

                    entry.subsamples.push({
                        size,
                        priority,
                        discardable,
                    });
                }
            }
            box.entries.push(entry);
        }
    }
    p.finalize();
}

export const subsTooltip = {
    subs: {
        name: 'Sub-Sample Information Box',
        text: 'Sub-Sample Information Box (`subs`). Defines a breakdown of a sample into smaller "sub-samples". This is critical for Common Encryption (`cenc`) to define clear and encrypted regions within a single sample, enabling pattern encryption.',
        ref: 'ISO/IEC 14496-12, 8.7.7',
    },
    'subs@version': {
        text: 'Version of this box (0 or 1). Version 1 uses 32-bit `subsample_size` fields, while version 0 uses 16-bit fields.',
        ref: 'ISO/IEC 14496-12, 8.7.7.2',
    },
    'subs@entry_count': {
        text: 'The number of samples that are described as having a sub-sample structure.',
        ref: 'ISO/IEC 14496-12, 8.7.7.3',
    },
    'subs@delta': {
        text: 'The number of samples between the start of the track and the first entry, or between previous and current entries.',
        ref: 'ISO/IEC 14496-12, 8.7.7.3',
    },
    'subs@subsampleCount': {
        text: 'The number of sub-samples for the current sample. A value of 0 indicates no sub-sample structure.',
        ref: 'ISO/IEC 14496-12, 8.7.7.3',
    },
    'subs@size': {
        text: 'The size in bytes of the current sub-sample.',
        ref: 'ISO/IEC 14496-12, 8.7.7.3',
    },
    'subs@priority': {
        text: 'A degradation priority for this sub-sample. Higher values indicate greater importance.',
        ref: 'ISO/IEC 14496-12, 8.7.7.3',
    },
    'subs@discardable': {
        text: 'A flag indicating if this sub-sample is not required for decoding the current sample (e.g., it contains supplemental enhancement information).',
        ref: 'ISO/IEC 14496-12, 8.7.7.3',
    },
};
