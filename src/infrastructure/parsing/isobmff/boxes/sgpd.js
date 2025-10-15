import { BoxParser } from '../utils.js';

/**
 * Parses the 'sgpd' (Sample Group Description) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSgpd(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    const groupingType = p.readString(4, 'grouping_type');

    let defaultLength = 0;
    if (version === 1) {
        defaultLength = p.readUint32('default_length');
    }

    if (version >= 2) {
        p.readUint32('default_sample_description_index');
    }

    const entryCount = p.readUint32('entry_count');

    if (entryCount !== null) {
        for (let i = 0; i < entryCount; i++) {
            if (p.stopped) break;

            let descriptionLength = defaultLength;
            if (version === 1 && defaultLength === 0) {
                const len = p.readUint32(`entry_${i + 1}_description_length`);
                if (len === null) break;
                descriptionLength = len;
            }

            const entryPrefix = `entry_${i + 1}`;
            const entryStartOffset = p.offset;

            // --- DEEP PARSING LOGIC ---
            switch (groupingType) {
                case 'roll':
                    // VisualRollRecoveryEntry or AudioRollRecoveryEntry
                    p.readInt16(`${entryPrefix}_roll_distance`);
                    if (version === 0) descriptionLength = 2; // Implicit size for v0
                    break;
                // Add other known group types here in the future
                default:
                    // Fallback for unknown types
                    if (version === 0) {
                        p.addIssue(
                            'warn',
                            `Cannot determine entry size for unknown grouping_type '${groupingType}' with version 0. Parsing of this box may be incomplete.`
                        );
                        p.readRemainingBytes('unparsed_sgpd_entries');
                        // Use a break that exits the for-loop
                        i = entryCount;
                    }
                    break;
            }

            if (descriptionLength > 0 && p.offset === entryStartOffset) {
                // If we didn't parse a known type, skip the bytes
                p.skip(descriptionLength, `${entryPrefix}_description_data`);
            }
        }
    }

    p.finalize();
}

export const sgpdTooltip = {
    sgpd: {
        name: 'Sample Group Description Box',
        text: 'Sample Group Description Box (`sgpd`). Provides the description for each sample group defined in a `sbgp` box. The format of the description depends on the `grouping_type`.',
        ref: 'ISO/IEC 14496-12, 8.9.3',
    },
    'sgpd@grouping_type': {
        text: 'A four-character code that links this description box to a `sbgp` box with the same type.',
        ref: 'ISO/IEC 14496-12, 8.9.3.3',
    },
    'sgpd@default_length': {
        text: '(Version 1+) Specifies the default length of each group description entry. If 0, each entry has its own `description_length` field.',
        ref: 'ISO/IEC 14496-12, 8.9.3.2',
    },
    'sgpd@default_sample_description_index': {
        text: '(Version 2+) The index of the sample group description entry that applies to all samples not explicitly mapped in the `sbgp` box.',
        ref: 'ISO/IEC 14496-12, 8.9.3.2',
    },
    'sgpd@entry_count': {
        text: 'The number of sample group description entries that follow.',
        ref: 'ISO/IEC 14496-12, 8.9.3.3',
    },
    'sgpd@entry_1_roll_distance': {
        text: 'For a "roll" group, this is a signed integer indicating the number of samples required for gradual decoding refresh. A negative value indicates pre-roll, and a positive value indicates post-roll.',
        ref: 'ISO/IEC 14496-12, 10.1.1.3',
    },
};
