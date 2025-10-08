import { BoxParser } from '../utils.js';

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
            const entryPrefix = `sample_${i + 1}`;

            if (i < maxEntriesToShow) {
                const byte = p.readUint8(`${entryPrefix}_flags_byte`);
                if (byte === null) break;

                delete box.details[`${entryPrefix}_flags_byte`];

                box.details[`${entryPrefix}_is_leading`] = {
                    value: (byte >> 6) & 0x03,
                    offset: box.offset + p.offset - 1,
                    length: 0.25,
                };
                box.details[`${entryPrefix}_sample_depends_on`] = {
                    value: (byte >> 4) & 0x03,
                    offset: box.offset + p.offset - 1,
                    length: 0.25,
                };
                box.details[`${entryPrefix}_sample_is_depended_on`] = {
                    value: (byte >> 2) & 0x03,
                    offset: box.offset + p.offset - 1,
                    length: 0.25,
                };
                box.details[`${entryPrefix}_sample_has_redundancy`] = {
                    value: byte & 0x03,
                    offset: box.offset + p.offset - 1,
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
        name: 'Independent and Disposable Samples',
        text: 'Provides detailed dependency information for each sample in the track.',
        ref: 'ISO/IEC 14496-12, 8.6.4',
    },
    'sdtp@sample_1_is_leading': {
        text: 'Leading nature of the sample (0:unknown, 1:leading with dependency, 2:not leading, 3:leading without dependency).',
        ref: 'ISO/IEC 14496-12, 8.6.4.3',
    },
    'sdtp@sample_1_sample_depends_on': {
        text: 'Sample dependency (0:unknown, 1:depends on others (not I-frame), 2:does not depend on others (I-frame)).',
        ref: 'ISO/IEC 14496-12, 8.6.4.3',
    },
    'sdtp@sample_1_sample_is_depended_on': {
        text: 'Whether other samples depend on this one (0:unknown, 1:others may depend, 2:disposable).',
        ref: 'ISO/IEC 14496-12, 8.6.4.3',
    },
    'sdtp@sample_1_sample_has_redundancy': {
        text: 'Redundant coding (0:unknown, 1:has redundant coding, 2:no redundant coding).',
        ref: 'ISO/IEC 14496-12, 8.6.4.3',
    },
};
