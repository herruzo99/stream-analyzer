import { dom, analysisState } from '../state.js';
import { createInfoTooltip } from '../ui.js';

const tooltipData = {
    'ftyp': { text: 'File Type Box: Identifies the file type, brand, and compatibility. It must be the first box in the file.', ref: 'ISO/IEC 14496-12, 4.3' },
    'moov': { text: 'Movie Box: A container for all the metadata about the movie, including information about the tracks, timing, and structure.', ref: 'ISO/IEC 14496-12, 8.1.1' },
    'mvhd': { text: 'Movie Header Box: Specifies the overall timescale and duration for the entire presentation.', ref: 'ISO/IEC 14496-12, 8.2.2' },
    'trak': { text: 'Track Box: A container for a single track of the presentation. A presentation may have multiple tracks (e.g., one for video, one for audio).', ref: 'ISO/IEC 14496-12, 8.3.1' },
    'tkhd': { text: 'Track Header Box: Specifies the duration and other characteristics of a single track.', ref: 'ISO/IEC 14496-12, 8.3.2' },
    'mdia': { text: 'Media Box: A container for all the objects that declare information about the media data within a track.', ref: 'ISO/IEC 14496-12, 8.4.1' },
    'mdhd': { text: 'Media Header Box: Specifies the timescale and duration for the media in a track.', ref: 'ISO/IEC 14496-12, 8.4.2' },
    'hdlr': { text: 'Handler Reference Box: Declares the media type of the track (e.g., \'vide\' for video, \'soun\' for audio).', ref: 'ISO/IEC 14496-12, 8.4.3' },
    'minf': { text: 'Media Information Box: A container for all the objects that declare characteristic information of the media in the track.', ref: 'ISO/IEC 14496-12, 8.4.4' },
    'vmhd': { text: 'Video Media Header Box: Contains header information specific to the video media in a track.', ref: 'ISO/IEC 14496-12, 8.4.5.2' },
    'smhd': { text: 'Sound Media Header Box: Contains header information specific to the audio media in a track.', ref: 'ISO/IEC 14496-12, 8.4.5.3' },
    'dinf': { text: 'Data Information Box: A container for objects that declare where the media data is located.', ref: 'ISO/IEC 14496-12, 8.7.1' },
    'dref': { text: 'Data Reference Box: Contains a table of data references that declare the location(s) of the media data.', ref: 'ISO/IEC 14496-12, 8.7.2' },
    'stbl': { text: 'Sample Table Box: A container for all the time and data indexing of the media samples in a track.', ref: 'ISO/IEC 14496-12, 8.5.1' },
    'stsd': { text: 'Sample Description Box: Contains a list of sample entries, which describe the format of the samples.', ref: 'ISO/IEC 14496-12, 8.5.2' },
    'stts': { text: 'Time-to-Sample Box: Stores duration information for the media\'s samples.', ref: 'ISO/IEC 14496-12, 8.6.1.2' },
    'stsc': { text: 'Sample-to-Chunk Box: Defines the mapping of samples to chunks within the media data.', ref: 'ISO/IEC 14496-12, 8.7.4' },
    'stsz': { text: 'Sample Size Box: Specifies the size of each sample.', ref: 'ISO/IEC 14496-12, 8.7.3' },
    'stco': { text: 'Chunk Offset Box: Identifies the location of each chunk of data in the media file.', ref: 'ISO/IEC 14496-12, 8.7.5' },
    'co64': { text: '64-bit Chunk Offset Box: A 64-bit version of the Chunk Offset Box for large files.', ref: 'ISO/IEC 14496-12, 8.7.5' },
    'edts': { text: 'Edit Box: Maps the media time to the presentation time, allowing for edits and offsets.', ref: 'ISO/IEC 14496-12, 8.6.5' },
    'elst': { text: 'Edit List Box: Contains a list of edits that define the presentation timeline.', ref: 'ISO/IEC 14496-12, 8.6.6' },
    'mvex': { text: 'Movie Extends Box: Signals that the movie may contain movie fragments, as is typical in DASH.', ref: 'ISO/IEC 14496-12, 8.8.1' },
    'trex': { text: 'Track Extends Box: Sets default values for the samples and duration for a track\'s fragments.', ref: 'ISO/IEC 14496-12, 8.8.2' },
    'meta': { text: 'Meta Box: A container for metadata, which can be at the movie or track level.', ref: 'ISO/IEC 14496-12, 8.11.1' },
    'styp': { text: 'Segment Type Box: Declares the format and brands of this segment. Essential for compatibility checks (e.g., CMAF).', ref: 'ISO/IEC 14496-12, 8.16.2' },
    'sidx': { text: 'Segment Index Box: Provides a timeline and byte-range index for the subsegments within this media segment. Crucial for seeking.', ref: 'ISO/IEC 14496-12, 8.16.3' },
    'moof': { text: 'Movie Fragment Box: A container for a single fragment of the media, containing metadata for the samples within.', ref: 'ISO/IEC 14496-12, 8.8.7' },
    'mfhd': { text: 'Movie Fragment Header Box: Contains a sequence number for this fragment, allowing a client to detect missing fragments.', ref: 'ISO/IEC 14496-12, 8.8.8' },
    'traf': { text: 'Track Fragment Box: Container for a single track\'s fragment metadata.', ref: 'ISO/IEC 14496-12, 8.8.7' },
    'tfhd': { text: 'Track Fragment Header Box: Contains the ID of the track for this fragment.', ref: 'ISO/IEC 14496-12, 8.8.7' },
    'tfdt': { text: 'Track Fragment Decode Time Box: Provides the absolute decode time for the first sample in this fragment.', ref: 'ISO/IEC 14496-12, 8.8.12' },
    'trun': { text: 'Track Run Box: Contains information about a continuous run of samples within a fragment, like their duration and size.', ref: 'ISO/IEC 14496-12, 8.8.8' },
    'pssh': { text: 'Protection System Specific Header Box: Contains information needed by a Content Decryption Module to decrypt the media.', ref: 'ISO/IEC 23001-7' },
    'mdat': { text: 'Media Data Box: Contains the actual audio/video sample data for the preceding \'moof\' box.', ref: 'ISO/IEC 14496-12, 8.1.1' },
    'avcC': { text: 'AVC Configuration Box: Contains the decoder configuration information for an AVC (H.264) video track.', ref: 'ISO/IEC 14496-15' },
    'hvcC': { text: 'HEVC Configuration Box: Contains the decoder configuration information for an HEVC (H.265) video track.', ref: 'ISO/IEC 14496-15' },
    'esds': { text: 'Elementary Stream Descriptor Box: Contains information about the audio stream, such as its type and decoder-specific configuration.', ref: 'ISO/IEC 14496-14' }
};
/**
 * @param {Event} e - The original click event, used for its dataset.
 * @param {ArrayBuffer} [cachedBuffer] - Optional. If provided, this buffer is used instead of fetching.
 */
export async function handleSegmentAnalysisClick(e, cachedBuffer) {
    const target = /** @type {HTMLElement} */ (e.target);
    const segmentNumber = parseInt(target.dataset.number);

    const activeStream = analysisState.streams.find(s => s.id === analysisState.activeStreamId);
    const rep = activeStream.mpd.querySelector(`Representation[id="${target.dataset.repid}"]`);
    
    let expectedStartTime = null;
    if (rep && !isNaN(segmentNumber)) {
        const template = rep.querySelector('SegmentTemplate') || rep.closest('AdaptationSet').querySelector('SegmentTemplate')  || rep.closest('Period').querySelector('SegmentTemplate');
        if (template) {
            const timescale = parseInt(template.getAttribute('timescale'));
            const timeline = template.querySelector('SegmentTimeline');
            if (timeline) {
                let currentNum = parseInt(template.getAttribute('startNumber') || '1');
                let currentTime = 0;
                for (const s of Array.from(timeline.querySelectorAll('S'))) {
                    const t = s.hasAttribute('t') ? parseInt(s.getAttribute('t')) : currentTime;
                    const d = parseInt(s.getAttribute('d'));
                    const r = parseInt(s.getAttribute('r') || '0');
                    for (let i = 0; i <= r; i++) {
                        if (currentNum === segmentNumber) {
                            expectedStartTime = (t + i * d) / timescale;
                            break;
                        }
                        currentNum++;
                    }
                    if (expectedStartTime !== null) break;
                    currentTime = t + ((r + 1) * d);
                }
            }
        }
    }
    
    processBuffer(cachedBuffer, expectedStartTime);
}

/**
 * Parses a buffer and renders the analysis in the modal.
 * @param {ArrayBuffer} buffer The segment data.
 * @param {number | null} expectedStartTime The start time calculated from the MPD.
 */
function processBuffer(buffer, expectedStartTime) {
    try {
        const boxes = parseISOBMFF(buffer);
        let analysisHtml = renderSegmentAnalysisSummary(boxes, expectedStartTime);
        analysisHtml += renderBoxes(boxes);
        dom.modalContentArea.innerHTML = analysisHtml;
    } catch (err) {
        dom.modalContentArea.innerHTML = `<p class="fail">Could not parse segment buffer: ${err.message}.</p>`;
    }
}
function renderSegmentAnalysisSummary(boxes, expectedStartTime) {
    const sidx = boxes.find(b => b.type === 'sidx');
    const moov = boxes.find(b => b.type === 'moov');
    let summaryHtml = '';

    const activeStream = analysisState.streams.find(s => s.id === analysisState.activeStreamId);
    if (activeStream) {
        const profiles = activeStream.mpd.getAttribute('profiles') || '';
        if (profiles.includes('cmaf')) {
            if (!sidx && !moov) { // It's not an init segment either
                summaryHtml += `<div class="analysis-summary fail">CMAF Compliance Fail: Segment does not contain a Segment Index ('sidx') box, which is required for CMAF tracks.</div>`;
            }
        }
    }

    if (!sidx) {
        if (moov) {
            summaryHtml += `<div class="analysis-summary info">This appears to be an Initialization Segment. It contains metadata but no media samples, so timing analysis is not applicable.</div>`;
        } else {
            summaryHtml += `<div class="analysis-summary warn">Could not find Segment Index ('sidx') box. Detailed segment timing analysis is not available.</div>`;
        }
        return summaryHtml;
    }
    
    const actualStartTime = parseFloat(sidx.details['EPT (seconds)']);
    let driftInfo = '';
    if (expectedStartTime !== null && !isNaN(actualStartTime)) {
        const drift = (actualStartTime - expectedStartTime) * 1000;
        const driftClass = Math.abs(drift) > 50 ? 'warn' : 'pass'; // Highlight drift over 50ms
        const driftDetails = 'Drift is the difference between the MPD-declared start time and the actual start time in the segment. High drift can cause playback issues.';
        driftInfo = `<div><span class="key">Timeline Drift ${createInfoTooltip(driftDetails, 'Clause 7.2.1')}:</span> <span class="value ${driftClass}">${drift.toFixed(0)} ms</span></div>`;
    }

    summaryHtml += `<div class="analysis-summary">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 text-sm">
                    <div><span class="key">Actual Start Time:</span> <span class="value">${actualStartTime.toFixed(3)} s</span></div>
                    <div><span class="key">Segment Duration:</span> <span class="value">${sidx.details['Total Duration (seconds)']} s</span></div>
                    <div><span class="key">Expected MPD Start Time:</span> <span class="value">${expectedStartTime ? expectedStartTime.toFixed(3) + ' s' : 'N/A'}</span></div>
                    ${driftInfo}
                </div>
            </div>`;
    return summaryHtml;
}

function renderBoxes(boxes, level = 0) {
    let html = `<ul class="${level > 0 ? 'pl-4' : ''}">`;
    for (const box of boxes) {
        const tooltip = tooltipData[box.type];
        const tooltipHtml = tooltip ? createInfoTooltip(tooltip.text, tooltip.ref) : '';
        
        html += `<li class="my-1"><p><span class="font-bold text-green-400">${box.type}</span> <span class="text-gray-500">(Size: ${box.size})</span>${tooltipHtml}</p>`;
        if (Object.keys(box.details).length > 0) {
            html += `<div class="box-details">
`;
            for (const [key, value] of Object.entries(box.details)) {
                html += `<div><span class="key">${key}:</span> <span class="value">${value}</span></div>`;
            }
            html += `</div>`;
        }
        if (box.children.length > 0) html += renderBoxes(box.children, level + 1);
        html += `</li>`;
    }
    html += '</ul>';
    return html;
}

function parseISOBMFF(buffer) {
    const boxes = [];
    const dataView = new DataView(buffer);
    let offset = 0;
    while (offset < buffer.byteLength) {
        if (offset + 8 > buffer.byteLength) break;
        let size = dataView.getUint32(offset);
        const type = String.fromCharCode.apply(null, new Uint8Array(buffer, offset + 4, 4));
        let headerSize = 8;
        if (size === 1) {
            if (offset + 16 > buffer.byteLength) break;
            size = Number(dataView.getBigUint64(offset + 8));
            headerSize = 16;
        }
        if (size === 0 || (offset + size > buffer.byteLength)) break;
        
        const box = { type, size, offset, children: [], details: {} };
        
        parseBoxDetails(box, new DataView(buffer, offset, size));

        if(['moof', 'traf', 'mvex', 'moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'stsd', 'meta'].includes(type)) {
            box.children = parseISOBMFF(buffer.slice(offset + headerSize, offset + size));
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

        switch(box.type) {
            case 'styp': {
                box.details['Major Brand'] = getString(8, 4);
                let compatibleBrands = [];
                for (let i = 16; i < box.size; i += 4) {
                    compatibleBrands.push(getString(i, 4));
                }
                box.details['Compatible Brands'] = compatibleBrands.join(', ');
                break;
            }
            case 'sidx': {
                box.details['Version'] = version;
                box.details['Reference ID'] = view.getUint32(12);
                const timescale = view.getUint32(16);
                box.details['Timescale'] = timescale;
                const ept = version === 0 ? view.getUint32(20) : Number(view.getBigUint64(20));
                box.details['Earliest Presentation Time'] = ept;
                box.details['EPT (seconds)'] = (ept / timescale).toFixed(3);
                const referenceCount = view.getUint16(30);
                box.details['Reference Count'] = referenceCount;
                let totalDuration = 0;
                let loopOffset = 32;
                for(let i=0; i<referenceCount; i++) {
                    totalDuration += view.getUint32(loopOffset + 4);
                    loopOffset += 12;
                }
                box.details['Total Duration (timescale)'] = totalDuration;
                box.details['Total Duration (seconds)'] = (totalDuration / timescale).toFixed(3);
                break;
            }
            case 'mvhd': {
                const version = view.getUint8(8);
                const timescale = view.getUint32(version === 1 ? 28 : 20);
                const duration = version === 1 ? Number(view.getBigUint64(32)) : view.getUint32(24);
                box.details['Timescale'] = timescale;
                box.details['Duration'] = `${duration} (${(duration/timescale).toFixed(2)}s)`;
                break;
            }
            case 'tkhd': {
                const version = view.getUint8(8);
                const trackId = view.getUint32(version === 1 ? 28 : 20);
                const duration = version === 1 ? Number(view.getBigUint64(36)) : view.getUint32(24);
                box.details['Track ID'] = trackId;
                box.details['Duration'] = duration;
                break;
            }
            case 'mdhd': {
                const version = view.getUint8(8);
                const timescale = view.getUint32(version === 1 ? 28 : 20);
                const duration = version === 1 ? Number(view.getBigUint64(32)) : view.getUint32(24);
                const lang = view.getUint16(version === 1 ? 36 : 28);
                const langChars = [
                    (lang >> 10) & 0x1F,
                    (lang >> 5) & 0x1F,
                    lang & 0x1F
                ].map(x => String.fromCharCode(x + 0x60));
                box.details['Timescale'] = timescale;
                box.details['Duration'] = `${duration} (${(duration/timescale).toFixed(2)}s)`;
                box.details['Language'] = langChars.join('');
                break;
            }
            case 'hdlr': {
                const handlerType = getString(16, 4);
                box.details['Handler Type'] = handlerType;
                break;
            }
            case 'vmhd': {
                box.details['Graphics Mode'] = view.getUint16(12);
                break;
            }
            case 'smhd': {
                box.details['Balance'] = view.getInt16(12) / 256.0;
                break;
            }
            case 'dref': {
                const entryCount = view.getUint32(12);
                box.details['Entry Count'] = entryCount;
                break;
            }
            case 'elst': {
                const entryCount = view.getUint32(12);
                box.details['Entry Count'] = entryCount;
                if (entryCount > 0 && entryCount < 10) {
                    let entries = [];
                    for (let i = 0; i < entryCount; i++) {
                        const offset = 16 + i * (version === 1 ? 20 : 12);
                        const segmentDuration = version === 1 ? Number(view.getBigUint64(offset)) : view.getUint32(offset);
                        const mediaTime = version === 1 ? Number(view.getBigInt64(offset+8)) : view.getInt32(offset+4);
                        const mediaRate = view.getInt16(offset + (version === 1 ? 16 : 8));
                        entries.push(`Duration: ${segmentDuration}, Time: ${mediaTime}, Rate: ${mediaRate >> 16}`);
                    }
                    box.details['Entries'] = `<ul>${entries.map(e => `<li>${e}</li>`).join('')}</ul>`;
                }
                break;
            }
            case 'stsd': {
                box.details['Entry Count'] = view.getUint32(12);
                break;
            }
            case 'stts': {
                const entryCount = view.getUint32(12);
                box.details['Entry Count'] = entryCount;
                if (entryCount > 0 && entryCount < 10) { 
                    let entries = [];
                    for (let i = 0; i < entryCount; i++) {
                        const sampleCount = view.getUint32(16 + i * 8);
                        const sampleDelta = view.getUint32(20 + i * 8);
                        entries.push(`${sampleCount} sample(s) with duration ${sampleDelta}`);
                    }
                    box.details['Entries'] = `<ul>${entries.map(e => `<li>${e}</li>`).join('')}</ul>`;
                }
                break;
            }
            case 'stsc': {
                const entryCount = view.getUint32(12);
                box.details['Entry Count'] = entryCount;
                break;
            }
            case 'stsz': {
                const sampleSize = view.getUint32(12);
                const sampleCount = view.getUint32(16);
                box.details['Sample Size'] = sampleSize === 0 ? 'Variable' : sampleSize;
                box.details['Sample Count'] = sampleCount;
                break;
            }
            case 'stco':
            case 'co64': {
                const entryCount = view.getUint32(12);
                box.details['Entry Count'] = entryCount;
                break;
            }
            case 'trex': {
                box.details['Track ID'] = view.getUint32(12);
                box.details['Default Sample Description Index'] = view.getUint32(16);
                box.details['Default Sample Duration'] = view.getUint32(20);
                box.details['Default Sample Size'] = view.getUint32(24);
                break;
            }
            case 'avcC': {
                box.details['Configuration Version'] = view.getUint8(8);
                box.details['AVC Profile'] = view.getUint8(9);
                box.details['Profile Compatibility'] = view.getUint8(10);
                box.details['AVC Level'] = view.getUint8(11);
                break;
            }
            case 'esds': {
                let offset = 12;
                while(offset < box.size) {
                    const tag = view.getUint8(offset++);
                    let size = 0;
                    let sizeByte = view.getUint8(offset++);
                    while(sizeByte & 0x80) {
                        size = (size << 7) | (sizeByte & 0x7F);
                        sizeByte = view.getUint8(offset++);
                    }
                    size = (size << 7) | (sizeByte & 0x7F);

                    if (tag === 0x03) { 
                        offset += 2; 
                    } else if (tag === 0x04) { 
                        box.details['Object Type Indication'] = view.getUint8(offset);
                        box.details['Stream Type'] = view.getUint8(offset + 1);
                        offset += 13;
                    } else if (tag === 0x05) { 
                        box.details['Decoder Specific Info'] = `(${size} bytes)`;
                        offset += size;
                    } else {
                        offset += size;
                    }
                }
                break;
            }
            case 'mfhd': {
                 box.details['Sequence Number'] = view.getUint32(12);
                break;
            }
            case 'tfhd': {
                box.details['Track ID'] = view.getUint32(12);
                break;
            }
            case 'tfdt': {
                const time = version === 1 ? Number(view.getBigUint64(12)) : view.getUint32(12);
                box.details['Base Media Decode Time'] = time;
                break;
            }
            case 'trun': {
                box.details['Version'] = version;
                box.details['Sample Count'] = view.getUint32(12);
                break;
            }
            case 'pssh': {
                const systemIdMap = {
                    'edef8ba9-79d6-4ace-a3c8-27dcd51d21ed': 'Widevine',
                    '9a04f079-9840-4286-ab92-e65be0885f95': 'PlayReady',
                    '94ce86fb-07ff-4f43-adb8-93d2fa968ca2': 'FairPlay'
                };
                const formatUUID = (buffer, offset) => {
                    const bytes = new Uint8Array(buffer, offset, 16);
                    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
                    return `${hex.substr(0,8)}-${hex.substr(8,4)}-${hex.substr(12,4)}-${hex.substr(16,4)}-${hex.substr(20,12)}`;
                };

                const systemIdUUID = formatUUID(view.buffer, view.byteOffset + 12);
                box.details['System ID'] = `${systemIdMap[systemIdUUID] || 'Unknown'} (${systemIdUUID})`;

                let dataOffset = 28;
                if (version > 0) {
                    const kidCount = view.getUint32(28);
                    box.details['KID Count'] = kidCount;
                    dataOffset = 32;
                    let kids = [];
                    for (let i = 0; i < kidCount; i++) {
                        const kidUUID = formatUUID(view.buffer, view.byteOffset + dataOffset);
                        kids.push(kidUUID);
                        dataOffset += 16;
                    }
                    box.details['KIDs'] = kids.join(', ');
                }

                const dataSize = view.getUint32(dataOffset);
                box.details['Data Size'] = dataSize;
                if (dataSize > 0) {
                    box.details['Data'] = `(${dataSize} bytes of system-specific data)`;
                }
                break;
            }
        }
    } catch (e) { 
        box.details['Parsing Error'] = e.message;
    }
}