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

        /** Helper to read variable-length integers and populate details */
        const readVarBytes = (len) => {
            if (!p.checkBounds(len)) return null;
            let value = 0;
            for (let k = 0; k < len; k++) {
                value = (value << 8) | p.view.getUint8(p.offset + k);
            }
            p.offset += len;
            return value;
        };

        const numberOfEntries = p.readUint32('number_of_entries');
        box.entries = [];

        if (numberOfEntries !== null) {
            for (let i = 0; i < numberOfEntries; i++) {
                if (p.stopped) break;

                const time =
                    version === 1
                        ? p.readBigUint64(`entry_${i}_time`)
                        : p.readUint32(`entry_${i}_time`);
                const moofOffset =
                    version === 1
                        ? p.readBigUint64(`entry_${i}_moof_offset`)
                        : p.readUint32(`entry_${i}_moof_offset`);

                const trafNumber = readVarBytes(length_size_of_traf_num);
                const trunNumber = readVarBytes(length_size_of_trun_num);
                const sampleNumber = readVarBytes(length_size_of_sample_num);

                if (
                    time === null ||
                    moofOffset === null ||
                    trafNumber === null ||
                    trunNumber === null ||
                    sampleNumber === null
                ) {
                    break;
                }

                box.entries.push({
                    time: Number(time),
                    moofOffset: Number(moofOffset),
                    trafNumber,
                    trunNumber,
                    sampleNumber,
                });
            }
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
    'tfra@time': {
        text: "The presentation time of the sync sample in the media's timescale.",
        ref: 'ISO/IEC 14496-12, 8.8.10.3',
    },
    'tfra@moofOffset': {
        text: 'The absolute file offset of the beginning of the `moof` box that contains the sync sample.',
        ref: 'ISO/IEC 14496-12, 8.8.10.3',
    },
    'tfra@trafNumber': {
        text: 'The 1-based index of the `traf` box within the `moof` that contains the sync sample.',
        ref: 'ISO/IEC 14496-12, 8.8.10.3',
    },
    'tfra@trunNumber': {
        text: 'The 1-based index of the `trun` box within the `traf` that contains the sync sample.',
        ref: 'ISO/IEC 14496-12, 8.8.10.3',
    },
    'tfra@sampleNumber': {
        text: 'The 1-based index of the sync sample within the `trun`.',
        ref: 'ISO/IEC 14496-12, 8.8.10.3',
    },
};
