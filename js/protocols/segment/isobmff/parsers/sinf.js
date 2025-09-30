/**
 * Parses the 'sinf' (Protection Scheme Information) container box.
 * This box is a container for protection-related boxes like 'frma', 'schm', and 'schi'.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSinf(box, view) {
    // This is a container box. Its children will be parsed by the main parser.
}

export const sinfTooltip = {
    sinf: {
        name: 'Protection Scheme Information',
        text: 'A container for all information required to understand the encryption transform applied.',
        ref: 'ISO/IEC 14496-12, 8.12.1',
    },
};
