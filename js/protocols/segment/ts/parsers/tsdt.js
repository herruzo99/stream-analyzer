import { parseDescriptors } from './descriptors/index.js';

// Parses the payload of a Transport Stream Description Table (TSDT) section.
// Extracts descriptors that apply to the entire transport stream.

/**
 * Parses descriptors from a TSDT section payload.
 * @param {DataView} view - A DataView of the TSDT section's payload.
 * @param {number} baseOffset - The offset of the payload within the segment.
 * @returns {object} An object containing parsed TSDT information.
 */
export function parseTsdtPayload(view, baseOffset) {
    return {
        type: 'TSDT',
        descriptors: parseDescriptors(view, baseOffset),
    };
}

export const tsdtTooltipData = {
    TSDT: {
        text: 'Transport Stream Description Table. Contains descriptors that apply to the entire transport stream.',
        ref: 'Clause 2.4.4.13',
    },
};
