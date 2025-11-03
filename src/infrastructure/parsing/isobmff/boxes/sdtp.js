import { BoxParser } from '../utils.js';

const IS_LEADING_MAP = {
    0: 'Unknown',
    1: 'Leading sample with dependency',
    2: 'Not a leading sample',
    3: 'Leading sample without dependency',
};

const SAMPLE_DEPENDS_ON_MAP = {
    0: 'Unknown',
    1: 'Depends on others (not an I-picture)',
    2: 'Does not depend on others (I-picture)',
    3: 'Reserved',
};

const SAMPLE_IS_DEPENDED_ON_MAP = {
    0: 'Unknown',
    1: 'Others may depend on this sample',
    2: 'No other sample depends on this one (disposable)',
    3: 'Reserved',
};

const SAMPLE_HAS_REDUNDANCY_MAP = {
    0: 'Unknown',
    1: 'Has redundant coding',
    2: 'No redundant coding',
    3: 'Reserved',
};

/**
 * Parses the 'sdtp' (Sample Dependency Type) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSdtp(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    const sampleCount = box.size - p.offset;
    box.details['sample_count'] = {
        value: sampleCount,
        offset: 0,
        length: 0,
    };

    box.entries = [];

    if (sampleCount > 0) {
        for (let i = 0; i < sampleCount; i++) {
            if (p.stopped) break;

            const byte = p.readUint8(`sample_${i}_flags_byte`);
            if (byte === null) break;

            const isLeading = (byte >> 6) & 0x03;
            const dependsOn = (byte >> 4) & 0x03;
            const isDependedOn = (byte >> 2) & 0x03;
            const hasRedundancy = byte & 0x03;

            box.entries.push({
                isLeading: IS_LEADING_MAP[isLeading] || 'Reserved',
                dependsOn: SAMPLE_DEPENDS_ON_MAP[dependsOn] || 'Reserved',
                isDependedOn:
                    SAMPLE_IS_DEPENDED_ON_MAP[isDependedOn] || 'Reserved',
                hasRedundancy:
                    SAMPLE_HAS_REDUNDANCY_MAP[hasRedundancy] || 'Reserved',
            });
        }
    }
    p.finalize();
}

export const sdtpTooltip = {
    sdtp: {
        name: 'Sample Dependency Type Box',
        text: 'Sample Dependency Type Box (`sdtp`). Provides fine-grained dependency information for each sample in a track. It specifies if a sample is an I-frame, if other frames depend on it, and other properties useful for streaming and trick modes.',
        ref: 'ISO/IEC 14496-12, 8.6.4',
    },
    'sdtp@sample_count': {
        text: 'The total number of samples described in this box, which should match the sample count in the `stsz` or `stz2` box.',
        ref: 'ISO/IEC 14496-12, 8.6.4.2',
    },
    'sdtp@isLeading': {
        text: 'Indicates if this is a leading sample, which has a decoding time before its presentation time. (e.g., a B-frame that is decoded after a P-frame but displayed before it).',
        ref: 'ISO/IEC 14496-12, 8.6.4.3',
    },
    'sdtp@dependsOn': {
        text: 'Indicates inter-sample dependency. A value of 2 ("Does not depend on others") marks a random access point (I-frame).',
        ref: 'ISO/IEC 14496-12, 8.6.4.3',
    },
    'sdtp@isDependedOn': {
        text: 'Indicates if other samples depend on this one. If no other samples depend on it, it may be disposable during trick modes.',
        ref: 'ISO/IEC 14496-12, 8.6.4.3',
    },
    'sdtp@hasRedundancy': {
        text: 'Indicates if there is redundant coding in this sample, which could be used for error resilience.',
        ref: 'ISO/IEC 14496-12, 8.6.4.3',
    },
};
