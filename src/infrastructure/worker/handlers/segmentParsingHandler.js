import { parseISOBMFF } from '@/infrastructure/parsing/isobmff/parser';
import { parse as parseTsSegment } from '@/infrastructure/parsing/ts/index';
import { parseVTT } from '@/infrastructure/parsing/vtt/parser';
import { debugLog } from '@/application/utils/debug';
import { boxParsers } from '@/infrastructure/parsing/isobmff/index';
import { fetchWithRetry } from '@/application/utils/fetch';

// --- Programmatic Color Generation ---

// 1. Define the master list of color names to cycle through.
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

// 2. Generate the TAILWIND_COLORS object programmatically with higher-contrast shades.
const generateColorFamilies = (names) => {
    const families = {};
    for (const name of names) {
        families[name] = [
            { bg: `bg-${name}-800`, border: `border-${name}-600` },
            { bg: `bg-${name}-700`, border: `border-${name}-500` },
            { bg: `bg-${name}-600`, border: `border-${name}-400` },
        ];
    }
    // Add neutral colors separately for specific use cases.
    families['slate'] = [
        { bg: 'bg-slate-800', border: 'border-slate-600' },
        { bg: 'bg-slate-700', border: 'border-slate-500' },
        { bg: 'bg-slate-800/70', border: 'border-slate-600/80' },
    ];
    return families;
};

const TAILWIND_COLORS = generateColorFamilies(COLOR_NAMES);

// 3. Generate the BOX_TYPE_COLOR_MAP by cycling through the color names.
const generateBoxColorMap = () => {
    const map = {};
    let colorIndex = 0;
    const knownBoxTypes = Object.keys(boxParsers);

    for (const boxType of knownBoxTypes) {
        map[boxType] = COLOR_NAMES[colorIndex];
        colorIndex = (colorIndex + 1) % COLOR_NAMES.length;
    }

    // 4. Override specific boxes with neutral colors.
    map['mdat'] = 'slate';
    map['free'] = 'slate';
    map['skip'] = 'slate';
    map['default'] = 'slate';

    return map;
};

const BOX_TYPE_COLOR_MAP = generateBoxColorMap();
// --- End Programmatic Color Generation ---

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

/**
 * Assigns a deterministic, context-aware color to each box based on its type and siblings.
 * @param {import('@/infrastructure/parsing/isobmff/parser.js').Box[]} boxes
 */
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
                // If the same color family is used for an adjacent sibling, cycle to the next shade.
                colorIndex = (lastColorIndex + 1) % colorFamily.length;
            } else {
                // If it's a new color family, start with the first shade.
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
                // The traversal for children is a new context; they will start their own color cycle.
                traverse(box.children);
            }
        }
    };

    traverse(boxes);
}

/**
 * Assigns a deterministic, context-aware color to each TS packet based on its payload type.
 * @param {object[]} packets
 */
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

/**
 * The core segment parsing logic, now exported for internal worker use.
 * @param {object} params
 * @param {ArrayBuffer} params.data
 * @param {string} [params.formatHint]
 * @param {string} [params.url]
 * @returns {Promise<object>}
 */
export async function parseSegment({ data, formatHint, url }) {
    debugLog(
        'parseSegment',
        `Parsing segment. URL: ${url}, Format Hint: ${formatHint}`
    );

    const dataView = new DataView(data);
    const decoder = new TextDecoder();

    // 1. Prioritize the explicit format hint from the UI.
    if (formatHint) {
        debugLog('parseSegment', `Using explicit hint: '${formatHint}'`);
        if (formatHint === 'isobmff') return parseISOBMFF(data);
        if (formatHint === 'ts') return parseTsSegment(data);
        if (formatHint === 'vtt')
            return { format: 'vtt', data: parseVTT(decoder.decode(data)) };
    }

    // 2. Check file extension from URL for definitive non-container formats first.
    if (url) {
        try {
            const path = new URL(url).pathname.toLowerCase();
            if (path.endsWith('.vtt')) {
                debugLog('parseSegment', 'Detected VTT via file extension.');
                return { format: 'vtt', data: parseVTT(decoder.decode(data)) };
            }
            if (path.endsWith('.aac')) {
                debugLog('parseSegment', 'Detected AAC via file extension.');
                return {
                    format: 'aac',
                    data: { message: 'Raw AAC Audio Segment' },
                };
            }
        } catch (e) {
            debugLog(
                'parseSegment',
                'Could not parse URL for extension check, proceeding to byte-sniffing.'
            );
        }
    }

    // 3. Fallback to byte-sniffing for container formats (ISOBMFF, TS).
    debugLog(
        'parseSegment',
        'No definitive non-container extension. Falling back to byte-sniffing.'
    );

    // VTT sniffing (most specific)
    try {
        if (decoder.decode(data.slice(0, 10)).startsWith('WEBVTT')) {
            debugLog('parseSegment', 'Detected VTT via byte-sniffing.');
            return { format: 'vtt', data: parseVTT(decoder.decode(data)) };
        }
    } catch {}

    // ISOBMFF sniffing (more reliable than TS, so check first)
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
            debugLog(
                'parseSegment',
                'Detected ISOBMFF via byte-sniffing (box signature).'
            );
            return parseISOBMFF(data);
        }
    }

    // TS sniffing (less specific, checked after ISOBMFF)
    if (
        data.byteLength > 188 &&
        dataView.getUint8(0) === 0x47 &&
        dataView.getUint8(188) === 0x47
    ) {
        debugLog('parseSegment', 'Detected TS via byte-sniffing (sync bytes).');
        return parseTsSegment(data);
    }

    // 4. If all else fails, attempt ISOBMFF parse as a last resort.
    debugLog(
        'parseSegment',
        'All detection methods failed. Falling back to default ISOBMFF parser.'
    );
    return parseISOBMFF(data);
}

// Internal utility functions, now co-located and not exported.
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
        if (sdtp?.details?.[`sample_${i + 1}_sample_depends_on`]) {
            sample.dependsOn =
                sdtp.details[`sample_${i + 1}_sample_depends_on`].value;
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

// Exported handlers for the worker main thread
export async function handleParseSegmentStructure({ url, data, formatHint }) {
    const parsedData = await parseSegment({ data, formatHint, url });

    if (parsedData.format === 'isobmff' && parsedData.data.boxes) {
        assignBoxColors(parsedData.data.boxes);
        const samples = buildCanonicalSampleList(parsedData);
        decorateSamples(samples, parsedData);
        parsedData.samples = samples;

        // --- SCTE-35 Event Transformation ---
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

                        if (timescale === 0) return null; // Avoid division by zero

                        // For DASH, emsg version 1 `presentation_time` is on the MPD timeline.
                        // We do not need to adjust it with tfdt for this purpose.
                        return {
                            startTime: presentationTime / timescale,
                            duration: eventDuration / timescale,
                            message: `SCTE-35 Signal (ID: ${emsgBox.details.id.value})`,
                            type: 'scte35-inband',
                            scte35: emsgBox.scte35,
                            messageData: null, // Raw message data is not needed by the use case
                            cue: null,
                        };
                    }
                    return null;
                })
                .filter(Boolean);

            // Overwrite the raw emsg boxes with canonical event objects
            parsedData.data.events = canonicalEvents;
        }
        // --- End SCTE-35 Transformation ---
    } else if (parsedData.format === 'ts' && parsedData.data.packets) {
        assignTsPacketColors(parsedData.data.packets);
    }
    return parsedData;
}

function walkAndMapBytes(byteMap, boxes, page, bytesPerPage) {
    const startOffset = (page - 1) * bytesPerPage;
    const endOffset = startOffset + bytesPerPage;
    const opacities = ['/80', '/60', '/70', '/50', '/90', '/40'];

    for (const box of boxes) {
        if (box.offset + box.size < startOffset || box.offset > endOffset) {
            continue;
        }

        const baseClass = box.color?.bgClass;

        // Highlight only the header
        for (let i = box.offset; i < box.offset + box.headerSize; i++) {
            if (i >= startOffset && i < endOffset) {
                const color = baseClass ? { bgClass: `${baseClass}` } : {};
                byteMap.set(i, { box, color, fieldName: 'Box Header' });
            }
        }

        // Highlight specific fields
        let fieldIndex = 0;
        let entriesStartOffset = Infinity;
        let entriesEndOffset = 0;

        for (const [key, field] of Object.entries(box.details)) {
            const opacityClass = opacities[fieldIndex % opacities.length];
            const fieldColor = baseClass
                ? { bgClass: `${baseClass}${opacityClass}` }
                : {};

            for (let i = field.offset; i < field.offset + field.length; i++) {
                if (i >= startOffset && i < endOffset) {
                    byteMap.set(i, { box, color: fieldColor, fieldName: key });
                }
            }
            fieldIndex++;
            entriesStartOffset = Math.min(entriesStartOffset, field.offset);
            entriesEndOffset = Math.max(
                entriesEndOffset,
                field.offset + field.length
            );
        }

        // Highlight table entry data blocks
        const hasEntries = box.entries || box.samples;
        if (hasEntries && entriesEndOffset < box.offset + box.size) {
            const tableColor = baseClass ? { bgClass: `${baseClass}/30` } : {};
            for (let i = entriesEndOffset; i < box.offset + box.size; i++) {
                if (i >= startOffset && i < endOffset) {
                    byteMap.set(i, {
                        box,
                        color: tableColor,
                        fieldName: 'Table Entries',
                    });
                }
            }
        }

        if (box.children && box.children.length > 0) {
            walkAndMapBytes(byteMap, box.children, page, bytesPerPage);
        }
    }
}

export async function handleGeneratePagedByteMap({
    parsedData,
    page,
    bytesPerPage,
}) {
    const byteMap = new Map();
    const startOffset = (page - 1) * bytesPerPage;
    const endOffset = startOffset + bytesPerPage;

    if (parsedData.format === 'isobmff') {
        walkAndMapBytes(byteMap, parsedData.data.boxes, page, bytesPerPage);
        if (parsedData.samples) {
            parsedData.samples.forEach((sample) => {
                if (
                    sample.offset + sample.size < startOffset ||
                    sample.offset > endOffset
                ) {
                    return;
                }
                const sampleColor = { bgClass: 'bg-gray-700/20' };
                for (
                    let i = sample.offset;
                    i < sample.offset + sample.size;
                    i++
                ) {
                    if (i >= startOffset && i < endOffset) {
                        // Avoid overwriting more specific field highlights within a sample's range (e.g., senc)
                        if (!byteMap.has(i)) {
                            byteMap.set(i, {
                                sample,
                                color: sampleColor,
                                fieldName: 'Sample Data',
                            });
                        }
                    }
                }
            });
        }
    } else if (parsedData.format === 'ts') {
        parsedData.data.packets.forEach((packet) => {
            if (
                packet.offset + 188 < startOffset ||
                packet.offset > endOffset
            ) {
                return;
            }
            const baseClass = packet.color?.bgClass;
            for (let i = packet.offset; i < packet.offset + 188; i++) {
                if (i >= startOffset && i < endOffset) {
                    const color = baseClass ? { bgClass: baseClass } : {};
                    byteMap.set(i, { packet, color, fieldName: 'Packet Data' });
                }
            }
        });
    }

    return Array.from(byteMap.entries());
}

export async function handleFetchKey({ uri }) {
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

    const response = await fetchWithRetry(uri);
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status} fetching key`);
    }
    return response.arrayBuffer();
}

export async function handleDecryptAndParseSegment({
    url,
    key,
    iv,
    formatHint,
}) {
    const response = await fetchWithRetry(url);
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
