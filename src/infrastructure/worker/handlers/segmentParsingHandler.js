import { parseISOBMFF } from '@/infrastructure/parsing/isobmff/parser';
import { parse as parseTsSegment } from '@/infrastructure/parsing/ts/index';
import { parseVTT } from '@/infrastructure/parsing/vtt/parser';

// Map of simple names to the RGB values from Tailwind's 900-level colors
const TAILWIND_COLORS_RGB = {
    red: '127, 29, 29',
    yellow: '113, 63, 18',
    green: '20, 83, 45',
    blue: '30, 58, 138',
    indigo: '49, 46, 129',
    purple: '86, 33, 133',
    pink: '131, 24, 67',
    teal: '19, 78, 74',
    slate: '30, 41, 59',
};

const boxColors = [
    { name: 'red', border: 'border-red-700' },
    { name: 'yellow', border: 'border-yellow-700' },
    { name: 'green', border: 'border-green-700' },
    { name: 'blue', border: 'border-blue-700' },
    { name: 'indigo', border: 'border-indigo-700' },
    { name: 'purple', border: 'border-purple-700' },
    { name: 'pink', border: 'border-pink-700' },
    { name: 'teal', border: 'border-teal-700' },
];
const chunkColor = { name: 'slate', border: 'border-slate-600' };

function assignBoxColors(boxes) {
    const colorState = { index: 0 };
    const traverse = (boxList, state) => {
        for (const box of boxList) {
            if (box.isChunk) {
                box.color = chunkColor;
                if (box.children?.length > 0) traverse(box.children, state);
            } else {
                box.color = boxColors[state.index % boxColors.length];
                state.index++;
                if (box.children?.length > 0) traverse(box.children, state);
            }
        }
    };
    if (boxes) traverse(boxes, colorState);
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
    const dataView = new DataView(data);
    const decoder = new TextDecoder();

    // 1. Prioritize the explicit format hint from the UI.
    if (
        formatHint === 'isobmff' ||
        formatHint === 'ts' ||
        formatHint === 'vtt'
    ) {
        if (formatHint === 'isobmff') {
            return parseISOBMFF(data);
        }
        if (formatHint === 'ts') {
            return parseTsSegment(data);
        }
        if (formatHint === 'vtt') {
            return { format: 'vtt', data: parseVTT(decoder.decode(data)) };
        }
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
                return parseISOBMFF(data);
            }
            if (
                path.endsWith('.ts') ||
                path.endsWith('.aac') ||
                path.endsWith('.ac3')
            ) {
                return parseTsSegment(data);
            }
            if (path.endsWith('.vtt')) {
                return {
                    format: 'vtt',
                    data: parseVTT(decoder.decode(data)),
                };
            }
        } catch (e) {
            // Can fail if URL is not absolute, proceed to sniffing.
        }
    }

    // 3. Fallback to byte-sniffing if hint/extension are inconclusive.
    // ISOBMFF sniffing: check for a valid box signature at the start.
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

    // VTT sniffing
    try {
        if (decoder.decode(data.slice(0, 10)).startsWith('WEBVTT'))
            return { format: 'vtt', data: parseVTT(decoder.decode(data)) };
        // eslint-disable-next-line no-empty
    } catch {}

    // TS sniffing
    if (
        data.byteLength > 188 &&
        dataView.getUint8(0) === 0x47 &&
        dataView.getUint8(188) === 0x47
    ) {
        return parseTsSegment(data);
    }

    // 4. Default fallback is ISOBMFF.
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
                    color: { bg: 'bg-gray-700/20' },
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
    }
    return parsedData;
}

function walkAndMapBytes(byteMap, boxes, colorMap, page, bytesPerPage) {
    const startOffset = (page - 1) * bytesPerPage;
    const endOffset = startOffset + bytesPerPage;
    const opacities = [1.0, 0.35, 0.7, 0.45, 0.85, 0.25, 0.75];

    for (const box of boxes) {
        if (box.offset + box.size < startOffset || box.offset > endOffset) {
            continue;
        }

        const boxColor = box.color || colorMap.get(box.type);
        const rgb = boxColor ? TAILWIND_COLORS_RGB[boxColor.name] : null;

        for (let i = box.offset; i < box.offset + box.size; i++) {
            if (i >= startOffset && i < endOffset) {
                const color = rgb
                    ? { style: `background-color: rgba(${rgb}, 0.5)` }
                    : {};
                byteMap.set(i, { box, color, fieldName: 'Box Data' });
            }
        }
        for (let i = box.offset; i < box.offset + box.headerSize; i++) {
            if (i >= startOffset && i < endOffset) {
                const color = rgb
                    ? { style: `background-color: rgba(${rgb}, 0.8)` }
                    : {};
                byteMap.set(i, { box, color, fieldName: 'Box Header' });
            }
        }

        let fieldIndex = 0;
        for (const [key, field] of Object.entries(box.details)) {
            const opacity = opacities[fieldIndex % opacities.length];
            const fieldColor = rgb
                ? { style: `background-color: rgba(${rgb}, ${opacity})` }
                : {};

            for (let i = field.offset; i < field.offset + field.length; i++) {
                if (i >= startOffset && i < endOffset) {
                    byteMap.set(i, { box, color: fieldColor, fieldName: key });
                }
            }
            fieldIndex++;
        }

        if (box.children && box.children.length > 0) {
            walkAndMapBytes(
                byteMap,
                box.children,
                colorMap,
                page,
                bytesPerPage
            );
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
        const colorMap = new Map();
        parsedData.data.boxes.forEach((box) => {
            if (box.color) colorMap.set(box.type, box.color);
        });
        walkAndMapBytes(
            byteMap,
            parsedData.data.boxes,
            colorMap,
            page,
            bytesPerPage
        );
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
                            style: 'background-color: rgba(100, 116, 139, 0.2)',
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
        // Simplified mapping for TS packets
        parsedData.data.packets.forEach((packet) => {
            if (
                packet.offset + 188 < startOffset ||
                packet.offset > endOffset
            ) {
                return;
            }
            for (let i = packet.offset; i < packet.offset + 188; i++) {
                if (i >= startOffset && i < endOffset) {
                    byteMap.set(i, { packet, fieldName: 'Packet Data' });
                }
            }
            // more specific field mapping can be added here if needed
        });
    }

    return Array.from(byteMap.entries());
}
