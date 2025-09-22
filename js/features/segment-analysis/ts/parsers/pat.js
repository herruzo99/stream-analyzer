// Parses the payload of a Program Association Table (PAT) section.
// Extracts the mapping between program_number and the PID for the
// corresponding Program Map Table (PMT).

/**
 * Parses the program associations from a PAT section payload.
 * @param {DataView} view - A DataView of the PAT section's payload.
 * @param {number} baseOffset - The offset of the payload within the segment.
 * @returns {object} An object containing the parsed PAT data.
 */
export function parsePatPayload(view, baseOffset) {
    const programs = [];
    for (let offset = 0; offset < view.byteLength; offset += 4) {
        const programNum = view.getUint16(offset);
        const pid = view.getUint16(offset + 2) & 0x1fff;

        if (programNum === 0) {
            programs.push({ type: 'network', pid: { value: pid, offset: baseOffset + offset + 2, length: 1.625 } });
        } else {
            programs.push({
                type: 'program',
                program_number: { value: programNum, offset: baseOffset + offset, length: 2 },
                program_map_PID: { value: pid, offset: baseOffset + offset + 2, length: 1.625 }
            });
        }
    }
    return { type: 'PAT', programs };
}

export const patTooltipData = {
    PAT: {
        text: 'Program Association Table. Lists all programs in a stream, mapping each to the PID of its Program Map Table (PMT).',
        ref: 'Clause 2.4.4.4',
    },
    'PAT@network_pid': {
        text: 'The PID for the Network Information Table (NIT).',
        ref: 'Table 2-30',
    },
    'PAT@program_map_PID': {
        text: 'The PID of the Transport Stream packets which shall contain the Program Map Table for this program.',
        ref: 'Table 2-30',
    }
};