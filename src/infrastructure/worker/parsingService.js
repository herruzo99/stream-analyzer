import { parseISOBMFF } from '@/infrastructure/parsing/isobmff/parser';
import { parse as parseTsSegment } from '@/infrastructure/parsing/ts/index';
import { parseVTT } from '@/infrastructure/parsing/vtt/parser';
import { debugLog } from '@/shared/utils/debug';
import { boxParsers } from '@/infrastructure/parsing/isobmff/index';
import { fetchWithAuth } from './http.js';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';

// --- Color Generation and Assignment (Co-located with parsing) ---
const COLOR_NAMES = [
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
const generateColorFamilies = (names) => {
    const families = {};
    for (const name of names) {
        families[name] = [
            { bg: `bg-${name}-800`, border: `border-${name}-600` },
            { bg: `bg-${name}-700`, border: `border-${name}-500` },
            { bg: `bg-${name}-600`, border: `border-${name}-400` },
        ];
    }
    families['slate'] = [
        { bg: 'bg-slate-800', border: 'border-slate-600' },
        { bg: 'bg-slate-700', border: 'border-slate-500' },
        { bg: 'bg-slate-800/70', border: 'border-slate-600/80' },
    ];
    return families;
};
const TAILWIND_COLORS = generateColorFamilies(COLOR_NAMES);

const generateBoxColorMap = () => {
    const map = {};
    let colorIndex = 0;
    const knownBoxTypes = Object.keys(boxParsers);
    for (const boxType of knownBoxTypes) {
        map[boxType] = COLOR_NAMES[colorIndex];
        colorIndex = (colorIndex + 1) % COLOR_NAMES.length;
    }
    map['mdat'] = 'slate';
    map['free'] = 'slate';
    map['skip'] = 'slate';
    map['default'] = 'slate';
    return map;
};
const BOX_TYPE_COLOR_MAP = generateBoxColorMap();

const TS_PACKET_COLOR_MAP = {
    'PSI (PAT)': 'red',
    'PSI (PMT)': 'yellow',
    'PSI (CAT)': 'pink',
    'PSI (TSDT)': 'teal',
    'PSI (Private Section)': 'purple',
    PES: 'blue',
    'PES (DSM-CC)': 'indigo',
    Data: 'green',
    'Null Packet': 'slate',
    default: 'slate',
};

function assignBoxColors(boxes) {
    if (!boxes) return;
    const traverse = (boxList) => {
        let lastColorFamilyName = null;
        let lastColorIndex = 0;
        for (const box of boxList) {
            const colorFamilyName =
                (box.isChunk ? 'slate' : BOX_TYPE_COLOR_MAP[box.type]) ||
                'slate';
            const colorFamily = TAILWIND_COLORS[colorFamilyName];
            let colorIndex;
            if (colorFamilyName === lastColorFamilyName) {
                colorIndex = (lastColorIndex + 1) % colorFamily.length;
            } else {
                colorIndex = 0;
            }
            const selectedShade = colorFamily[colorIndex];
            box.color = {
                name: colorFamilyName,
                bgClass: selectedShade.bg,
                border: selectedShade.border,
            };
            lastColorFamilyName = colorFamilyName;
            lastColorIndex = colorIndex;
            if (box.children?.length > 0) {
                traverse(box.children);
            }
        }
    };
    traverse(boxes);
}

function assignTsPacketColors(packets) {
    if (!packets) return;
    let lastColorFamilyName = null;
    let lastColorIndex = 0;
    for (const packet of packets) {
        const colorFamilyName =
            TS_PACKET_COLOR_MAP[packet.payloadType] ||
            TS_PACKET_COLOR_MAP.default;
        const colorFamily = TAILWIND_COLORS[colorFamilyName];
        let colorIndex;
        if (colorFamilyName === lastColorFamilyName) {
            colorIndex = (lastColorIndex + 1) % colorFamily.length;
        } else {
            colorIndex = 0;
        }
        const selectedShade = colorFamily[colorIndex];
        packet.color = {
            name: colorFamilyName,
            bgClass: selectedShade.bg,
            border: selectedShade.border,
        };
        lastColorFamilyName = colorFamilyName;
        lastColorIndex = colorIndex;
    }
}

// --- End Color Logic ---

const findBoxRecursive = (boxes, predicate) => {
    if (!boxes) return null;
    for (const box of boxes) {
        if (predicate(box)) return box;
        if (box.children?.length > 0) {
            const found = findBoxRecursive(box.children, predicate);
            if (found) return found;
        }
    }
    return null;
};

function buildCanonicalSampleList(parsedData) {
    const samples = [];
    let sampleIndex = 0;
    const moofBoxes = parsedData.data.boxes.filter((b) => b.type === 'moof');
    moofBoxes.forEach((moofBox) => {
        const trafBoxes = moofBox.children.filter((c) => c.type === 'traf');
        trafBoxes.forEach((traf) => {
            const tfhd = findBoxRecursive(
                traf.children,
                (b) => b.type === 'tfhd'
            );
            const trun = findBoxRecursive(
                traf.children,
                (b) => b.type === 'trun'
            );
            const tfdt = findBoxRecursive(
                traf.children,
                (b) => b.type === 'tfdt'
            );
            if (!trun || !tfhd) return;
            const baseDataOffset =
                tfhd.details.base_data_offset?.value || moofBox.offset || 0;
            const dataOffset = trun.details.data_offset?.value || 0;
            let currentOffset = baseDataOffset + dataOffset;

            (trun.samples || []).forEach((sampleInfo) => {
                const sample = {
                    isSample: true,
                    index: sampleIndex,
                    offset: currentOffset,
                    size: sampleInfo.size,
                    duration: sampleInfo.duration,
                    compositionTimeOffset: sampleInfo.compositionTimeOffset,
                    flags: sampleInfo.flags,
                    baseMediaDecodeTime:
                        tfdt?.details.baseMediaDecodeTime?.value,
                    trackId: tfhd.details.track_ID?.value,
                    color: { bgClass: 'bg-gray-700/20' },
                };

                sampleInfo.offset = currentOffset;
                sampleInfo.index = sampleIndex;

                samples.push(sample);
                currentOffset += sampleInfo.size;
                sampleIndex++;
            });
        });
    });
    return samples;
}

function decorateSamples(samples, parsedData) {
    const sdtp = findBoxRecursive(
        parsedData.data.boxes,
        (b) => b.type === 'sdtp'
    );
    const stdp = findBoxRecursive(
        parsedData.data.boxes,
        (b) => b.type === 'stdp'
    );
    const sbgp = findBoxRecursive(
        parsedData.data.boxes,
        (b) => b.type === 'sbgp'
    );
    const senc = findBoxRecursive(
        parsedData.data.boxes,
        (b) => b.type === 'senc'
    );
    let sbgpSampleCounter = 0;
    let sbgpEntryIndex = 0;
    samples.forEach((sample, i) => {
        if (sdtp?.entries?.[i]) {
            sample.dependsOn = sdtp.entries[i].sample_depends_on;
        }
        if (stdp?.entries?.[i]) {
            sample.degradationPriority = stdp.entries[i];
        }
        if (sbgp?.entries) {
            if (sbgpSampleCounter === 0) {
                if (sbgp.entries[sbgpEntryIndex]) {
                    sbgpSampleCounter =
                        sbgp.entries[sbgpEntryIndex].sample_count;
                }
            }
            if (sbgpSampleCounter > 0) {
                sample.sampleGroup =
                    sbgp.entries[sbgpEntryIndex].group_description_index;
                sbgpSampleCounter--;
                if (sbgpSampleCounter === 0) {
                    sbgpEntryIndex++;
                }
            }
        }
        if (senc?.samples?.[i]) {
            sample.encryption = senc.samples[i];
        }
    });
}

function generateFullByteMap(parsedData) {
    const byteMap = new Map();

    if (parsedData.format === 'isobmff') {
        const walkAndMap = (boxes) => {
            if (!boxes) return;
            for (const box of boxes) {
                const isMdat = box.type === 'mdat';
                for (let i = box.offset; i < box.contentOffset; i++) {
                    byteMap.set(i, {
                        box,
                        color: box.color,
                        fieldName: 'Box Header',
                    });
                }
                if (!isMdat) {
                    for (const [fieldName, field] of Object.entries(
                        box.details
                    )) {
                        const fieldEnd = field.offset + Math.ceil(field.length);
                        for (let i = field.offset; i < fieldEnd; i++) {
                            byteMap.set(i, {
                                box,
                                color: box.color,
                                fieldName,
                            });
                        }
                    }
                } else {
                    for (
                        let i = box.contentOffset;
                        i < box.offset + box.size;
                        i++
                    ) {
                        if (!byteMap.has(i)) {
                            byteMap.set(i, {
                                box,
                                color: box.color,
                                fieldName: 'Media Data',
                            });
                        }
                    }
                }
                if (box.children?.length > 0) {
                    walkAndMap(box.children);
                }
            }
        };
        walkAndMap(parsedData.data.boxes);

        if (parsedData.samples) {
            for (const sample of parsedData.samples) {
                const sampleColor = { bgClass: 'bg-gray-700/30' };
                for (
                    let i = sample.offset;
                    i < sample.offset + sample.size;
                    i++
                ) {
                    byteMap.set(i, {
                        sample,
                        color: sampleColor,
                        fieldName: 'Sample Data',
                    });
                }
                if (sample.encryption?.subsamples) {
                    let currentByte = sample.offset;
                    for (const subsample of sample.encryption.subsamples) {
                        for (let i = 0; i < subsample.BytesOfClearData; i++) {
                            const bytePos = currentByte + i;
                            const entry = byteMap.get(bytePos) || {
                                sample,
                                color: sampleColor,
                                fieldName: 'Sample Data',
                            };
                            entry.isClear = true;
                            byteMap.set(bytePos, entry);
                        }
                        currentByte +=
                            subsample.BytesOfClearData +
                            subsample.BytesOfProtectedData;
                    }
                }
            }
        }
    } else if (parsedData.format === 'ts') {
        parsedData.data.packets.forEach((packet) => {
            const baseClass = packet.color?.bgClass;
            for (let i = packet.offset; i < packet.offset + 188; i++) {
                const color = baseClass ? { bgClass: baseClass } : {};
                byteMap.set(i, { packet, color, fieldName: 'Packet Data' });
            }
        });
    }

    return Array.from(byteMap.entries());
}

export async function parseSegment({ data, formatHint, url }) {
    debugLog(
        'parseSegment',
        `Parsing segment. URL: ${url}, Format Hint: ${formatHint}`
    );
    const dataView = new DataView(data);
    const decoder = new TextDecoder();

    if (formatHint) {
        if (formatHint === 'isobmff') return parseISOBMFF(data);
        if (formatHint === 'ts') return parseTsSegment(data);
        if (formatHint === 'vtt')
            return { format: 'vtt', data: parseVTT(decoder.decode(data)) };
    }

    if (url) {
        try {
            const path = new URL(url).pathname.toLowerCase();
            if (path.endsWith('.vtt'))
                return { format: 'vtt', data: parseVTT(decoder.decode(data)) };
            if (path.endsWith('.aac'))
                return {
                    format: 'aac',
                    data: { message: 'Raw AAC Audio Segment' },
                };
        } catch (e) {
            // Non-URL string, proceed to byte-sniffing
        }
    }

    try {
        if (decoder.decode(data.slice(0, 10)).startsWith('WEBVTT')) {
            return { format: 'vtt', data: parseVTT(decoder.decode(data)) };
        }
    } catch {}

    if (data.byteLength >= 8) {
        const size = dataView.getUint32(0);
        const typeCode1 = dataView.getUint8(4);
        const typeCode2 = dataView.getUint8(5);
        const typeCode3 = dataView.getUint8(6);
        const typeCode4 = dataView.getUint8(7);
        const isPrintable = (code) => code >= 32 && code <= 126;
        if (
            (size >= 8 || size === 1) &&
            size <= data.byteLength &&
            isPrintable(typeCode1) &&
            isPrintable(typeCode2) &&
            isPrintable(typeCode3) &&
            isPrintable(typeCode4)
        ) {
            return parseISOBMFF(data);
        }
    }

    if (
        data.byteLength > 188 &&
        dataView.getUint8(0) === 0x47 &&
        dataView.getUint8(188) === 0x47
    ) {
        return parseTsSegment(data);
    }

    return parseISOBMFF(data);
}

export async function handleParseSegmentStructure({ url, data, formatHint }) {
    const parsedData = await parseSegment({ data, formatHint, url });
    if (parsedData.format === 'isobmff' && parsedData.data.boxes) {
        assignBoxColors(parsedData.data.boxes);
        const samples = buildCanonicalSampleList(parsedData);
        decorateSamples(samples, parsedData);
        parsedData.samples = samples;
        if (parsedData.data.events && parsedData.data.events.length > 0) {
            const canonicalEvents = parsedData.data.events
                .map((emsgBox) => {
                    if (emsgBox.scte35) {
                        const timescale = emsgBox.details.timescale.value;
                        const presentationTime =
                            emsgBox.details.presentation_time?.value ??
                            emsgBox.details.presentation_time_delta?.value ??
                            0;
                        const eventDuration =
                            emsgBox.details.event_duration.value;
                        if (timescale === 0) return null;
                        return {
                            startTime: presentationTime / timescale,
                            duration: eventDuration / timescale,
                            message: `SCTE-35 Signal (ID: ${emsgBox.details.id.value})`,
                            type: 'scte35-inband',
                            scte35: emsgBox.scte35,
                            messageData: null,
                            cue: null,
                        };
                    }
                    return null;
                })
                .filter(Boolean);
            parsedData.data.events = canonicalEvents;
        }
    } else if (parsedData.format === 'ts' && parsedData.data.packets) {
        assignTsPacketColors(parsedData.data.packets);
    }

    // --- ARCHITECTURAL CHANGE ---
    // Generate the full byte map here, co-located with the parsing logic.
    parsedData.byteMap = generateFullByteMap(parsedData);
    // --- END CHANGE ---

    return parsedData;
}

export async function handleFetchAndParseSegment(
    { uniqueId, streamId, formatHint, auth, decryption },
    signal
) {
    const [url, , range] = uniqueId.split('@');

    const response = await fetchWithAuth(url, auth, range, {}, null, signal);
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status} fetching segment`);
    }
    const data = await response.arrayBuffer();

    let finalData = data;
    if (decryption) {
        const { key, iv } = decryption;
        const cryptoKey = await self.crypto.subtle.importKey(
            'raw',
            key,
            { name: 'AES-CBC' },
            false,
            ['decrypt']
        );
        finalData = await self.crypto.subtle.decrypt(
            { name: 'AES-CBC', iv: iv },
            cryptoKey,
            data
        );
    }

    const parsedData = await handleParseSegmentStructure({
        data: finalData,
        formatHint,
        url,
    });
    return { data: finalData, parsedData };
}

export async function handleDecryptAndParseSegment(
    { url, key, iv, formatHint },
    signal
) {
    const { contentType } = inferMediaInfoFromExtension(url);
    const response = await fetchWithAuth(url, null, null, {}, null, signal);
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status} fetching segment`);
    }
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
    });
    return { parsedData, decryptedData };
}

export async function handleFetchKey({ uri, auth }, signal) {
    if (uri.startsWith('data:')) {
        const base64Data = uri.split(',')[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    const response = await fetchWithAuth(uri, auth, null, {}, null, signal);
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status} fetching key`);
    }
    return response.arrayBuffer();
}
