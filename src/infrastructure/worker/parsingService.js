import { analyzeSemantics } from '../../features/compliance/domain/semantic-analyzer.js';
import { calculateGopStatistics } from '../../features/segmentAnalysis/domain/gop-analyzer.js';
import { appLog } from '../../shared/utils/debug.js';
import { boxParsers } from '../parsing/isobmff/index.js';
import { parseISOBMFF } from '../parsing/isobmff/parser.js';
import { extractPesFromTs, stripPesHeaders } from '../parsing/ts/demuxer.js';
import { parse as parseTsSegment } from '../parsing/ts/index.js';
import { parseTTML } from '../parsing/ttml/index.js';
import { reconstructFrames } from '../parsing/video/frame-builder.js';
import {
    parseAnnexBNalUnits,
    parseNalUnits,
} from '../parsing/video/nal-parser.js';
import { parseVTT } from '../parsing/vtt/parser.js';
import { fetchWithAuth } from './http.js';

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
Object.keys(boxParsers).forEach((type, index) => {
    BOX_TYPE_COLOR_INDICES[type] = (index % (PALETTE.length - 1)) + 1;
});
// Manual overrides
BOX_TYPE_COLOR_INDICES['ftyp'] = 1;
BOX_TYPE_COLOR_INDICES['styp'] = 1;
BOX_TYPE_COLOR_INDICES['moov'] = 12;
BOX_TYPE_COLOR_INDICES['moof'] = 11;
BOX_TYPE_COLOR_INDICES['mdat'] = 0;
BOX_TYPE_COLOR_INDICES['free'] = 0;
BOX_TYPE_COLOR_INDICES['skip'] = 0;
BOX_TYPE_COLOR_INDICES['emsg'] = 14;
BOX_TYPE_COLOR_INDICES['sidx'] = 9;
BOX_TYPE_COLOR_INDICES['ID32'] = 7;
BOX_TYPE_COLOR_INDICES['stpp'] = 7;
BOX_TYPE_COLOR_INDICES['wvtt'] = 7;

const TS_PACKET_COLOR_INDICES = {
    'PSI (PAT)': 1,
    'PSI (PMT)': 3,
    'PSI (CAT)': 15,
    'PSI (TSDT)': 8,
    'PSI (Private Section)': 14,
    'PSI (IPMP)': 3,
    'PSI (NIT)': 5,
    'PSI (SDT)': 5,
    'PSI (EIT)': 5,
    PES: 11,
    'PES (DSM-CC)': 12,
    Data: 6,
    'Null Packet': 0,
    'H.264 Video': 10,
    'HEVC Video': 10,
    'AAC Audio': 13,
    'ID3 Metadata': 7,
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
        // Fix: Corrected variable name from TS_PACKET_SIZE_COLOR_INDICES to TS_PACKET_COLOR_INDICES
        const color =
            TS_PACKET_COLOR_INDICES[p.payloadType] !== undefined
                ? TS_PACKET_COLOR_INDICES[p.payloadType]
                : 6;
        packetMap[i] = color;
    }
    return { packetMap, palette: PALETTE };
}

// Reused Helper from original file
function findVideoPid(summary) {
    if (!summary?.programMap) return null;
    const pmtPid = [...summary.pmtPids][0];
    if (!pmtPid) return null;
    const program = summary.programMap[pmtPid];
    if (!program?.streams) return null;
    for (const [pidStr, typeStr] of Object.entries(program.streams)) {
        const type = parseInt(typeStr, 16);
        const pid = parseInt(pidStr, 10);
        if (type === 0x1b) return { pid, codec: 'avc' }; // H.264
        if (type === 0x24) return { pid, codec: 'hevc' }; // H.265
        if (type === 0x02) return { pid, codec: 'avc' }; // MPEG-2
    }
    return null;
}

function generateMediaInfoSummary(tsData) {
    if (!tsData?.summary?.programMap) return null;
    const summary = tsData.summary;
    const pmtPid = [...summary.pmtPids][0];
    if (!pmtPid) return null;
    const program = summary.programMap[pmtPid];
    if (!program?.streams) return null;

    const mediaInfo = { data: [], descriptors: [] };
    for (const [pid, typeHex] of Object.entries(program.streams)) {
        const typeNum = parseInt(typeHex, 16);
        const pidNum = parseInt(pid, 10);
        const details = program.streamDetails?.[pid];
        if (details?.descriptors) {
            details.descriptors.forEach((d) => {
                mediaInfo.descriptors.push({
                    pid: pidNum,
                    tag: d.tag,
                    name: d.name,
                    content: d.details,
                });
            });
        }
        const videoTypes = [0x01, 0x02, 0x1b, 0x24, 0x80];
        const audioTypes = [0x03, 0x04, 0x0f, 0x11, 0x1c, 0x81];

        if (videoTypes.includes(typeNum)) {
            let resolution = 'Unknown';
            let frameRate = null;
            let codec = typeNum === 0x24 ? 'H.265' : 'H.264';
            if (details?.descriptors) {
                const avcDesc = details.descriptors.find(
                    (d) => d.name === 'AVC Video Descriptor'
                );
                if (avcDesc) {
                    const profile = avcDesc.details.profile_idc?.value;
                    const level = avcDesc.details.level_idc?.value;
                    if (profile && level)
                        codec = `H.264 (Profile ${profile}, Level ${level})`;
                }
            }
            const videoPESWithSPS = tsData.packets.find(
                (p) => p.pid === pidNum && p.pes?.spsInfo
            );
            if (
                videoPESWithSPS &&
                videoPESWithSPS.pes.spsInfo &&
                !videoPESWithSPS.pes.spsInfo.error
            ) {
                resolution = videoPESWithSPS.pes.spsInfo.resolution;
                frameRate = videoPESWithSPS.pes.spsInfo.frame_rate;
            }
            mediaInfo.video = { resolution, frameRate, codec };
        } else if (audioTypes.includes(typeNum)) {
            let audioInfo = {
                codec: 'Audio',
                channels: null,
                sampleRate: null,
                language: null,
            };
            if (details?.descriptors) {
                const langDesc = details.descriptors.find(
                    (d) => d.name === 'ISO 639 Language Descriptor'
                );
                if (langDesc?.details?.languages?.[0])
                    audioInfo.language =
                        langDesc.details.languages[0].language.value;
                const aacDesc = details.descriptors.find(
                    (d) => d.name === 'MPEG-2 AAC Audio Descriptor'
                );
                if (aacDesc) audioInfo.codec = 'AAC';
            }
            mediaInfo.audio = audioInfo;
        } else {
            mediaInfo.data.push({ pid: pidNum, streamType: typeHex });
        }
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
    if (!/^[a-zA-Z0-9 ]{4}$/.test(firstBox.type)) return false;
    return true;
}

function isValidTs(parsedData) {
    if (!parsedData || parsedData.format !== 'ts') return false;
    if (!parsedData.data.packets || parsedData.data.packets.length === 0)
        return false;
    if (
        parsedData.data.summary?.errors?.some((e) =>
            e.includes('missing sync byte')
        )
    )
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
        else if (formatHint === 'ttml')
            result = { format: 'ttml', data: parseTTML(decoder.decode(data)) };

        let isValid = true;
        if (formatHint === 'isobmff' && !isValidIsobmff(result))
            isValid = false;
        if (formatHint === 'ts' && !isValidTs(result)) isValid = false;
        if (isValid) return result;
    }

    if (url) {
        let path = '';
        try {
            path = new URL(url).pathname.toLowerCase();
        } catch (_e) {
            /* ignore */
        }
        if (path.endsWith('.vtt'))
            return { format: 'vtt', data: parseVTT(decoder.decode(data)) };
        if (path.endsWith('.ttml') || path.endsWith('.xml'))
            return { format: 'ttml', data: parseTTML(decoder.decode(data)) };
        if (path.endsWith('.ts')) {
            const res = parseTsSegment(data);
            if (isValidTs(res)) return res;
        }
        if (path.endsWith('.m4s') || path.endsWith('.mp4')) {
            const result = parseISOBMFF(data, 0, context);
            if (isValidIsobmff(result)) return result;
        }
    }

    // Sniff
    const sniffLimit = Math.min(data.byteLength, 1024);
    const startText = decoder.decode(data.slice(0, sniffLimit)).trim();
    if (startText.startsWith('WEBVTT'))
        return { format: 'vtt', data: parseVTT(decoder.decode(data)) };
    if (
        startText.includes('<tt') ||
        startText.includes('http://www.w3.org/ns/ttml')
    )
        return { format: 'ttml', data: parseTTML(decoder.decode(data)) };

    if (data.byteLength >= 188 && dataView.getUint8(0) === 0x47) {
        const res = parseTsSegment(data);
        appLog(
            'parsingService',
            'info',
            `Sniffed TS. Valid: ${isValidTs(res)}. Errors: ${res.data.summary.errors.join(', ')}`
        );
        return res;
    }

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
    if (parsedData.data) parsedData.data.size = data.byteLength;

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
        parsedData.bitstreamAnalysis = null;
    }
    return parsedData;
}

export async function handleFullSegmentAnalysis({
    parsedData,
    rawData,
    context,
}) {
    // Avoid double work
    if (
        parsedData.format === 'ts' &&
        parsedData.byteMap &&
        parsedData.bitstreamAnalysis
    ) {
        return {
            byteMap: parsedData.byteMap,
            bitstreamAnalysis: parsedData.bitstreamAnalysis,
            transferables: [],
        };
    }

    appLog(
        'parsingService',
        'info',
        `Generating bitstream analysis for ${parsedData.format}.`
    );

    let byteMap = parsedData.byteMap;
    const transferables = [];

    if (!byteMap) {
        if (parsedData.format === 'isobmff') {
            const layout = generateIsoBoxLayout(parsedData, rawData.byteLength);
            byteMap = layout;
            transferables.push(layout.boxLayout.buffer);
        } else if (parsedData.format === 'ts') {
            const layout = generateTsPacketMap(parsedData);
            byteMap = layout;
            transferables.push(layout.packetMap.buffer);
        }
    }

    let bitstreamAnalysis = null;
    let detectedCodec = null;
    const collectedSeiMessages = [];

    if (parsedData.format === 'isobmff' && rawData) {
        const boxes = parsedData.data.boxes;
        let avcC = findBox(boxes, 'avcC');
        let hvcC = findBox(boxes, 'hvcC');
        const mdat = findBox(boxes, 'mdat');

        let width = context?.manifestWidth || 0;
        let height = context?.manifestHeight || 0;

        const extractRes = (box) => {
            if (box && box.details && box.details.width && box.details.height) {
                const w = parseFloat(box.details.width.value);
                const h = parseFloat(box.details.height.value);
                if (w > 0 && h > 0) {
                    width = w;
                    height = h;
                }
            }
        };

        if (parsedData.data.boxes) {
            const avc1 = findBox(parsedData.data.boxes, 'avc1');
            const hvc1 = findBox(parsedData.data.boxes, 'hvc1');
            extractRes(avc1 || hvc1);
        }

        if (!avcC && !hvcC && context?.initSegmentBoxes) {
            avcC = findBox(context.initSegmentBoxes, 'avcC');
            hvcC = findBox(context.initSegmentBoxes, 'hvcC');
            const avc1Init = findBox(context.initSegmentBoxes, 'avc1');
            const hvc1Init = findBox(context.initSegmentBoxes, 'hvc1');
            extractRes(avc1Init || hvc1Init);
        }

        let codec = null;
        let lengthSizeMinusOne = 3;
        let activeSps = null;

        if (avcC) {
            codec = 'avc';
            detectedCodec = 'H.264 (AVC)';
            if (avcC.details.lengthSizeMinusOne)
                lengthSizeMinusOne = avcC.details.lengthSizeMinusOne.value;
            if (avcC.spsList && avcC.spsList.length > 0)
                activeSps = avcC.spsList[0].parsed;
        } else if (hvcC) {
            codec = 'hevc';
            detectedCodec = 'H.265 (HEVC)';
            if (hvcC.details.lengthSizeMinusOne)
                lengthSizeMinusOne = hvcC.details.lengthSizeMinusOne.value;
        } else if (mdat) {
            // Infer from manifest context or assume AVC
            codec = 'avc';
            detectedCodec = 'H.264 (Inferred)';
        }

        if (codec && mdat) {
            const rawUint8 = new Uint8Array(rawData);
            const samples = parsedData.samples || [];

            if (samples.length > 0) {
                const videoFrames = samples.map((sample, index) => {
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
                        } else if (nals.some((n) => n.isVcl)) frameType = 'P/B';

                        nals.forEach((n) => {
                            if (n.seiMessage && n.seiMessage.length > 0) {
                                n.seiMessage.forEach((msg) => {
                                    collectedSeiMessages.push({
                                        ...msg,
                                        sampleIndex: index,
                                        timestamp: sample.compositionTimeOffset,
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
                });

                const duration =
                    samples.reduce((acc, s) => acc + s.duration, 0) /
                    (samples[0]?.timescale || 90000);
                bitstreamAnalysis = calculateGopStatistics(
                    videoFrames,
                    duration,
                    width,
                    height
                );
                bitstreamAnalysis.seiMessages = collectedSeiMessages;
            }
        }
    } else if (parsedData.format === 'ts' && rawData) {
        // --- Refactored TS Logic using Demuxer & FrameBuilder ---
        const summary = parsedData.data?.summary;
        const videoInfo = findVideoPid(summary);

        if (videoInfo) {
            try {
                const tsUint8 = new Uint8Array(rawData);
                // 1. Demux (Extract Payload)
                const pesPayload = extractPesFromTs(tsUint8, videoInfo.pid);
                // 2. Strip PES Headers to get raw ES
                const esData = stripPesHeaders(pesPayload);

                if (esData && esData.length > 0) {
                    // 3. Scan for NALs (Annex B)
                    const nalUnits = parseAnnexBNalUnits(
                        esData,
                        /** @type {'avc'|'hevc'|'vvc'} */ (videoInfo.codec)
                    );
                    appLog(
                        'parsingService(full-ts)',
                        'info',
                        `Extracted ${nalUnits.length} NAL units from PID ${videoInfo.pid}`
                    );
                    // 4. Reconstruct Frames
                    const frames = reconstructFrames(nalUnits);

                    // 5. Calculate GOP Stats
                    let duration = 0;
                    if (summary.pcrList && summary.pcrList.count > 1) {
                        const first = Number(summary.pcrList.firstPcr);
                        const last = Number(summary.pcrList.lastPcr);
                        duration = (last - first) / 27000000;
                    }
                    bitstreamAnalysis = calculateGopStatistics(
                        frames,
                        duration,
                        0,
                        0
                    );

                    detectedCodec =
                        videoInfo.codec === 'hevc'
                            ? 'H.265 (TS)'
                            : 'H.264 (TS)';
                }
            } catch (e) {
                console.warn('TS Bitstream analysis failed:', e);
            }
        }
    }

    return { byteMap, bitstreamAnalysis, transferables, detectedCodec };
}

export async function handleFetchAndParseSegment(payload, signal) {
    const { uniqueId, auth, range, interventionRules } = payload;
    const [url] = uniqueId.split('@');
    const response = await fetchWithAuth(
        url,
        auth,
        range,
        {},
        null,
        signal,
        { streamId: payload.streamId, resourceType: 'video' },
        'GET',
        interventionRules
    );
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.arrayBuffer();
    const parsedData = await handleParseSegmentStructure({
        data,
        formatHint: payload.formatHint,
        url,
        context: payload.context,
    });
    return { data, parsedData, status: 200 };
}

export async function handleDecryptAndParseSegment(
    { url, key, iv, formatHint, interventionRules },
    signal
) {
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
        { name: 'AES-CBC', iv },
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
        const base64 = uri.split(',')[1];
        const bin = atob(base64);
        const len = bin.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
        return bytes.buffer;
    }
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
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    return response.arrayBuffer();
}

export async function handleRunTsSemanticAnalysis({ packets, summary }) {
    return analyzeSemantics({ packets, summary });
}
