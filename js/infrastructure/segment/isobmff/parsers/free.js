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
        text: 'The contents of this box are irrelevant and may be ignored. It is used to reserve space.',
        ref: 'ISO/IEC 14496-12, 8.1.2',
    },
    skip: {
        name: 'Skip Box',
        text: 'An alternative type for a free space box. The contents are irrelevant.',
        ref: 'ISO/IEC 14496-12, 8.1.2',
    },
};
