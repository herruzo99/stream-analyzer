import { BoxParser } from '../utils.js';

const TRUN_FLAGS_SCHEMA = {
    0x000001: 'data_offset_present',
    0x000004: 'first_sample_flags_present',
    0x000100: 'sample_duration_present',
    0x000200: 'sample_size_present',
    0x000400: 'sample_flags_present',
    0x000800: 'sample_composition_time_offsets_present',
};

const IS_LEADING_MAP = {
    0: 'Unknown',
    1: 'Leading with dependency (not decodable)',
    2: 'Not a leading sample',
    3: 'Leading with no dependency (decodable)',
};

const SAMPLE_DEPENDS_ON_MAP = [
    'Unknown',
    'Depends on others (not an I-picture)',
    'Does not depend on others (I-picture)',
    'Reserved',
];
const SAMPLE_IS_DEPENDED_ON_MAP = [
    'Unknown',
    'Others may depend on this sample',
    'No other sample depends on this one (disposable)',
    'Reserved',
];
const SAMPLE_HAS_REDUNDANCY_MAP = [
    'Unknown',
    'Has redundant coding',
    'No redundant coding',
    'Reserved',
];

/**
 * Decodes a 32-bit sample flags integer into a structured object.
 * @param {number} flagsInt - The raw 32-bit integer for the flags.
 * @returns {object} A structured object with decoded flag properties.
 */
function decodeSampleFlags(flagsInt) {
    const isLeadingValue = (flagsInt >> 26) & 0x03;
    return {
        is_leading: IS_LEADING_MAP[isLeadingValue] || 'Reserved',
        sample_depends_on:
            SAMPLE_DEPENDS_ON_MAP[(flagsInt >> 24) & 0x03] || 'Reserved',
        sample_is_depended_on:
            SAMPLE_IS_DEPENDED_ON_MAP[(flagsInt >> 22) & 0x03] || 'Reserved',
        sample_has_redundancy:
            SAMPLE_HAS_REDUNDANCY_MAP[(flagsInt >> 20) & 0x03] || 'Reserved',
        sample_padding_value: (flagsInt >> 17) & 0x07,
        sample_is_non_sync_sample: ((flagsInt >> 16) & 0x01) === 1,
        sample_degradation_priority: flagsInt & 0xffff,
    };
}

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 * @param {object} context
 */
export function parseTrun(box, view, context) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags(TRUN_FLAGS_SCHEMA);
    const flags = box.details.flags.value;

    if (version === null) {
        p.finalize();
        return;
    }

    const sampleCount = p.readUint32('sample_count');
    box.samples = [];

    if (flags.data_offset_present) {
        p.readInt32('data_offset');
    }

    let firstSampleFlags = null;
    if (flags.first_sample_flags_present) {
        const flagsInt = p.readUint32('first_sample_flags_raw');
        if (flagsInt !== null) {
            firstSampleFlags = decodeSampleFlags(flagsInt);
            box.details['first_sample_flags'] = {
                ...box.details['first_sample_flags_raw'],
                value: firstSampleFlags,
            };
            delete box.details['first_sample_flags_raw'];
        }
    }

    if (sampleCount !== null) {
        for (let i = 0; i < sampleCount; i++) {
            if (p.stopped) break;

            const sample = {};

            if (flags.sample_duration_present) {
                sample.duration = p.readUint32(`sample_duration_${i}`);
                delete box.details[`sample_duration_${i}`];
            }

            if (flags.sample_size_present) {
                sample.size = p.readUint32(`sample_size_${i}`);
                delete box.details[`sample_size_${i}`];
            }

            if (flags.first_sample_flags_present && i === 0) {
                sample.sampleFlags = firstSampleFlags;
            } else if (flags.sample_flags_present) {
                const localFlagsInt = p.readUint32(`sample_flags_${i}`);
                if (localFlagsInt !== null) {
                    sample.sampleFlags = decodeSampleFlags(localFlagsInt);
                }
                delete box.details[`sample_flags_${i}`];
            }

            if (flags.sample_composition_time_offsets_present) {
                if (version === 0) {
                    sample.compositionTimeOffset = p.readUint32(
                        `composition_time_offset_${i}`
                    );
                } else {
                    sample.compositionTimeOffset = p.readInt32(
                        `composition_time_offset_${i}`
                    );
                }
                delete box.details[`composition_time_offset_${i}`];
            }
            box.samples.push(sample);
        }
    }
    p.finalize();
}

export const trunTooltip = {
    trun: {
        name: 'Track Fragment Run Box',
        text: 'Track Fragment Run Box (`trun`). Describes a contiguous run of samples within a track fragment. It provides sample-specific information like duration, size, flags, and composition time offset, or relies on defaults from `tfhd` and `trex`.',
        ref: 'ISO/IEC 14496-12, 8.8.8',
    },
    'trun@version': {
        text: 'Version of this box (0 or 1). Affects whether `sample_composition_time_offset` is signed (version 1) or unsigned (version 0).',
        ref: 'ISO/IEC 14496-12, 8.8.8.2',
    },
    'trun@flags': {
        text: 'A bitfield indicating which optional per-sample fields are present.',
        ref: 'ISO/IEC 14496-12, 8.8.8.2',
    },
    'trun@sample_count': {
        text: 'The number of samples in this run.',
        ref: 'ISO/IEC 14496-12, 8.8.8.3',
    },
    'trun@data_offset': {
        text: 'An optional signed integer that specifies the offset in bytes from the `base_data_offset` (in `tfhd`) to the first sample in this run.',
        ref: 'ISO/IEC 14496-12, 8.8.8.3',
    },
    'trun@first_sample_flags': {
        text: 'An optional set of flags that override the default flags for the first sample in this run only. Useful for marking a single sync sample at the start of a run of non-sync samples.',
        ref: 'ISO/IEC 14496-12, 8.8.8.3',
    },
    'trun@duration': {
        text: 'The duration of this sample.',
        ref: 'ISO/IEC 14496-12, 8.8.8.2',
    },
    'trun@size': {
        text: 'The size of this sample in bytes.',
        ref: 'ISO/IEC 14496-12, 8.8.8.2',
    },
    'trun@sampleFlags': {
        text: 'Flags for this sample, indicating dependency and sync information.',
        ref: 'ISO/IEC 14496-12, 8.8.8.2',
    },
    'trun@compositionTimeOffset': {
        text: 'The composition time offset for this sample.',
        ref: 'ISO/IEC 14496-12, 8.8.8.2',
    },
};
