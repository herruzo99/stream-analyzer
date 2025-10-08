/**
 * Parses the 'schi' (Scheme Information) container box.
 * This box is a container for scheme-specific data.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseSchi(box, view) {
    // This is a container box. Its children will be parsed by the main parser.
}

export const schiTooltip = {
    schi: {
        name: 'Scheme Information Box',
        text: 'A container for boxes with scheme-specific data needed by the protection system.',
        ref: 'ISO/IEC 14496-12, 8.12.6',
    },
};
