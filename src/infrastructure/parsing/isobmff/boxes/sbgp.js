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

    if (entryCount !== null && entryCount > 0) {
        p.readUint32('entry_1_sample_count');
        p.readUint32('entry_1_group_description_index');
    }
    p.finalize();
}

export const sbgpTooltip = {
    sbgp: {
        name: 'Sample to Group',
        text: 'Assigns samples to a specific group, described in the Sample Group Description Box (sgpd).',
        ref: 'ISO/IEC 14496-12, 8.9.2',
    },
    'sbgp@grouping_type': {
        text: 'A code indicating the criterion used to group the samples (e.g., "rap " for random access points).',
        ref: 'ISO/IEC 14496-12, 8.9.2.3',
    },
    'sbgp@grouping_type_parameter': {
        text: 'A parameter providing additional information for the grouping (only in version 1).',
        ref: 'ISO/IEC 14496-12, 8.9.2.3',
    },
    'sbgp@entry_count': {
        text: 'The number of entries mapping sample runs to group descriptions.',
        ref: 'ISO/IEC 14496-12, 8.9.2.3',
    },
};
