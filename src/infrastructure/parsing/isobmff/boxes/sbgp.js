import { BoxParser } from '../utils.js';

/**
 * Parses the 'sbgp' (Sample to Group) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSbgp(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    p.readString(4, 'grouping_type');

    if (version === 1) {
        p.readUint32('grouping_type_parameter');
    }

    const entryCount = p.readUint32('entry_count');
    box.entries = [];

    if (entryCount !== null) {
        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;
            const countField = `entry_${i}_sample_count`;
            const groupIndexField = `entry_${i}_group_description_index`;
            const sample_count = p.readUint32(countField);
            const group_description_index = p.readUint32(groupIndexField);

            if (sample_count !== null && group_description_index !== null) {
                box.details[countField].internal = true;
                box.details[groupIndexField].internal = true;
                box.entries.push({ sample_count, group_description_index });
            }
        }
    }
    p.finalize();
}

export const sbgpTooltip = {
    sbgp: {
        name: 'Sample to Group Box',
        text: 'Sample to Group Box (`sbgp`). Maps each sample in a track to a group. The characteristics of each group are defined in a corresponding Sample Group Description Box (`sgpd`). This is a generic mechanism used for features like random access points (`rap `) or temporal levels (`tele`).',
        ref: 'ISO/IEC 14496-12, 8.9.2',
    },
    'sbgp@grouping_type': {
        text: 'A four-character code indicating the criterion used to group the samples (e.g., "rap " for random access points, "roll" for gradual decoding refresh). This links the `sbgp` to its corresponding `sgpd`.',
        ref: 'ISO/IEC 14496-12, 8.9.2.3',
    },
    'sbgp@grouping_type_parameter': {
        text: 'An optional parameter that provides additional information for the grouping (only present if box version is 1).',
        ref: 'ISO/IEC 14496-12, 8.9.2.2',
    },
    'sbgp@entry_count': {
        text: 'The number of entries in the run-length encoded table that maps runs of samples to group descriptions.',
        ref: 'ISO/IEC 14496-12, 8.9.2.2',
    },
    'sbgp@count': {
        text: 'The number of consecutive samples that belong to the same group.',
        ref: 'ISO/IEC 14496-12, 8.9.2.3',
    },
    'sbgp@groupIndex': {
        text: 'The 1-based index into the `sgpd` box that describes this group of samples.',
        ref: 'ISO/IEC 14496-12, 8.9.2.3',
    },
};