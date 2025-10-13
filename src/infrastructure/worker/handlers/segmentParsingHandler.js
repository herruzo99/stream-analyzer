import { parseISOBMFF } from '@/infrastructure/parsing/isobmff/parser';
import { parse as parseTsSegment } from '@/infrastructure/parsing/ts/index';
import { parseVTT } from '@/infrastructure/parsing/vtt/parser';
import { debugLog } from '@/application/utils/debug';

// Map of simple names to the base Tailwind color class
const TAILWIND_COLORS = {
    red: 'bg-red-900',
    yellow: 'bg-yellow-900',
    green: 'bg-green-900',
    blue: 'bg-blue-900',
    indigo: 'bg-indigo-900',
    purple: 'bg-purple-900',
    pink: 'bg-pink-900',
    teal: 'bg-teal-900',
    slate: 'bg-slate-700', // Adjusted for default
};

// --- ARCHITECTURAL REFACTOR: Deterministic Color Mapping ---
// Assigns a specific, consistent color to each important box type.
const BOX_TYPE_COLOR_MAP = {
    // File/Segment Type
    ftyp: { name: 'red', border: 'border-red-700' },
    styp: { name: 'red', border: 'border-red-700' },

    // Core Metadata Containers
    moov: { name: 'blue', border: 'border-blue-700' },
    trak: { name: 'indigo', border: 'border-indigo-700' },

    // Fragment Metadata Containers
    moof: { name: 'green', border: 'border-green-700' },
    traf: { name: 'purple', border: 'border-purple-700' },

    // Indexing and Timing
    sidx: { name: 'yellow', border: 'border-yellow-700' },
    tfdt: { name: 'pink', border: 'border-pink-700' },
    trun: { name: 'teal', border: 'border-teal-700' },
    tfhd: { name: 'purple', border: 'border-purple-600' },
    mfhd: { name: 'green', border: 'border-green-600' },

    // Media Data
    mdat: { name: 'slate', border: 'border-slate-600' },

    // Default for unknown/other boxes
    default: { name: 'slate', border: 'border-slate-700' },
};

const TS_PAYLOAD_TYPE_COLOR_MAP = {
    // PSI
    'PSI (PAT)': { name: 'blue', border: 'border-blue-700' },
    'PSI (PMT)': { name: 'indigo', border: 'border-indigo-700' },
    'PSI (CAT)': { name: 'purple', border: 'border-purple-700' },
    'PSI (TSDT)': { name: 'purple', border: 'border-purple-600' },
    'PSI (Private Section)': { name: 'slate', border: 'border-slate-600' },

    // PES
    PES: { name: 'green', border: 'border-green-700' },
    'PES (DSM-CC)': { name: 'pink', border: 'border-pink-700' },

    // Data (use stream_type)
    '0x02': { name: 'teal', border: 'border-teal-700' }, // MPEG-2 Video
    '0x1b': { name: 'teal', border: 'border-teal-600' }, // H.264
    '0x24': { name: 'teal', border: 'border-teal-500' }, // H.265
    '0x04': { name: 'yellow', border: 'border-yellow-700' }, // MPEG-2 Audio
    '0x0f': { name: 'yellow', border: 'border-yellow-600' }, // AAC
    '0x11': { name: 'yellow', border: 'border-yellow-500' }, // MP4 Audio (latm)

    // Other
    'Null Packet': { name: 'slate', border: 'border-transparent' },
    Data: { name: 'slate', border: 'border-slate-700' },
    default: { name: 'slate', border: 'border-slate-700' },
};

// --- END REFACTOR ---

function assignBoxColors(boxes) {
    const traverse = (boxList) => {
        for (const box of boxList) {
            if (box.isChunk) {
                box.color = BOX_TYPE_COLOR_MAP.default; // Chunks are neutral containers
            } else {
                box.color =
                    BOX_TYPE_COLOR_MAP[box.type] || BOX_TYPE_COLOR_MAP.default;
            }
            if (box.children?.length > 0) {
                traverse(box.children);
            }
        }
    };
    if (boxes) traverse(boxes);
}

function assignPacketColors(packets) {
    if (!packets) return;
    for (const packet of packets) {
        // payloadType can be a stream_type like '0x02' or a descriptive string.
        packet.color =
            TS_PAYLOAD_TYPE_COLOR_MAP[packet.payloadType] ||
            TS_PAYLOAD_TYPE_COLOR_MAP['default'];
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

    // 2. Check file extension from URL if no hint is provided.
    if (url) {
        try {
            const path = new URL(url).pathname.toLowerCase();
            if (
                path.endsWith('.m4s') ||
                path.endsWith('.mp4') ||
                path.endsWith('.cmfv') ||
                path.endsWith('.cmfa') ||
                path.endsWith('.cmfm') ||
                path.endsWith('.m4a') ||
                path.endsWith('.m4v')
            ) {
                debugLog('parseSegment', 'Detected ISOBMFF via file extension.');
                return parseISOBMFF(data);
            }
            if (
                path.endsWith('.ts') ||
                path.endsWith('.aac') ||
                path.endsWith('.ac3')
            ) {
                debugLog('parseSegment', 'Detected TS via file extension.');
                return parseTsSegment(data);
            }
            if (path.endsWith('.vtt')) {
                debugLog('parseSegment', 'Detected VTT via file extension.');
                return { format: 'vtt', data: parseVTT(decoder.decode(data)) };
            }
        } catch (e) {
            debugLog(
                'parseSegment',
                'Could not parse URL for extension check, proceeding to byte-sniffing.'
            );
        }
    }

    // 3. Fallback to byte-sniffing if hint/extension are inconclusive.
    debugLog(
        'parseSegment',
        'No hint or definitive extension. Falling back to byte-sniffing.'
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

    // 4. Default fallback is ISOBMFF, as it's more likely for extension-less segments in HLS fMP4.
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
    } else if (parsedData.format === 'ts' && parsedData.data.packets) {
        assignPacketColors(parsedData.data.packets);
    }
    return parsedData;
}

function walkAndMapBytes(byteMap, boxes, page, bytesPerPage) {
    const startOffset = (page - 1) * bytesPerPage;
    const endOffset = startOffset + bytesPerPage;
    const opacities = ['/90', '/30', '/70', '/40', '/80', '/20', '/60'];

    for (const box of boxes) {
        if (box.offset + box.size < startOffset || box.offset > endOffset) {
            continue;
        }

        const baseClass = box.color ? TAILWIND_COLORS[box.color.name] : null;

        for (let i = box.offset; i < box.offset + box.size; i++) {
            if (i >= startOffset && i < endOffset) {
                const color = baseClass ? { bgClass: `${baseClass}/50` } : {};
                byteMap.set(i, { box, color, fieldName: 'Box Data' });
            }
        }
        for (let i = box.offset; i < box.offset + box.headerSize; i++) {
            if (i >= startOffset && i < endOffset) {
                const color = baseClass ? { bgClass: `${baseClass}` } : {};
                byteMap.set(i, { box, color, fieldName: 'Box Header' });
            }
        }

        let fieldIndex = 0;
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
        }

        if (box.children && box.children.length > 0) {
            walkAndMapBytes(byteMap, box.children, page, bytesPerPage);
        }
    }
}

function walkAndMapBytesTs(byteMap, packets, page, bytesPerPage) {
    const startOffset = (page - 1) * bytesPerPage;
    const endOffset = startOffset + bytesPerPage;
    const opacities = ['/80', '/60', '/40'];

    for (const packet of packets) {
        if (
            packet.offset + 188 < startOffset ||
            packet.offset > endOffset
        ) {
            continue;
        }

        const baseClass = packet.color ? TAILWIND_COLORS[packet.color.name] : null;

        // Color the whole packet first
        for (let i = packet.offset; i < packet.offset + 188; i++) {
            if (i >= startOffset && i < endOffset) {
                const color = baseClass ? { bgClass: `${baseClass}/20` } : {};
                byteMap.set(i, { packet, color, fieldName: 'Packet Data' });
            }
        }

        // --- Overlay specific fields ---
        const fieldGroups = {
            header: { data: packet.header, intensity: 0 },
            adaptationField: { data: packet.adaptationField, intensity: 1 },
            pesHeader: { data: packet.pes, intensity: 2 },
            psiHeader: { data: packet.psi?.header, intensity: 2 }
        };

        for (const [groupName, group] of Object.entries(fieldGroups)) {
            if (!group.data) continue;
            
            const opacityClass = opacities[group.intensity % opacities.length];
            const fieldColor = baseClass ? { bgClass: `${baseClass}${opacityClass}` } : {};

            for (const [fieldName, field] of Object.entries(group.data)) {
                 if (typeof field === 'object' && field !== null && field.offset !== undefined && field.length !== undefined) {
                    for (let i = field.offset; i < field.offset + Math.ceil(field.length); i++) {
                        if (i >= startOffset && i < endOffset) {
                            byteMap.set(i, { packet, color: fieldColor, fieldName: `${groupName}.${fieldName}` });
                        }
                    }
                }
            }
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
                for (
                    let i = sample.offset;
                    i < sample.offset + sample.size;
                    i++
                ) {
                    if (i >= startOffset && i < endOffset) {
                        const sampleColor = {
                            bgClass: 'bg-gray-700/20',
                        };
                        byteMap.set(i, {
                            sample,
                            color: sampleColor,
                            fieldName: 'Sample Data',
                        });
                    }
                }
            });
        }
    } else if (parsedData.format === 'ts') {
        walkAndMapBytesTs(byteMap, parsedData.data.packets, page, bytesPerPage);
    }

    return Array.from(byteMap.entries());
}