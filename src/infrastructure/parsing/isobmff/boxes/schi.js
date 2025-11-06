/**
 * Parses the 'schi' (Scheme Information) container box.
 * This box is a container for scheme-specific data.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseSchi(box, view) {
    // This is a container box. Its children will be parsed by the main parser.
}

export const schiTooltip = {
    schi: {
        name: 'Scheme Information Box',
        text: 'Scheme Information Box (`schi`). A container for scheme-specific data required by a protection system. Its content is opaque to a generic player but is interpreted by the specific DRM system identified in the `schm` box (e.g., it might contain a `tenc` box for CENC).',
        ref: 'ISO/IEC 14496-12, 8.12.6',
    },
};
