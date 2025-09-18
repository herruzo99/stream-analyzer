import { html, render } from 'lit-html';
import { analysisState, dom } from '../state.js';
import { parseTsSegment, tsAnalysisTemplate } from './ts-parser.js';

// --- CONSTANTS ---
// Exhaustive ISOBMFF box tooltips have been retained as they are parser-specific metadata.
const tooltipData = {
    'ftyp': { name: "File Type", text: "Declares the file's brand and compatibility.", ref: 'ISO/IEC 14496-12, 4.3' },
    'ftyp@Major Brand': { text: "The 'best use' specification for the file.", ref: 'ISO/IEC 14496-12, 4.3.3' },
    'ftyp@Minor Version': { text: "An informative integer for the minor version of the major brand.", ref: 'ISO/IEC 14496-12, 4.3.3' },
    'ftyp@Compatible Brands': { text: "A list of other specifications to which the file complies.", ref: 'ISO/IEC 14496-12, 4.3.3' },
    'styp': { name: "Segment Type", text: "Declares the segment's brand and compatibility.", ref: 'ISO/IEC 14496-12, 8.16.2' },
    // NOTE: styp fields share the same semantics as ftyp fields.
    'styp@Major Brand': { text: "The 'best use' specification for the segment.", ref: 'ISO/IEC 14496-12, 4.3.3' },
    'styp@Minor Version': { text: "An informative integer for the minor version of the major brand.", ref: 'ISO/IEC 14496-12, 4.3.3' },
    'styp@Compatible Brands': { text: "A list of other specifications to which the segment complies.", ref: 'ISO/IEC 14496-12, 4.3.3' },
    'sidx': { name: "Segment Index", text: "Provides a compact index of media stream chunks within a segment.", ref: 'ISO/IEC 14496-12, 8.16.3' },
    'sidx@version': { text: "Version of this box (0 or 1). Affects the size of time and offset fields.", ref: 'ISO/IEC 14496-12, 8.16.3.2' },
    'sidx@reference_ID': { text: "The stream ID for the reference stream (typically the track ID).", ref: 'ISO/IEC 14496-12, 8.16.3.3' },
    'sidx@timescale': { text: "The timescale for time and duration fields in this box, in ticks per second.", ref: 'ISO/IEC 14496-12, 8.16.3.3' },
    'sidx@earliest_presentation_time': { text: "The earliest presentation time of any access unit in the first subsegment.", ref: 'ISO/IEC 14496-12, 8.16.3.3' },
    'sidx@first_offset': { text: "The byte offset from the end of this box to the first byte of the indexed material.", ref: 'ISO/IEC 14496-12, 8.16.3.3' },
    'sidx@reference_count': { text: "The number of subsegment references that follow.", ref: 'ISO/IEC 14496-12, 8.16.3.3' },
    'sidx@reference_type_1': { text: "The type of the first reference (0 = media, 1 = sidx box).", ref: 'ISO/IEC 14496-12, 8.16.3.3' },
    'sidx@referenced_size_1': { text: "The size in bytes of the referenced item.", ref: 'ISO/IEC 14496-12, 8.16.3.3' },
    'sidx@subsegment_duration_1': { text: "The duration of the referenced subsegment in the timescale.", ref: 'ISO/IEC 14496-12, 8.16.3.3' },
    'moov': { name: "Movie", text: "Container for all metadata defining the presentation.", ref: 'ISO/IEC 14496-12, 8.2.1' },
    'mvhd': { name: "Movie Header", text: "Contains global information for the presentation (timescale, duration).", ref: 'ISO/IEC 14496-12, 8.2.2' },
    'mvhd@version': { text: "Version of this box (0 or 1). Affects the size of time and duration fields.", ref: 'ISO/IEC 14496-12, 8.2.2.3' },
    'mvhd@creation_time': { text: "The creation time of the presentation (in seconds since midnight, Jan. 1, 1904, UTC).", ref: 'ISO/IEC 14496-12, 8.2.2.3' },
    'mvhd@modification_time': { text: "The most recent time the presentation was modified.", ref: 'ISO/IEC 14496-12, 8.2.2.3' },
    'mvhd@timescale': { text: "The number of time units that pass in one second for the presentation.", ref: 'ISO/IEC 14496-12, 8.2.2.3' },
    'mvhd@duration': { text: "The duration of the presentation in units of the timescale.", ref: 'ISO/IEC 14496-12, 8.2.2.3' },
    'trak': { name: "Track", text: "Container for a single track.", ref: 'ISO/IEC 14496-12, 8.3.1' },
    'tkhd': { name: "Track Header", text: "Specifies characteristics of a single track.", ref: 'ISO/IEC 14496-12, 8.3.2' },
    'tkhd@version': { text: "Version of this box (0 or 1). Affects the size of time and duration fields.", ref: 'ISO/IEC 14496-12, 8.3.2.3' },
    'tkhd@flags': { text: "A bitmask of track properties (enabled, in movie, in preview).", ref: 'ISO/IEC 14496-12, 8.3.2.3' },
    'tkhd@track_ID': { text: "A unique integer that identifies this track.", ref: 'ISO/IEC 14496-12, 8.3.2.3' },
    'tkhd@duration': { text: "The duration of this track in the movie's timescale.", ref: 'ISO/IEC 14496-12, 8.3.2.3' },
    'tkhd@width': { text: "The visual presentation width of the track as a fixed-point 16.16 number.", ref: 'ISO/IEC 14496-12, 8.3.2.3' },
    'tkhd@height': { text: "The visual presentation height of the track as a fixed-point 16.16 number.", ref: 'ISO/IEC 14496-12, 8.3.2.3' },
    'meta': { name: "Metadata", text: "A container for metadata.", ref: 'ISO/IEC 14496-12, 8.11.1'},
    'mdia': { name: "Media", text: "Container for media data information.", ref: 'ISO/IEC 14496-12, 8.4.1' },
    'mdhd': { name: "Media Header", text: "Declares media information (timescale, language).", ref: 'ISO/IEC 14496-12, 8.4.2' },
    'mdhd@version': { text: "Version of this box (0 or 1). Affects the size of time and duration fields.", ref: 'ISO/IEC 14496-12, 8.4.2.3' },
    'mdhd@timescale': { text: "The number of time units that pass in one second for this track's media.", ref: 'ISO/IEC 14496-12, 8.4.2.3' },
    'mdhd@duration': { text: "The duration of this track's media in units of its own timescale.", ref: 'ISO/IEC 14496-12, 8.4.2.3' },
    'mdhd@language': { text: "The ISO-639-2/T language code for this media.", ref: 'ISO/IEC 14496-12, 8.4.2.3' },
    'hdlr': { name: "Handler Reference", text: "Declares the media type of the track (e.g., 'vide', 'soun').", ref: 'ISO/IEC 14496-12, 8.4.3' },
    'hdlr@handler_type': { text: "A four-character code identifying the media type (e.g., 'vide', 'soun', 'hint').", ref: 'ISO/IEC 14496-12, 8.4.3.3' },
    'hdlr@name': { text: "A human-readable name for the track type (for debugging).", ref: 'ISO/IEC 14496-12, 8.4.3.3' },
    'minf': { name: "Media Information", text: "Container for characteristic information of the media.", ref: 'ISO/IEC 14496-12, 8.4.4' },
    'vmhd': { name: "Video Media Header", text: "Contains header information specific to video media.", ref: 'ISO/IEC 14496-12, 8.4.5.2'},
    'vmhd@version': { text: "Version of this box, always 0.", ref: 'ISO/IEC 14496-12, 8.4.5.2.2' },
    'vmhd@flags': { text: "A bitmask of flags, should have the low bit set to 1.", ref: 'ISO/IEC 14496-12, 8.4.5.2' },
    'vmhd@graphicsmode': { text: "Specifies a composition mode for this video track.", ref: 'ISO/IEC 14496-12, 8.4.5.2.2' },
    'vmhd@opcolor': { text: "A set of RGB color values available for use by graphics modes.", ref: 'ISO/IEC 14496-12, 8.4.5.2.2' },
    'dinf': { name: "Data Information", text: "Container for objects that declare where media data is located.", ref: 'ISO/IEC 14496-12, 8.7.1'},
    'stbl': { name: "Sample Table", text: "Contains all time and data indexing for samples.", ref: 'ISO/IEC 14496-12, 8.5.1' },
    'stsd': { name: "Sample Description", text: "Stores information for decoding samples (codec type).", ref: 'ISO/IEC 14496-12, 8.5.2' },
    'stsd@version': { text: "Version of this box, always 0.", ref: 'ISO/IEC 14496-12, 8.5.2.3' },
    'stsd@entry_count': { text: "The number of sample entries that follow.", ref: 'ISO/IEC 14496-12, 8.5.2.3' },
    'stts': { name: "Decoding Time to Sample", text: "Maps decoding times to sample numbers.", ref: 'ISO/IEC 14496-12, 8.6.1.2' },
    'stts@version': { text: "Version of this box, always 0.", ref: 'ISO/IEC 14496-12, 8.6.1.2.3' },
    'stts@entry_count': { text: "The number of entries in the time-to-sample table.", ref: 'ISO/IEC 14496-12, 8.6.1.2.3' },
    'stts@sample_count_1': { text: "The number of consecutive samples with the same delta for the first table entry.", ref: 'ISO/IEC 14496-12, 8.6.1.2.3' },
    'stts@sample_delta_1': { text: "The delta (duration) for each sample in this run for the first table entry.", ref: 'ISO/IEC 14496-12, 8.6.1.2.3' },
    'stsc': { name: "Sample To Chunk", text: "Maps samples to chunks.", ref: 'ISO/IEC 14496-12, 8.7.4' },
    'stsc@version': { text: "Version of this box, always 0.", ref: 'ISO/IEC 14496-12, 8.7.4.3' },
    'stsc@entry_count': { text: "The number of entries in the sample-to-chunk table.", ref: 'ISO/IEC 14496-12, 8.7.4.3' },
    'stsc@first_chunk_1': { text: "The index of the first chunk in a run of chunks with the same properties.", ref: 'ISO/IEC 14496-12, 8.7.4.3' },
    'stsc@samples_per_chunk_1': { text: "The number of samples in each of these chunks.", ref: 'ISO/IEC 14496-12, 8.7.4.3' },
    'stsc@sample_description_index_1': { text: "The index of the sample description for the samples in this run.", ref: 'ISO/IEC 14496-12, 8.7.4.3' },
    'stsz': { name: "Sample Size", text: "Specifies the size of each sample.", ref: 'ISO/IEC 14496-12, 8.7.3' },
    'stsz@version': { text: "Version of this box, always 0.", ref: 'ISO/IEC 14496-12, 8.7.3.2.2' },
    'stsz@sample_size': { text: "Default sample size. If 0, sizes are in the entry table.", ref: 'ISO/IEC 14496-12, 8.7.3.2.2' },
    'stsz@sample_count': { text: "The total number of samples in the track.", ref: 'ISO/IEC 14496-12, 8.7.3.2.2' },
    'stco': { name: "Chunk Offset", text: "Specifies the offset of each chunk into the file.", ref: 'ISO/IEC 14496-12, 8.7.5' },
    'stco@version': { text: "Version of this box, always 0.", ref: 'ISO/IEC 14496-12, 8.7.5.3' },
    'stco@entry_count': { text: "The number of entries in the chunk offset table.", ref: 'ISO/IEC 14496-12, 8.7.5.3' },
    'stco@chunk_offset_1': { text: "The file offset of the first chunk.", ref: 'ISO/IEC 14496-12, 8.7.5.3' },
    'edts': { name: "Edit Box", text: "A container for an edit list.", ref: 'ISO/IEC 14496-12, 8.6.5'},
    'elst': { name: "Edit List", text: "Maps the media time-line to the presentation time-line.", ref: 'ISO/IEC 14496-12, 8.6.6'},
    'elst@version': { text: "Version of this box (0 or 1). Affects the size of duration and time fields.", ref: 'ISO/IEC 14496-12, 8.6.6.3' },
    'elst@entry_count': { text: "The number of entries in the edit list.", ref: 'ISO/IEC 14496-12, 8.6.6.3' },
    'elst@segment_duration_1': { text: "The duration of this edit segment in movie timescale units.", ref: 'ISO/IEC 14496-12, 8.6.6.3' },
    'elst@media_time_1': { text: "The starting time within the media of this edit segment. A value of -1 indicates an empty edit.", ref: 'ISO/IEC 14496-12, 8.6.6.3' },
    'mvex': { name: "Movie Extends", text: "Signals that the movie may contain fragments.", ref: 'ISO/IEC 14496-12, 8.8.1' },
    'trex': { name: "Track Extends", text: "Sets default values for samples in fragments.", ref: 'ISO/IEC 14496-12, 8.8.3' },
    'trex@track_ID': { text: "The track ID to which these defaults apply.", ref: 'ISO/IEC 14496-12, 8.8.3.3' },
    'trex@default_sample_description_index': { text: "The default sample description index for samples in fragments.", ref: 'ISO/IEC 14496-12, 8.8.3.3' },
    'trex@default_sample_duration': { text: "The default duration for samples in fragments.", ref: 'ISO/IEC 14496-12, 8.8.3.3' },
    'trex@default_sample_size': { text: "The default size for samples in fragments.", ref: 'ISO/IEC 14496-12, 8.8.3.3' },
    'trex@default_sample_flags': { text: "The default flags for samples in fragments.", ref: 'ISO/IEC 14496-12, 8.8.3.3' },
    'moof': { name: "Movie Fragment", text: "Container for all metadata for a single fragment.", ref: 'ISO/IEC 14496-12, 8.8.4' },
    'mfhd': { name: "Movie Fragment Header", text: "Contains the sequence number of this fragment.", ref: 'ISO/IEC 14496-12, 8.8.5' },
    'mfhd@sequence_number': { text: "The ordinal number of this fragment, in increasing order.", ref: 'ISO/IEC 14496-12, 8.8.5.3' },
    'traf': { name: "Track Fragment", text: "Container for metadata for a single track's fragment.", ref: 'ISO/IEC 14496-12, 8.8.6' },
    'tfhd': { name: "Track Fragment Header", text: "Declares defaults for a track fragment.", ref: 'ISO/IEC 14496-12, 8.8.7' },
    'tfhd@track_ID': { text: "The unique identifier of the track for this fragment.", ref: 'ISO/IEC 14496-12, 8.8.7.2' },
    'tfhd@flags': { text: "A bitfield indicating which optional fields are present.", ref: 'ISO/IEC 14496-12, 8.8.7.2' },
    'tfhd@base_data_offset': { text: "The base offset for data within the current mdat.", ref: 'ISO/IEC 14496-12, 8.8.7.2' },
    'tfhd@sample_description_index': { text: "The index of the sample description for this fragment.", ref: 'ISO/IEC 14496-12, 8.8.7.2' },
    'tfdt': { name: "Track Fragment Decode Time", text: "Provides the absolute decode time for the first sample.", ref: 'ISO/IEC 14496-12, 8.8.12' },
    'tfdt@version': { text: "Version of this box (0 or 1). Affects the size of the decode time field.", ref: 'ISO/IEC 14496-12, 8.8.12.3' },
    'tfdt@baseMediaDecodeTime': { text: "The absolute decode time, in media timescale units, for the first sample in this fragment.", ref: 'ISO/IEC 14496-12, 8.8.12.3' },
    'trun': { name: "Track Run", text: "Contains timing, size, and flags for a run of samples.", ref: 'ISO/IEC 14496-12, 8.8.8' },
    'trun@version': { text: "Version of this box (0 or 1). Affects signed/unsigned composition time.", ref: 'ISO/IEC 14496-12, 8.8.8.2' },
    'trun@flags': { text: "A bitfield indicating which optional per-sample fields are present.", ref: 'ISO/IEC 14496-12, 8.8.8.2' },
    'trun@sample_count': { text: "The number of samples in this run.", ref: 'ISO/IEC 14496-12, 8.8.8.3' },
    'trun@data_offset': { text: "An optional offset added to the base_data_offset.", ref: 'ISO/IEC 14496-12, 8.8.8.3' },
    'trun@first_sample_flags': { text: "Flags for the first sample, overriding the default.", ref: 'ISO/IEC 14496-12, 8.8.8.3' },
    'trun@samples': { text: "A table of sample-specific data (duration, size, flags, composition time offset).", ref: 'ISO/IEC 14496-12, 8.8.8.2' },
    'pssh': { name: "Protection System Specific Header", text: "Contains DRM initialization data.", ref: 'ISO/IEC 23001-7' },
    'mdat': { name: "Media Data", text: "Contains the actual audio/video sample data.", ref: 'ISO/IEC 14496-12, 8.1.1' },
};

// --- SEGMENT PARSING & MODAL RENDERING ---

const isoBoxTemplate = (box) => {
    const boxInfo = tooltipData[box.type] || {};
    const headerTemplate = html`
        <div class="box-header">
            <span class="type" data-tooltip="${boxInfo.text || ''}" data-iso="${boxInfo.ref || ''}">${box.type}</span>
            <span class="size">${boxInfo.name ? `(${boxInfo.name}) ` : ''}(${box.size} bytes)</span>
        </div>`;

    const detailsTemplate = Object.keys(box.details).length > 0
        ? html`
            <table class="box-details-table">
                <tbody>
                    ${Object.entries(box.details).map(([key, value]) => {
                        const fieldTooltip = tooltipData[`${box.type}@${key}`];
                        return html`<tr>
                            <td class="field-name" data-tooltip="${fieldTooltip?.text || ''}" data-iso="${fieldTooltip?.ref || ''}">${key}</td>
                            <td class="field-value">${value}</td>
                        </tr>`;
                    })}
                </tbody>
            </table>`
        : '';

    const childrenTemplate = box.children.length > 0
        ? html`<ul>${box.children.map(child => html`<li>${isoBoxTemplate(child)}</li>`)}</ul>`
        : '';

    return html`${headerTemplate}${detailsTemplate}${childrenTemplate}`;
};

const essentialDataTemplate = (boxes) => {
    const moof = boxes.find(b => b.type === 'moof');
    const moov = boxes.find(b => b.type === 'moov');

    if (moof) {
        const mfhd = moof.children.find(b => b.type === 'mfhd');
        const traf = moof.children.find(b => b.type === 'traf');
        if (!mfhd || !traf) return html``;
        const tfhd = traf.children.find(b => b.type === 'tfhd');
        const tfdt = traf.children.find(b => b.type === 'tfdt');
        const trun = traf.children.find(b => b.type === 'trun');
        return html`
            <div class="segment-essential-data">
                <div><span class="label">Type</span><span class="value">Media Segment</span></div>
                <div><span class="label">Sequence #</span><span class="value">${mfhd.details.sequence_number || 'N/A'}</span></div>
                <div><span class="label">Track ID</span><span class="value">${tfhd?.details.track_ID || 'N/A'}</span></div>
                <div><span class="label">Base Decode Time</span><span class="value">${tfdt?.details.baseMediaDecodeTime || 'N/A'}</span></div>
                <div><span class="label">Sample Count</span><span class="value">${trun?.details.sample_count || 'N/A'}</span></div>
            </div>`;
    } else if (moov) {
        const mvhd = moov.children.find(b => b.type === 'mvhd');
        const traks = moov.children.filter(b => b.type === 'trak');
        return html`
            <div class="segment-essential-data">
                <div><span class="label">Type</span><span class="value">Initialization Segment</span></div>
                <div><span class="label">Timescale</span><span class="value">${mvhd?.details.timescale || 'N/A'}</span></div>
                <div><span class="label">Duration</span><span class="value">${mvhd?.details.duration || 'N/A'}</span></div>
                <div><span class="label">Track Count</span><span class="value">${traks.length}</span></div>
            </div>`;
    }
    return html``;
};

const isoAnalysisTemplate = (boxes) => html`
    ${essentialDataTemplate(boxes)}
    <div class="box-tree-view">
        <ul>
            ${boxes.map(box => html`<li>${isoBoxTemplate(box)}</li>`)}
        </ul>
    </div>
`;

function parseISOBMFF(buffer) {
    const boxes = [];
    let offset = 0;
    while (offset < buffer.byteLength) {
        if (offset + 8 > buffer.byteLength) break;
        const dataView = new DataView(buffer);
        let size = dataView.getUint32(offset);
        const type = String.fromCharCode.apply(null, new Uint8Array(buffer, offset + 4, 4));
        let headerSize = 8;

        if (size === 1) {
            if (offset + 16 > buffer.byteLength) break;
            size = Number(dataView.getBigUint64(offset + 8));
            headerSize = 16;
        } else if (size === 0) {
            size = buffer.byteLength - offset;
        }

        if (offset + size > buffer.byteLength) { size = buffer.byteLength - offset; }
        
        const box = { type, size, offset, children: [], details: {} };
        parseBoxDetails(box, new DataView(buffer, offset, size));

        const containerBoxes = ['moof', 'traf', 'moov', 'trak', 'mdia', 'minf', 'stbl', 'mvex'];
        if (containerBoxes.includes(type)) {
            const childrenBuffer = buffer.slice(offset + headerSize, offset + size);
            if (childrenBuffer.byteLength > 0) {
                box.children = parseISOBMFF(childrenBuffer);
            }
        }
        boxes.push(box);
        offset += size;
    }
    return boxes;
}

function parseBoxDetails(box, view) {
    try {
        const getString = (start, len) => String.fromCharCode.apply(null, new Uint8Array(view.buffer, view.byteOffset + start, len));
        const version = view.getUint8(8);
        const flags = view.getUint32(8) & 0x00FFFFFF;

        switch(box.type) {
            case 'ftyp': case 'styp': {
                box.details['Major Brand'] = getString(8, 4);
                box.details['Minor Version'] = view.getUint32(12);
                let compatibleBrands = [];
                for (let i = 16; i < box.size; i += 4) { compatibleBrands.push(getString(i, 4)); }
                box.details['Compatible Brands'] = compatibleBrands.join(', ');
                break;
            }
            case 'mvhd': {
                box.details['version'] = version;
                if (version === 1) {
                    box.details['creation_time'] = new Date(Number(view.getBigUint64(12)) * 1000 - 2082844800000).toISOString();
                    box.details['modification_time'] = new Date(Number(view.getBigUint64(20)) * 1000 - 2082844800000).toISOString();
                    box.details['timescale'] = view.getUint32(28);
                    box.details['duration'] = Number(view.getBigUint64(32));
                } else {
                    box.details['creation_time'] = new Date(view.getUint32(12) * 1000 - 2082844800000).toISOString();
                    box.details['modification_time'] = new Date(view.getUint32(16) * 1000 - 2082844800000).toISOString();
                    box.details['timescale'] = view.getUint32(20);
                    box.details['duration'] = view.getUint32(24);
                }
                break;
            }
            case 'tkhd': {
                box.details['version'] = version;
                box.details['flags'] = `0x${flags.toString(16).padStart(6, '0')}`;
                const idOffset = version === 1 ? 28 : 20;
                box.details['track_ID'] = view.getUint32(idOffset);
                const durationOffset = version === 1 ? 36 : 28;
                box.details['duration'] = version === 1 ? Number(view.getBigUint64(durationOffset)) : view.getUint32(durationOffset);
                const widthOffset = version === 1 ? 88 : 76;
                box.details['width'] = `${view.getUint16(widthOffset)}.${view.getUint16(widthOffset+2)}`;
                box.details['height'] = `${view.getUint16(widthOffset+4)}.${view.getUint16(widthOffset+6)}`;
                break;
            }
             case 'mdhd': {
                box.details['version'] = version;
                const tsOffset = version === 1 ? 20 : 12;
                box.details['timescale'] = view.getUint32(tsOffset);
                box.details['duration'] = version === 1 ? Number(view.getBigUint64(tsOffset + 4)) : view.getUint32(tsOffset + 4);
                const lang = view.getUint16(tsOffset + 12);
                box.details['language'] = String.fromCharCode(((lang >> 10) & 0x1F) + 0x60, ((lang >> 5) & 0x1F) + 0x60, (lang & 0x1F) + 0x60);
                break;
            }
            case 'hdlr': {
                box.details['handler_type'] = getString(16, 4);
                box.details['name'] = getString(32, box.size - 32).replace(/\0/g, '');
                break;
            }
            case 'vmhd': {
                box.details['version'] = version;
                box.details['flags'] = `0x${flags.toString(16).padStart(6, '0')}`;
                box.details['graphicsmode'] = view.getUint16(12);
                box.details['opcolor'] = `R:${view.getUint16(14)}, G:${view.getUint16(16)}, B:${view.getUint16(18)}`;
                break;
            }
            case 'stsd': {
                box.details['version'] = version;
                box.details['entry_count'] = view.getUint32(12);
                break;
            }
            case 'stts': {
                box.details['version'] = version;
                box.details['entry_count'] = view.getUint32(12);
                if (box.details['entry_count'] > 0) {
                    box.details['sample_count_1'] = view.getUint32(16);
                    box.details['sample_delta_1'] = view.getUint32(20);
                }
                break;
            }
            case 'stsc': {
                box.details['version'] = version;
                box.details['entry_count'] = view.getUint32(12);
                if (box.details['entry_count'] > 0) {
                    box.details['first_chunk_1'] = view.getUint32(16);
                    box.details['samples_per_chunk_1'] = view.getUint32(20);
                    box.details['sample_description_index_1'] = view.getUint32(24);
                }
                break;
            }
            case 'stsz': {
                box.details['version'] = version;
                box.details['sample_size'] = view.getUint32(12);
                box.details['sample_count'] = view.getUint32(16);
                break;
            }
            case 'stco': {
                box.details['version'] = version;
                box.details['entry_count'] = view.getUint32(12);
                if (box.details['entry_count'] > 0) {
                    box.details['chunk_offset_1'] = view.getUint32(16);
                }
                break;
            }
            case 'elst': { // child of 'edts'
                box.details['version'] = version;
                const entry_count = view.getUint32(12);
                box.details['entry_count'] = entry_count;
                if (entry_count > 0) {
                    const entryOffset = 16;
                    if (version === 1) {
                        box.details['segment_duration_1'] = Number(view.getBigUint64(entryOffset));
                        box.details['media_time_1'] = Number(view.getBigInt64(entryOffset+8));
                    } else {
                        box.details['segment_duration_1'] = view.getUint32(entryOffset);
                        box.details['media_time_1'] = view.getInt32(entryOffset+4);
                    }
                }
                break;
            }
            case 'trex': {
                box.details['track_ID'] = view.getUint32(12);
                box.details['default_sample_description_index'] = view.getUint32(16);
                box.details['default_sample_duration'] = view.getUint32(20);
                box.details['default_sample_size'] = view.getUint32(24);
                box.details['default_sample_flags'] = `0x${view.getUint32(28).toString(16)}`;
                break;
            }
            case 'sidx': {
                box.details['version'] = version;
                box.details['reference_ID'] = view.getUint32(12);
                box.details['timescale'] = view.getUint32(16);
                let offset = 20;
                if (version === 1) {
                    box.details['earliest_presentation_time'] = Number(view.getBigUint64(offset)); offset += 8;
                    box.details['first_offset'] = Number(view.getBigUint64(offset)); offset += 8;
                } else {
                    box.details['earliest_presentation_time'] = view.getUint32(offset); offset += 4;
                    box.details['first_offset'] = view.getUint32(offset); offset += 4;
                }
                offset += 2; // reserved
                const ref_count = view.getUint16(offset); offset += 2;
                box.details['reference_count'] = ref_count;
                if(ref_count > 0) {
                    const ref_type = view.getUint8(offset) >> 7;
                    box.details['reference_type_1'] = ref_type === 1 ? 'sidx' : 'media';
                    box.details['referenced_size_1'] = view.getUint32(offset) & 0x7FFFFFFF;
                    box.details['subsegment_duration_1'] = view.getUint32(offset + 4);
                }
                break;
            }
            case 'mfhd': {
                box.details['sequence_number'] = view.getUint32(12);
                break;
            }
            case 'tfhd': {
                box.details['track_ID'] = view.getUint32(12);
                box.details['flags'] = `0x${flags.toString(16).padStart(6, '0')}`;
                let offset = 16;
                if (flags & 0x000001) { box.details['base_data_offset'] = Number(view.getBigUint64(offset)); offset += 8; }
                if (flags & 0x000002) { box.details['sample_description_index'] = view.getUint32(offset); offset += 4; }
                if (flags & 0x000008) { box.details['default_sample_duration'] = view.getUint32(offset); offset += 4; }
                if (flags & 0x000010) { box.details['default_sample_size'] = view.getUint32(offset); offset += 4; }
                if (flags & 0x000020) { box.details['default_sample_flags'] = `0x${view.getUint32(offset).toString(16)}`; }
                break;
            }
            case 'tfdt': {
                box.details['version'] = version;
                box.details['baseMediaDecodeTime'] = version === 1 ? Number(view.getBigUint64(12)) : view.getUint32(12);
                break;
            }
            case 'trun': {
                box.details['version'] = version;
                box.details['flags'] = `0x${flags.toString(16).padStart(6, '0')}`;
                const sample_count = view.getUint32(12);
                box.details['sample_count'] = sample_count;
                let offset = 16;
                if (flags & 0x000001) { box.details['data_offset'] = view.getInt32(offset); offset += 4; }
                if (flags & 0x000004) { box.details['first_sample_flags'] = `0x${view.getUint32(offset).toString(16)}`; offset += 4; }
                let samples = [];
                for (let i = 0; i < Math.min(sample_count, 10); i++) {
                    let sample = {};
                    if (flags & 0x000100) { sample.duration = view.getUint32(offset); offset += 4; }
                    if (flags & 0x000200) { sample.size = view.getUint32(offset); offset += 4; }
                    if (flags & 0x000400) { sample.flags = `0x${view.getUint32(offset).toString(16)}`; offset += 4; }
                    if (flags & 0x000800) {
                        sample.composition_time_offset = (version === 0) ? view.getUint32(offset) : view.getInt32(offset);
                        offset += 4;
                    }
                    samples.push(JSON.stringify(sample));
                }
                box.details['samples'] = html`<div class="sample-data"><pre>${samples.join('\n')}${sample_count > 10 ? `\n... (${sample_count - 10} more)`: ''}</pre></div>`;
                break;
            }
            case 'mdat': {
                box.details['info'] = "Contains raw media data for samples.";
                break;
            }
        }
    } catch (_e) { box.details['Parsing Error'] = _e.message; }
}

export function dispatchAndRenderSegmentAnalysis(e, buffer) {
    if (!buffer) {
        render(html`<p class="fail">Segment buffer is not available for analysis.</p>`, dom.modalContentArea);
        return;
    }
    
    const target = /** @type {HTMLElement} */ (e.currentTarget);
    const repId = target.dataset.repid;
    
    const activeStream = analysisState.streams.find(s => s.id === analysisState.activeStreamId);
    if (!activeStream) return;

    const rep = activeStream.mpd.querySelector(`Representation[id="${repId}"]`);
    if (!rep) return;

    const as = rep.closest('AdaptationSet');
    const mimeType = rep.getAttribute('mimeType') || as?.getAttribute('mimeType');

    try {
        if (mimeType === 'video/mp2t') {
            const analysis = parseTsSegment(buffer);
            render(tsAnalysisTemplate(analysis.data), dom.modalContentArea);
        } else { // Default to ISOBMFF
            const boxes = parseISOBMFF(buffer);
            render(isoAnalysisTemplate(boxes), dom.modalContentArea);
        }
    } catch (err) {
        console.error("Segment parsing error:", err);
        render(html`<p class="fail">Could not parse segment buffer: ${err.message}.</p>`, dom.modalContentArea);
    }
}