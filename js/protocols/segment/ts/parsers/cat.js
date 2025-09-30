import { parseDescriptors } from './descriptors/index.js';

// Parses the payload of a Conditional Access Table (CAT) section.
// Extracts descriptors that provide information about CA systems,
// such as the location of Entitlement Management Message (EMM) streams.

/**
 * Parses descriptors from a CAT section payload.
 * @param {DataView} view - A DataView of the CAT section's payload.
 * @param {number} baseOffset - The offset of the payload within the segment.
 * @returns {object} An object containing parsed CAT information.
 */
export function parseCatPayload(view, baseOffset) {
    return {
        type: 'CAT',
        descriptors: parseDescriptors(view, baseOffset),
    };
}

export const catTooltipData = {
    CAT: {
        text: 'Conditional Access Table. Provides information on CA systems used in the multiplex.',
        ref: 'Clause 2.4.4.7',
    },
};
