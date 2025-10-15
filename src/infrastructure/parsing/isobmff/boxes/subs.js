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

            const sample_delta = p.readUint32('sample_delta');
            const subsample_count = p.readUint16('subsample_count');

            const entry = {
                sample_delta,
                subsamples: [],
            };

            if (subsample_count !== null) {
                for (let j = 0; j < subsample_count; j++) {
                    if (p.stopped) break;
                    let subsample_size;
                    if (version === 1) {
                        subsample_size = p.readUint32('subsample_size');
                    } else {
                        subsample_size = p.readUint16('subsample_size');
                    }
                    const subsample_priority =
                        p.readUint8('subsample_priority');
                    const discardable = p.readUint8('discardable');

                    entry.subsamples.push({
                        subsample_size,
                        subsample_priority,
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
    'subs@sample_delta': {
        text: 'The number of samples between the start of the track and the first entry, or between previous and current entries.',
        ref: 'ISO/IEC 14496-12, 8.7.7.3',
    },
    'subs@subsample_count': {
        text: 'The number of sub-samples for the current sample. A value of 0 indicates no sub-sample structure.',
        ref: 'ISO/IEC 14496-12, 8.7.7.3',
    },
    'subs@subsample_size': {
        text: 'The size in bytes of the current sub-sample.',
        ref: 'ISO/IEC 14496-12, 8.7.7.3',
    },
    'subs@subsample_priority': {
        text: 'A degradation priority for this sub-sample. Higher values indicate greater importance.',
        ref: 'ISO/IEC 14496-12, 8.7.7.3',
    },
    'subs@discardable': {
        text: 'A flag indicating if this sub-sample is not required for decoding the current sample (e.g., it contains supplemental enhancement information).',
        ref: 'ISO/IEC 14496-12, 8.7.7.3',
    },
};
