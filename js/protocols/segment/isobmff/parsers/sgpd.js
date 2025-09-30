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
        name: 'Sample Group Description',
        text: 'Contains a sample group entry for each sample group, describing its properties.',
        ref: 'ISO/IEC 14496-12, 8.9.3',
    },
    'sgpd@grouping_type': {
        text: 'The type of grouping that these descriptions apply to. Must match the type in the `sbgp` box.',
        ref: 'ISO/IEC 14496-12, 8.9.3.3',
    },
    'sgpd@entry_count': {
        text: 'The number of sample group description entries that follow.',
        ref: 'ISO/IEC 14496-12, 8.9.3.3',
    },
    'sgpd@entry_1_roll_distance': {
        text: 'For "roll" groups, a signed integer indicating the number of samples (before or after) needed for a clean random access point.',
        ref: 'ISO/IEC 14496-12, 10.1.1.3',
    },
};
