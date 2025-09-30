import { BoxParser } from '../utils.js';

/**
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseTrun(box, view) {
    const p = new BoxParser(box, view);
    const { version, flags } = p.readVersionAndFlags();

    if (flags === null) {
        p.finalize();
        return;
    }

    const sampleCount = p.readUint32('sample_count');
    box.samples = []; // Initialize samples array

    if (flags & 0x000001) {
        // data_offset_present
        p.readInt32('data_offset');
    }
    let firstSampleFlags = null;
    if (flags & 0x000004) {
        // first_sample_flags_present
        const firstSampleFlagsDword = p.readUint32('first_sample_flags_dword');
        if (firstSampleFlagsDword !== null) {
            delete box.details['first_sample_flags_dword'];
            firstSampleFlags = firstSampleFlagsDword;
            box.details['first_sample_flags'] = {
                value: `0x${firstSampleFlags.toString(16)}`,
                offset:
                    box.details['first_sample_flags_dword']?.offset ||
                    p.box.offset + p.offset - 4,
                length: 4,
            };
        }
    }

    if (sampleCount !== null) {
        for (let i = 0; i < sampleCount; i++) {
            if (p.stopped) break;

            const sample = {};
            if (flags & 0x000100) {
                sample.duration = p.view.getUint32(p.offset);
                p.offset += 4;
            }
            if (flags & 0x000200) {
                sample.size = p.view.getUint32(p.offset);
                p.offset += 4;
            }
            if (flags & 0x000400) {
                sample.flags = p.view.getUint32(p.offset);
                p.offset += 4;
            }
            if (i === 0 && firstSampleFlags !== null) {
                sample.flags = firstSampleFlags;
            }

            if (flags & 0x000800) {
                if (version === 0) {
                    sample.compositionTimeOffset = p.view.getUint32(p.offset);
                } else {
                    sample.compositionTimeOffset = p.view.getInt32(p.offset);
                }
                p.offset += 4;
            }
            box.samples.push(sample);
        }
    }
    p.finalize();
}

export const trunTooltip = {
    trun: {
        name: 'Track Run',
        text: 'Contains timing, size, and flags for a run of samples.',
        ref: 'ISO/IEC 14496-12, 8.8.8',
    },
    'trun@version': {
        text: 'Version of this box (0 or 1). Affects signed/unsigned composition time.',
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
        text: 'An optional offset added to the base_data_offset.',
        ref: 'ISO/IEC 14496-12, 8.8.8.3',
    },
    'trun@first_sample_flags': {
        text: 'Flags for the first sample, overriding the default.',
        ref: 'ISO/IEC 14496-12, 8.8.8.3',
    },
    'trun@sample_1_details': {
        text: 'A summary of the per-sample data fields for the first sample in this run.',
        ref: 'ISO/IEC 14496-12, 8.8.8.2',
    },
};
