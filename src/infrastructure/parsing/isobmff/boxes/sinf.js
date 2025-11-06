/**
 * Parses the 'sinf' (Protection Scheme Information) container box.
 * This box is a container for protection-related boxes like 'frma', 'schm', and 'schi'.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseSinf(box, view) {
    // This is a container box. Its children will be parsed by the main parser.
}

export const sinfTooltip = {
    sinf: {
        name: 'Protection Scheme Information Box',
        text: 'Protection Scheme Information Box (`sinf`). A container for all information required to understand and handle an encrypted stream. It is a child of an encrypted sample entry (e.g., `encv`, `enca`) and typically contains an `frma`, `schm`, and `schi` box.',
        ref: 'ISO/IEC 14496-12, 8.12.1',
    },
};
