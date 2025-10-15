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

    if (sampleCount > 0) {
        const maxEntriesToShow = 10;
        for (let i = 0; i < sampleCount; i++) {
            if (p.stopped) break;

            if (i < maxEntriesToShow) {
                const byte = p.readUint8(`sample_${i + 1}_flags_byte`);
                if (byte === null) break;

                delete box.details[`sample_${i + 1}_flags_byte`];

                const isLeading = (byte >> 6) & 0x03;
                const dependsOn = (byte >> 4) & 0x03;
                const isDependedOn = (byte >> 2) & 0x03;
                const hasRedundancy = byte & 0x03;

                const baseOffset = box.offset + p.offset - 1;

                box.details[`sample_${i + 1}_is_leading`] = {
                    value: IS_LEADING_MAP[isLeading] || 'Reserved',
                    offset: baseOffset,
                    length: 0.25,
                };
                box.details[`sample_${i + 1}_sample_depends_on`] = {
                    value: SAMPLE_DEPENDS_ON_MAP[dependsOn] || 'Reserved',
                    offset: baseOffset,
                    length: 0.25,
                };
                box.details[`sample_${i + 1}_sample_is_depended_on`] = {
                    value: SAMPLE_IS_DEPENDED_ON_MAP[isDependedOn] || 'Reserved',
                    offset: baseOffset,
                    length: 0.25,
                };
                box.details[`sample_${i + 1}_sample_has_redundancy`] = {
                    value: SAMPLE_HAS_REDUNDANCY_MAP[hasRedundancy] || 'Reserved',
                    offset: baseOffset,
                    length: 0.25,
                };
            } else {
                p.offset += 1;
            }
        }
        if (sampleCount > maxEntriesToShow) {
            box.details['...more_entries'] = {
                value: `${
                    sampleCount - maxEntriesToShow
                } more entries not shown but parsed`,
                offset: 0,
                length: 0,
            };
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
    'sdtp@sample_1_is_leading': {
        text: 'Indicates if this is a leading sample, which has a decoding time before its presentation time. (e.g., a B-frame that is decoded after a P-frame but displayed before it).',
        ref: 'ISO/IEC 14496-12, 8.6.4.3',
    },
    'sdtp@sample_1_sample_depends_on': {
        text: 'Indicates inter-sample dependency. A value of 2 ("Does not depend on others") marks a random access point (I-frame).',
        ref: 'ISO/IEC 14496-12, 8.6.4.3',
    },
    'sdtp@sample_1_sample_is_depended_on': {
        text: 'Indicates if other samples depend on this one. If no other samples depend on it, it may be disposable during trick modes.',
        ref: 'ISO/IEC 14496-12, 8.6.4.3',
    },
    'sdtp@sample_1_sample_has_redundancy': {
        text: 'Indicates if there is redundant coding in this sample, which could be used for error resilience.',
        ref: 'ISO/IEC 14496-12, 8.6.4.3',
    },
};