import { BoxParser } from '../utils.js';

/**
 * Parses the 'wvtt' (WebVTT Sample Entry) box.
 * ISO/IEC 14496-30:2014
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseWvtt(box, view) {
    const p = new BoxParser(box, view);

    // From SampleEntry
    p.skip(6, 'reserved_sample_entry');
    p.readUint16('data_reference_index');

    // wvtt is a container box that holds vttC and other optional boxes
    // The main parser loop handles the children.
    // We do not call p.finalize() here.
}

export const wvttTooltip = {
    wvtt: {
        name: 'WebVTT Sample Entry',
        text: 'WebVTT Sample Entry (`wvtt`). The sample entry for WebVTT tracks carried in ISOBMFF. It contains the `vttC` configuration box and potentially `vlab` (label) boxes.',
        ref: 'ISO/IEC 14496-30',
    },
    'wvtt@data_reference_index': {
        text: 'Index into the Data Reference Box (`dref`) that identifies the file or resource containing the media data for this track.',
        ref: 'ISO/IEC 14496-12, 8.5.2.2',
    },
};
