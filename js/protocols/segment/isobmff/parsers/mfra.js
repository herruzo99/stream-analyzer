/**
 * Parses the 'mfra' (Movie Fragment Random Access) container box.
 * This box is a container for 'tfra' and 'mfro' boxes.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseMfra(box, view) {
    // This is a container box. Its children ('tfra', 'mfro') will be parsed by the main parser.
}

export const mfraTooltip = {
    mfra: {
        name: 'Movie Fragment Random Access',
        text: 'A container for random access information for movie fragments, often found at the end of the file.',
        ref: 'ISO/IEC 14496-12, 8.8.9',
    },
};
