import { BoxParser } from '../utils.js';

/**
 * Parses the 'tfra' (Track Fragment Random Access) box.
 * @param {import('../parser.js').Box} box
 * @param {DataView} view
 */
export function parseTfra(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    p.readUint32('track_ID');

    const lengthSizes = p.readUint32('length_sizes_raw');
    if (lengthSizes !== null) {
        const length_size_of_traf_num = ((lengthSizes >> 4) & 0x03) + 1;
        const length_size_of_trun_num = ((lengthSizes >> 2) & 0x03) + 1;
        const length_size_of_sample_num = (lengthSizes & 0x03) + 1;
        box.details['length_sizes'] = {
            value: `traf=${length_size_of_traf_num}, trun=${length_size_of_trun_num}, sample=${length_size_of_sample_num}`,
            offset: box.details['length_sizes_raw'].offset,
            length: 4,
        };
        delete box.details['length_sizes_raw'];

        const numberOfEntries = p.readUint32('number_of_entries');
        if (numberOfEntries !== null && numberOfEntries > 0) {
            if (version === 1) {
                p.readBigUint64('entry_1_time');
                p.readBigUint64('entry_1_moof_offset');
            } else {
                p.readUint32('entry_1_time');
                p.readUint32('entry_1_moof_offset');
            }
            p.skip(length_size_of_traf_num, 'entry_1_traf_number');
            p.skip(length_size_of_trun_num, 'entry_1_trun_number');
            p.skip(length_size_of_sample_num, 'entry_1_sample_number');
        }
    }

    p.finalize();
}

export const tfraTooltip = {
    tfra: {
        name: 'Track Fragment Random Access Box',
        text: 'Track Fragment Random Access Box (`tfra`). Contains a table that provides a direct mapping from the presentation time of sync samples to their location within the file. This is an index that allows for efficient seeking in fragmented MP4 files without parsing all `moof` boxes.',
        ref: 'ISO/IEC 14496-12, 8.8.10',
    },
    'tfra@track_ID': {
        text: 'The ID of the track that this random access table refers to.',
        ref: 'ISO/IEC 14496-12, 8.8.10.3',
    },
    'tfra@length_sizes': {
        text: 'Defines the size in bytes of the `traf_number`, `trun_number`, and `sample_number` fields in each entry, allowing for compact representation.',
        ref: 'ISO/IEC 14496-12, 8.8.10.3',
    },
    'tfra@number_of_entries': {
        text: 'The number of random access point entries in the table that follows.',
        ref: 'ISO/IEC 14496-12, 8.8.10.3',
    },
    'tfra@entry_1_time': {
        text: "For the first entry, this is the presentation time of the sync sample in the media's timescale.",
        ref: 'ISO/IEC 14496-12, 8.8.10.3',
    },
    'tfra@entry_1_moof_offset': {
        text: 'For the first entry, this is the absolute file offset of the beginning of the `moof` box that contains the sync sample.',
        ref: 'ISO/IEC 14496-12, 8.8.10.3',
    },
    'tfra@entry_1_traf_number': {
        text: 'For the first entry, this is the 1-based index of the `traf` box within the `moof` that contains the sync sample.',
        ref: 'ISO/IEC 14496-12, 8.8.10.3',
    },
    'tfra@entry_1_trun_number': {
        text: 'For the first entry, this is the 1-based index of the `trun` box within the `traf` that contains the sync sample.',
        ref: 'ISO/IEC 14496-12, 8.8.10.3',
    },
    'tfra@entry_1_sample_number': {
        text: 'For the first entry, this is the 1-based index of the sync sample within the `trun`.',
        ref: 'ISO/IEC 14496-12, 8.8.10.3',
    },
};
