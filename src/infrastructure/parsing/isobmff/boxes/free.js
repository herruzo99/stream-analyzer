import { BoxParser } from '../utils.js';

/**
 * Parses the 'free' or 'skip' (Free Space) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseFree(box, view) {
    const p = new BoxParser(box, view);
    p.readRemainingBytes('data');
    p.finalize();
}

export const freeTooltip = {
    free: {
        name: 'Free Space Box',
        text: 'Free Space Box (`free`). A placeholder box whose contents are irrelevant and can be ignored. It is often used to reserve space for future metadata edits without rewriting the entire file.',
        ref: 'ISO/IEC 14496-12, 8.1.2',
    },
    skip: {
        name: 'Skip Box',
        text: 'Skip Box (`skip`). Functionally identical to the `free` box. Its contents are irrelevant and can be ignored.',
        ref: 'ISO/IEC 14496-12, 8.1.2',
    },
};