import { decodeSampleFlags } from '../sample-flags.js';
import { BoxParser } from '../utils.js';

const TRUN_FLAGS_SCHEMA = {
    0x000001: 'data_offset_present',
    0x000004: 'first_sample_flags_present',
    0x000100: 'sample_duration_present',
    0x000200: 'sample_size_present',
    0x000400: 'sample_flags_present',
    0x000800: 'sample_composition_time_offsets_present',
};

/**
 * @param {import('@/types.js').Box} box
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
    // ARCHITECTURAL REFACTOR: Do not build the sample array here.
    // The main parser will do this later from a canonical source.
    // This parser is now only responsible for metadata.
    // box.samples = [];

    if (flags.data_offset_present) {
        p.readInt32('data_offset');
    }

    if (flags.first_sample_flags_present) {
        const flagsInt = p.readUint32('first_sample_flags_raw');
        if (flagsInt !== null) {
            const firstSampleFlags = decodeSampleFlags(flagsInt);
            box.details['first_sample_flags'] = {
                ...box.details['first_sample_flags_raw'],
                value: firstSampleFlags,
            };
            delete box.details['first_sample_flags_raw'];
        }
    }

    if (sampleCount !== null) {
        // Skip the sample data loop as we no longer parse it here.
        // Calculate the size of the sample loop to skip it efficiently.
        let sampleLoopSize = 0;
        if (flags.sample_duration_present) sampleLoopSize += 4;
        if (flags.sample_size_present) sampleLoopSize += 4;
        if (flags.sample_flags_present) sampleLoopSize += 4;
        if (flags.sample_composition_time_offsets_present) sampleLoopSize += 4;

        const totalSampleDataSize = sampleCount * sampleLoopSize;
        if (p.checkBounds(totalSampleDataSize)) {
            p.skip(totalSampleDataSize, 'sample_data_loop');
        }
    }
    p.finalize();
}

export const trunTooltip = {
    trun: {
        name: 'Track Fragment Run Box',
        text: 'Describes a contiguous run of samples within a track fragment. It provides sample-specific information like duration, size, flags, and composition time offset, or relies on defaults from `tfhd` and `trex`.',
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
