import { analyzeSemantics } from '../../features/compliance/domain/semantic-analyzer.js';
import {
    analyzeGopStructure,
    calculateGopStatistics,
} from '../../features/segmentAnalysis/domain/gop-analyzer.js';
import { appLog } from '../../shared/utils/debug.js';
import { boxParsers } from '../parsing/isobmff/index.js';
import { parseISOBMFF } from '../parsing/isobmff/parser.js';
import { parse as parseTsSegment } from '../parsing/ts/index.js';
import { parseNalUnits } from '../parsing/video/nal-parser.js';
import { parseVTT } from '../parsing/vtt/parser.js';
import { fetchWithAuth } from './http.js';

// --- Color Palette Definition ---
const PALETTE = [
    'slate',
    'red',
    'orange',
    'amber',
    'yellow',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'sky',
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
];

const BOX_TYPE_COLOR_INDICES = {};
// Assign stable colors to box types automatically
Object.keys(boxParsers).forEach((type, index) => {
    BOX_TYPE_COLOR_INDICES[type] = (index % (PALETTE.length - 1)) + 1;
});

// Manual Overrides for critical high-level boxes for visual consistency
BOX_TYPE_COLOR_INDICES['ftyp'] = 1; // Red
BOX_TYPE_COLOR_INDICES['styp'] = 1;
BOX_TYPE_COLOR_INDICES['moov'] = 12; // Indigo
BOX_TYPE_COLOR_INDICES['moof'] = 11; // Blue
BOX_TYPE_COLOR_INDICES['mdat'] = 0; // Slate (Default)
BOX_TYPE_COLOR_INDICES['free'] = 0;
BOX_TYPE_COLOR_INDICES['skip'] = 0;
BOX_TYPE_COLOR_INDICES['emsg'] = 14; // Purple
BOX_TYPE_COLOR_INDICES['sidx'] = 9; // Cyan
BOX_TYPE_COLOR_INDICES['CMAF Chunk'] = 0; // Transparent container
BOX_TYPE_COLOR_INDICES['ID32'] = 7;
BOX_TYPE_COLOR_INDICES['stpp'] = 7;
BOX_TYPE_COLOR_INDICES['wvtt'] = 7;
BOX_TYPE_COLOR_INDICES['cprt'] = 16;
BOX_TYPE_COLOR_INDICES['udta'] = 16;
BOX_TYPE_COLOR_INDICES['meta'] = 16;
BOX_TYPE_COLOR_INDICES['ilst'] = 16;
BOX_TYPE_COLOR_INDICES['kind'] = 16;
BOX_TYPE_COLOR_INDICES['elst'] = 15;
BOX_TYPE_COLOR_INDICES['url '] = 9;

// Enhanced TS Color Mapping
const TS_PACKET_COLOR_INDICES = {
    'PSI (PAT)': 1, // Red
    'PSI (PMT)': 4, // Yellow
    'PSI (CAT)': 15, // Fuchsia
    'PSI (TSDT)': 8, // Teal
    'PSI (Private Section)': 14, // Purple
    'PSI (IPMP)': 3,
    'PSI (NIT)': 5, // Lime
    'PSI (SDT)': 5, // Lime
    'PSI (EIT)': 5, // Lime
    PES: 11, // Blue
    'PES (DSM-CC)': 12, // Indigo
    Data: 6, // Green
    'Null Packet': 0, // Slate
    // Stream Types
    'H.264 Video': 10, // Sky
    'HEVC Video': 10,
    'AAC Audio': 13, // Violet
    'ID3 Metadata': 7, // Emerald
};

const findBox = (boxes, type) => {
    for (const box of boxes) {
        if (box.type === type) return box;
        if (box.children) {
            const found = findBox(box.children, type);
            if (found) return found;
        }
    }
    return null;
};

function generateIsoBoxLayout(parsedData, rawDataSize) {
    const flatBoxes = [];

    const traverse = (boxes, depth, parentIdx) => {
        if (!boxes) return;
        for (const box of boxes) {
            const colorIdx = BOX_TYPE_COLOR_INDICES[box.type] ?? 0;
            const end = Math.min(box.offset + box.size, rawDataSize);
            const currentIdx = flatBoxes.length;

            flatBoxes.push({
                start: box.offset,
                end: end,
                color: colorIdx,
                id: box.offset,
                depth: depth,
                parentIdx: parentIdx,
            });

            if (box.children?.length > 0) {
                traverse(box.children, depth + 1, currentIdx);
            }
        }
    };

    traverse(parsedData.data.boxes, 0, -1);

    const boxLayout = new Float64Array(flatBoxes.length * 6);
    for (let i = 0; i < flatBoxes.length; i++) {
        const b = flatBoxes[i];
        const base = i * 6;
        boxLayout[base + 0] = b.start;
        boxLayout[base + 1] = b.end;
        boxLayout[base + 2] = b.color;
        boxLayout[base + 3] = b.id;
        boxLayout[base + 4] = b.depth;
        boxLayout[base + 5] = b.parentIdx;
    }

    return { boxLayout, palette: PALETTE };
}

function generateTsPacketMap(parsedData) {
    const packets = parsedData.data.packets;
    const packetCount = packets.length;
    const packetMap = new Uint8Array(packetCount);

    for (let i = 0; i < packetCount; i++) {
        const p = packets[i];
        const color =
            TS_PACKET_COLOR_INDICES[p.payloadType] !== undefined
                ? TS_PACKET_COLOR_INDICES[p.payloadType]
                : 6;
        packetMap[i] = color;
    }

    return { packetMap, palette: PALETTE };
}

function generateMediaInfoSummary(tsData) {
    if (!tsData?.summary?.programMap) return null;

    const summary = tsData.summary;
    // Use the first PMT found if multiple exist
    const pmtPid = [...summary.pmtPids][0];
    if (!pmtPid) return null;

    const program = summary.programMap[pmtPid];
    if (!program?.streams) return null;

    const mediaInfo = { data: [] };
    const pmtPacket = tsData.packets.find(
        (p) => p.pid === pmtPid && p.psi?.streams
    );

    for (const [pid, streamType] of Object.entries(program.streams)) {
        const typeNum = parseInt(streamType, 16);
        const pidNum = parseInt(pid, 10);

        // Common video stream types
        const videoTypes = [0x01, 0x02, 0x1b, 0x24, 0x80];
        // Common audio stream types
        const audioTypes = [0x03, 0x04, 0x0f, 0x11, 0x1c, 0x81];

        if (videoTypes.includes(typeNum)) {
            // Try to find SPS in PES packets for this PID
            const videoPESWithSPS = tsData.packets.find(
                (p) => p.pid === pidNum && p.pes?.spsInfo
            );
            if (
                videoPESWithSPS &&
                videoPESWithSPS.pes.spsInfo &&
                !videoPESWithSPS.pes.spsInfo.error
            ) {
                mediaInfo.video = {
                    resolution: videoPESWithSPS.pes.spsInfo.resolution,
                    frameRate: videoPESWithSPS.pes.spsInfo.frame_rate,
                    codec: typeNum === 0x24 ? 'H.265' : 'H.264',
                };
            } else {
                // Fallback if SPS not found but type is known
                mediaInfo.video = {
                    resolution: 'Unknown',
                    frameRate: null,
                    codec: typeNum === 0x24 ? 'H.265' : 'H.264 (inferred)',
                };
            }
        } else if (audioTypes.includes(typeNum)) {
            let audioInfo = {
                codec: 'Audio',
                channels: null,
                sampleRate: null,
                language: null,
            };
            if (pmtPacket) {
                const streamInfo = pmtPacket.psi.streams.find(
                    (s) => s.elementary_PID.value === pidNum
                );
                if (streamInfo) {
                    const aacDescriptor = streamInfo.es_descriptors.find(
                        (d) => d.name === 'MPEG-2 AAC Audio Descriptor'
                    );
                    if (aacDescriptor) {
                        audioInfo.codec = 'AAC';
                        const channelConfigString =
                            aacDescriptor.details
                                .MPEG_2_AAC_channel_configuration?.value;
                        if (channelConfigString) {
                            audioInfo.channels = parseInt(
                                channelConfigString.match(/\d+/)?.[0] || '0',
                                10
                            );
                        }
                    }

                    const mpeg4ExtDescriptor = streamInfo.es_descriptors.find(
                        (d) => d.name === 'MPEG-4 Audio Extension Descriptor'
                    );
                    if (mpeg4ExtDescriptor) {
                        const { details } = mpeg4ExtDescriptor;
                        if (details.decoded_audio_object_type?.value) {
                            audioInfo.codec =
                                details.decoded_audio_object_type.value.split(
                                    ' '
                                )[0];
                        }
                        if (details.channels) {
                            audioInfo.channels = details.channels;
                        }
                        if (details.samplerate) {
                            audioInfo.sampleRate = details.samplerate;
                        }
                    }

                    const langDescriptor = streamInfo.es_descriptors.find(
                        (d) => d.name === 'ISO 639 Language Descriptor'
                    );
                    if (
                        langDescriptor &&
                        langDescriptor.details.languages &&
                        langDescriptor.details.languages.length > 0
                    ) {
                        audioInfo.language =
                            langDescriptor.details.languages[0].language.value;
                    }
                }
            }
            mediaInfo.audio = audioInfo;
        } else {
            mediaInfo.data.push({ pid: pidNum, streamType });
        }
    }

    if (Object.keys(mediaInfo).length === 1 && mediaInfo.data.length === 0) {
        return null;
    }

    return mediaInfo;
}

function isValidIsobmff(parsedData) {
    if (
        !parsedData ||
        parsedData.format !== 'isobmff' ||
        !parsedData.data.boxes
    )
        return false;
    if (parsedData.data.boxes.length === 0) return false;
    const firstBox = parsedData.data.boxes[0];
    if (
        firstBox.issues?.some(
            (i) => i.type === 'error' && i.message.includes('truncated')
        )
    )
        return false;
    // Valid box types are usually 4 alphanumeric chars
    if (!/^[a-zA-Z0-9 ]{4}$/.test(firstBox.type)) return false;
    if (firstBox.size > parsedData.data.size && parsedData.data.size > 0)
        return false;
    return true;
}

async function parseSegment({ data, formatHint, url, context }) {
    const dataView = new DataView(data);
    const decoder = new TextDecoder();

    if (formatHint) {
        let result = null;
        if (formatHint === 'isobmff') result = parseISOBMFF(data, 0, context);
        else if (formatHint === 'ts') result = parseTsSegment(data);
        else if (formatHint === 'vtt')
            result = { format: 'vtt', data: parseVTT(decoder.decode(data)) };

        if (formatHint === 'isobmff' && result && !isValidIsobmff(result)) {
            appLog(
                'parsingService',
                'warn',
                `Format hint was ISOBMFF but parsing failed validation. Falling back to content sniffing. URL: ${url}`
            );
        } else {
            return result;
        }
    }

    if (url) {
        let path = url.toLowerCase();
        try {
            path = new URL(url).pathname.toLowerCase();
        } catch (_e) {
            // Use relative path if URL construction fails
        }

        if (path.endsWith('.vtt') || path.endsWith('.webvtt')) {
            return { format: 'vtt', data: parseVTT(decoder.decode(data)) };
        }
        if (path.endsWith('.aac')) {
            return {
                format: 'aac',
                data: { message: 'Raw AAC Audio Segment' },
            };
        }
        if (path.endsWith('.ts')) {
            return parseTsSegment(data);
        }
        if (
            path.endsWith('.m4s') ||
            path.endsWith('.mp4') ||
            path.endsWith('.m4v') ||
            path.endsWith('.cmfv') ||
            path.endsWith('.cmfa')
        ) {
            const result = parseISOBMFF(data, 0, context);
            if (isValidIsobmff(result)) return result;
        }
    }

    // Content Sniffing
    const startText = decoder.decode(data.slice(0, 10));
    if (startText.startsWith('WEBVTT')) {
        return { format: 'vtt', data: parseVTT(decoder.decode(data)) };
    }

    if (data.byteLength >= 188) {
        const firstByte = dataView.getUint8(0);
        if (firstByte === 0x47) {
            return parseTsSegment(data);
        }
    }

    // Default fallback
    return parseISOBMFF(data, 0, context);
}

export async function handleParseSegmentStructure({
    url,
    data,
    formatHint,
    context,
}) {
    const parsedData = await parseSegment({ data, formatHint, url, context });
    parsedData.mediaInfo = null;
    if (parsedData.data) {
        parsedData.data.size = data.byteLength;
    }

    if (parsedData.format === 'isobmff' && parsedData.data.boxes) {
        if (parsedData.data.events && parsedData.data.events.length > 0) {
            const canonicalEvents = parsedData.data.events
                .map((emsgBox) => {
                    if (emsgBox.messagePayloadType === 'scte35') {
                        const timescale = emsgBox.details.timescale.value;
                        const presentationTime =
                            emsgBox.details.presentation_time?.value ?? 0;
                        return {
                            startTime: presentationTime / timescale,
                            duration:
                                emsgBox.details.event_duration.value /
                                timescale,
                            message: `SCTE-35 (ID: ${emsgBox.details.id.value})`,
                            type: 'scte35-inband',
                            scte35: emsgBox.messagePayload,
                        };
                    }
                    return null;
                })
                .filter(Boolean);
            parsedData.data.events = canonicalEvents;
        }
    } else if (parsedData.format === 'ts' && parsedData.data.packets) {
        parsedData.mediaInfo = generateMediaInfoSummary(parsedData.data);
        const layout = generateTsPacketMap(parsedData);
        parsedData.byteMap = layout;
        parsedData.bitstreamAnalysisAttempted = true;
        parsedData.bitstreamAnalysis = null;
    }
    return parsedData;
}

/**
 * Performs deep bitstream analysis (e.g. GOP structure, SEI extraction) if possible.
 * Uses 'context' to find Init Segment boxes if provided.
 */
export async function handleFullSegmentAnalysis({
    parsedData,
    rawData,
    context,
}) {
    if (parsedData.format === 'ts' && parsedData.byteMap) {
        return {
            byteMap: parsedData.byteMap,
            bitstreamAnalysis: null,
            transferables: [parsedData.byteMap.packetMap.buffer],
        };
    }

    appLog('parsingService', 'info', 'Generating optimized bitstream maps.');

    let byteMap = {};
    const transferables = [];

    if (parsedData.format === 'isobmff') {
        const layout = generateIsoBoxLayout(parsedData, rawData.byteLength);
        byteMap = layout;
        transferables.push(layout.boxLayout.buffer);
    } else if (parsedData.format === 'ts') {
        const layout = generateTsPacketMap(parsedData);
        byteMap = layout;
        transferables.push(layout.packetMap.buffer);
    }

    let bitstreamAnalysis = null;
    const collectedSeiMessages = []; // Collection for SEI messages found in the bitstream

    if (parsedData.format === 'isobmff' && rawData) {
        const boxes = parsedData.data.boxes;
        let avcC = findBox(boxes, 'avcC');
        let hvcC = findBox(boxes, 'hvcC');
        const mdat = findBox(boxes, 'mdat');

        // Extract Resolution
        let width = 0;
        let height = 0;
        const extractRes = (box) => {
            if (box && box.details && box.details.width && box.details.height) {
                width = parseFloat(box.details.width.value);
                height = parseFloat(box.details.height.value);
            }
        };

        // Check local first
        if (parsedData.data.boxes) {
            const avc1 = findBox(parsedData.data.boxes, 'avc1');
            const hvc1 = findBox(parsedData.data.boxes, 'hvc1');
            extractRes(avc1 || hvc1);
        }

        // Check context (Init Segment)
        if (!avcC && !hvcC && context?.initSegmentBoxes) {
            avcC = findBox(context.initSegmentBoxes, 'avcC');
            hvcC = findBox(context.initSegmentBoxes, 'hvcC');
            const avc1Init = findBox(context.initSegmentBoxes, 'avc1');
            const hvc1Init = findBox(context.initSegmentBoxes, 'hvc1');
            if (!width) extractRes(avc1Init || hvc1Init);
        }

        let codec = null;
        let lengthSizeMinusOne = 3;
        let activeSps = null;

        if (avcC) {
            codec = 'avc';
            if (avcC.details.lengthSizeMinusOne)
                lengthSizeMinusOne = avcC.details.lengthSizeMinusOne.value;
            if (avcC.spsList && avcC.spsList.length > 0) {
                activeSps = avcC.spsList[0].parsed;
            }
        } else if (hvcC) {
            codec = 'hevc';
            if (hvcC.details.lengthSizeMinusOne)
                lengthSizeMinusOne = hvcC.details.lengthSizeMinusOne.value;
        }

        if (!codec && mdat) {
            codec = 'avc'; // Fallback assumption
        }

        if (codec && mdat) {
            try {
                const rawUint8 = new Uint8Array(rawData);

                // ARCHITECTURAL FIX: Prioritize Container Sample Table
                if (parsedData.samples && parsedData.samples.length > 0) {
                    const videoFrames = parsedData.samples.map(
                        (sample, index) => {
                            let isKeyFrame = false;
                            let frameType = 'Unknown';
                            const nalTypes = [];

                            if (sample.size > 0) {
                                const sampleData = rawUint8.subarray(
                                    sample.offset,
                                    sample.offset + sample.size
                                );
                                const nals = parseNalUnits(
                                    sampleData,
                                    lengthSizeMinusOne,
                                    /** @type {'avc'|'hevc'|'vvc'} */ (codec),
                                    sample.offset,
                                    activeSps
                                );
                                nalTypes.push(...nals.map((n) => n.type));

                                if (nals.some((n) => n.isIdr)) {
                                    isKeyFrame = true;
                                    frameType = 'I';
                                } else if (nals.some((n) => n.isVcl)) {
                                    frameType = 'P/B';
                                }

                                // --- Collect SEI Messages ---
                                nals.forEach((n) => {
                                    if (
                                        n.seiMessage &&
                                        n.seiMessage.length > 0
                                    ) {
                                        n.seiMessage.forEach((msg) => {
                                            collectedSeiMessages.push({
                                                ...msg,
                                                sampleIndex: index,
                                                // Approximate presentation timestamp from container
                                                timestamp:
                                                    sample.compositionTimeOffset,
                                            });
                                        });
                                    }
                                });
                            }

                            return {
                                index,
                                type: frameType,
                                size: sample.size,
                                isKeyFrame,
                                nalTypes,
                            };
                        }
                    );

                    const duration =
                        parsedData.samples.reduce(
                            (acc, s) => acc + s.duration,
                            0
                        ) / (parsedData.samples[0]?.timescale || 90000);

                    bitstreamAnalysis = calculateGopStatistics(
                        videoFrames,
                        duration,
                        width,
                        height
                    );

                    // Attach extracted SEI data to the analysis result
                    bitstreamAnalysis.seiMessages = collectedSeiMessages;
                } else {
                    // Fallback to raw scanning of mdat if no sample table exists
                    const mdatStart = mdat.contentOffset;
                    const mdatEnd = mdat.offset + mdat.size;
                    const mdatBody = rawUint8.subarray(mdatStart, mdatEnd);
                    const nalUnits = parseNalUnits(
                        mdatBody,
                        lengthSizeMinusOne,
                        /** @type {'avc'|'hevc'|'vvc'} */ (codec),
                        mdatStart,
                        activeSps
                    );
                    bitstreamAnalysis = analyzeGopStructure(nalUnits, 0);

                    // Collect SEI from raw scan results
                    nalUnits.forEach((n) => {
                        if (n.seiMessage && n.seiMessage.length > 0) {
                            collectedSeiMessages.push(...n.seiMessage);
                        }
                    });
                    bitstreamAnalysis.seiMessages = collectedSeiMessages;
                }
            } catch (e) {
                console.warn('Bitstream analysis warning:', e.message);
            }
        }
    }

    return {
        byteMap,
        bitstreamAnalysis,
        transferables,
    };
}

export async function handleFetchAndParseSegment(payload, signal) {
    const { uniqueId, auth, range, interventionRules } = payload; // Extract rules
    const [url] = uniqueId.split('@');
    // Use rules
    const response = await fetchWithAuth(
        url,
        auth,
        range,
        {},
        null,
        signal,
        { streamId: payload.streamId, resourceType: 'video' }, // Context for logging
        'GET',
        interventionRules // Pass rules
    );
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.arrayBuffer();
    const parsedData = await handleParseSegmentStructure({
        data,
        formatHint: payload.formatHint,
        url,
        context: payload.context,
    });
    return { data, parsedData };
}

export async function handleDecryptAndParseSegment(
    { url, key, iv, formatHint, interventionRules },
    signal
) {
    // Use rules
    const response = await fetchWithAuth(
        url,
        null,
        null,
        {},
        null,
        signal,
        { resourceType: 'video' },
        'GET',
        interventionRules
    );
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const encryptedData = await response.arrayBuffer();
    const cryptoKey = await self.crypto.subtle.importKey(
        'raw',
        key,
        { name: 'AES-CBC' },
        false,
        ['decrypt']
    );
    const decryptedData = await self.crypto.subtle.decrypt(
        { name: 'AES-CBC', iv: iv },
        cryptoKey,
        encryptedData
    );
    const parsedData = await handleParseSegmentStructure({
        data: decryptedData,
        formatHint,
        url,
        context: {},
    });
    return { parsedData, decryptedData };
}

export async function handleFetchKey({ uri, auth, interventionRules }, signal) {
    if (uri.startsWith('data:')) {
        const base64Data = uri.split(',')[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        return bytes.buffer;
    }
    // Use rules
    const response = await fetchWithAuth(
        uri,
        auth,
        null,
        {},
        null,
        signal,
        { resourceType: 'key' },
        'GET',
        interventionRules
    );
    if (!response.ok)
        throw new Error(`HTTP error ${response.status} fetching key`);
    return response.arrayBuffer();
}

export async function handleRunTsSemanticAnalysis({ packets, summary }) {
    return analyzeSemantics({ packets, summary });
}
