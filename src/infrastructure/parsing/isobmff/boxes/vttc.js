import { BoxParser } from '../utils.js';

/**
 * Parses the 'vttC' (WebVTT Configuration) box.
 * ISO/IEC 14496-30:2014
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseVttC(box, view) {
    const p = new BoxParser(box, view);
    // The vttC box contains the text configuration as a utf-8 string
    p.readRemainingBytes('config');

    // Attempt to decode the config string for display
    if (box.details.config && box.details.config.length > 0) {
        const configBytes = new Uint8Array(
            p.view.buffer,
            p.view.byteOffset + box.details.config.offset - p.box.offset,
            box.details.config.length
        );
        const configStr = new TextDecoder('utf-8').decode(configBytes);
        box.details.config.value = configStr;
    }

    p.finalize();
}

export const vttCTooltip = {
    vttC: {
        name: 'WebVTT Configuration Box',
        text: 'WebVTT Configuration Box (`vttC`). Contains the WebVTT file header information (e.g., WEBVTT header, regions, styles) that applies to the entire track.',
        ref: 'ISO/IEC 14496-30',
    },
    'vttC@config': {
        text: 'The UTF-8 encoded configuration string, typically containing the WEBVTT signature and global style/region definitions.',
        ref: 'ISO/IEC 14496-30',
    },
};
