import { parseISOBMFF } from '@/infrastructure/parsing/isobmff/parser';
import { parse as parseTsSegment } from '@/infrastructure/parsing/ts/index';
import { parseVTT } from '@/infrastructure/parsing/vtt/parser';

const boxColors = [
    { bg: 'bg-red-800', border: 'border-red-700' },
    { bg: 'bg-yellow-800', border: 'border-yellow-700' },
    { bg: 'bg-green-800', border: 'border-green-700' },
    { bg: 'bg-blue-800', border: 'border-blue-700' },
    { bg: 'bg-indigo-800', border: 'border-indigo-700' },
    { bg: 'bg-purple-800', border: 'border-purple-700' },
    { bg: 'bg-pink-800', border: 'border-pink-700' },
    { bg: 'bg-teal-800', border: 'border-teal-700' },
];
const chunkColor = { bg: 'bg-slate-700', border: 'border-slate-600' };

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

function getFieldShade(baseColor, _fieldName, fieldIndex) {
    if (!baseColor || !baseColor.bg)
        return { bg: 'bg-gray-700', style: '--tw-bg-opacity: 0.5' };
    const opacities = [0.1, 0.2, 0.3, 0.4];
    const opacity = opacities[fieldIndex % opacities.length];
    const baseClass = baseColor.bg.replace(/\/\d+/, '');
    return { bg: baseClass, style: `--tw-bg-opacity: ${opacity}` };
}

function groupboxesIntoChunks(boxes) {
    const grouped = [];
    let i = 0;
    while (i < boxes.length) {
        const box = boxes[i];
        if (box.type === 'moof' && boxes[i + 1]?.type === 'mdat') {
            const mdat = boxes[i + 1];
            grouped.push({
                isChunk: true,
                type: 'CMAF Chunk',
                offset: box.offset,
                size: box.size + mdat.size,
                children: [box, mdat],
                details: {
                    info: {
                        value: 'A logical grouping of a moof and mdat box, representing a single CMAF chunk.',
                        offset: box.offset,
                        length: 0,
                    },
                    size: {
                        value: `${box.size + mdat.size} bytes`,
                        offset: box.offset,
                        length: 0,
                    },
                },
                issues: [],
            });
            i += 2;
        } else {
            grouped.push(box);
            i += 1;
        }
    }
    return grouped;
}

function buildCanonicalSampleList(parsedData) {
    const samples = [];
    // The groupedBoxes structure is temporary and local to this function.
    const groupedBoxes = groupboxesIntoChunks(parsedData.data.boxes);
    let sampleIndex = 0;

    // Iterate through the logical top-level containers (chunks or standalone moofs)
    groupedBoxes.forEach((container) => {
        let moofBox;
        if (container.isChunk) {
            moofBox = container.children.find((c) => c.type === 'moof');
        } else if (container.type === 'moof') {
            moofBox = container;
        }

        if (!moofBox) {
            return; // Not a container with samples, skip.
        }

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

            // The `container` (moof or chunk) is the reference for baseDataOffset if it's not in tfhd.
            const baseDataOffset =
                tfhd.details.base_data_offset?.value || container.offset || 0;
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

function buildByteMapIsobmff(parsedData) {
    const byteMap = new Map();
    // Group boxes for logical view, but do not mutate the original parsedData object.
    const groupedBoxes = groupboxesIntoChunks(parsedData.data.boxes);
    assignBoxColors(groupedBoxes);

    // Pass 1: Map all boxes, their headers, and their fields, but EXCLUDE mdat content.
    const traverseBoxes = (box) => {
        const headerColor = { bg: box.color.bg, style: '--tw-bg-opacity: 0.6' };
        for (let i = 0; i < box.headerSize; i++) {
            byteMap.set(box.offset + i, {
                box,
                fieldName: 'Box Header',
                color: headerColor,
            });
        }
        if (box.type !== 'mdat') {
            const contentColor = getFieldShade(box.color, 'Box Content', 0);
            for (
                let i = box.offset + box.headerSize;
                i < box.offset + box.size;
                i++
            ) {
                byteMap.set(i, {
                    box,
                    fieldName: 'Box Content',
                    color: contentColor,
                });
            }
        }
        if (box.details) {
            let fieldIndex = 2;
            for (const [fieldName, fieldMeta] of Object.entries(box.details)) {
                if (
                    fieldMeta.offset !== undefined &&
                    fieldMeta.length !== undefined &&
                    fieldMeta.length > 0
                ) {
                    const fieldColor = getFieldShade(
                        box.color,
                        fieldName,
                        fieldIndex++
                    );
                    const len = Math.ceil(fieldMeta.length);
                    for (
                        let i = fieldMeta.offset;
                        i < fieldMeta.offset + len;
                        i++
                    ) {
                        byteMap.set(i, { box, fieldName, color: fieldColor });
                    }
                }
            }
        }
        if (box.children) box.children.forEach(traverseBoxes);
    };
    groupedBoxes.forEach(traverseBoxes);

    // Pass 2: Use the pre-existing samples list from the initial parse.
    const samples = parsedData.samples || [];

    samples.forEach((sample) => {
        for (let i = 0; i < sample.size; i++) {
            byteMap.set(sample.offset + i, { sample });
        }
        // Pass 3: Layer sub-sample (encryption) info on top
        if (sample.encryption?.subsamples) {
            let currentSubsampleOffset = sample.offset;
            sample.encryption.subsamples.forEach((sub) => {
                for (let i = 0; i < sub.BytesOfClearData; i++) {
                    const mapEntry = byteMap.get(currentSubsampleOffset + i);
                    if (mapEntry) mapEntry.isClear = true;
                }
                currentSubsampleOffset +=
                    sub.BytesOfClearData + sub.BytesOfProtectedData;
            });
        }
    });

    return byteMap;
}

function buildByteMapTs(parsedData) {
    const byteMap = new Map();
    const colors = {
        header: { bg: 'bg-blue-900/30' },
        af: { bg: 'bg-yellow-900/30' },
        pcr: { bg: 'bg-yellow-700/30' },
        pes: { bg: 'bg-purple-900/30' },
        pts: { bg: 'bg-purple-700/30' },
        dts: { bg: 'bg-purple-600/30' },
        psi: { bg: 'bg-green-900/30' },
        payload: { bg: 'bg-gray-800/20' },
        stuffing: { bg: 'bg-gray-700/20' },
        pointer: { bg: 'bg-cyan-900/30' },
        null: { bg: 'bg-gray-900/40' },
    };
    if (!parsedData?.data?.packets) return byteMap;
    parsedData.data.packets.forEach((packet) => {
        for (let i = 0; i < 4; i++)
            byteMap.set(packet.offset + i, {
                packet,
                fieldName: 'TS Header',
                color: colors.header,
            });
        let payloadStart = packet.offset + 4;
        if (packet.adaptationField) {
            const af = packet.adaptationField;
            const afOffset = packet.fieldOffsets.adaptationField.offset;
            const afLength = af.length.value + 1;
            payloadStart = afOffset + afLength;
            for (let i = 0; i < afLength; i++)
                byteMap.set(afOffset + i, {
                    packet,
                    fieldName: 'Adaptation Field',
                    color: colors.af,
                });
            if (af.pcr)
                for (let i = 0; i < af.pcr.length; i++)
                    byteMap.set(af.pcr.offset + i, {
                        packet,
                        fieldName: 'PCR',
                        color: colors.pcr,
                    });
            if (af.stuffing_bytes)
                for (let i = 0; i < af.stuffing_bytes.length; i++)
                    byteMap.set(af.stuffing_bytes.offset + i, {
                        packet,
                        fieldName: 'Stuffing',
                        color: colors.stuffing,
                    });
        }
        if (packet.fieldOffsets.pointerField) {
            const { offset, length } = packet.fieldOffsets.pointerField;
            for (let i = 0; i < length; i++)
                byteMap.set(offset + i, {
                    packet,
                    fieldName: 'Pointer Field & Stuffing',
                    color: colors.pointer,
                });
            payloadStart = offset + length;
        }
        for (let i = payloadStart; i < packet.offset + 188; i++) {
            if (byteMap.has(i)) continue;
            let fieldName = 'Payload',
                color = colors.payload;
            if (packet.pid === 0x1fff)
                (fieldName = 'Null Packet Payload'), (color = colors.null);
            else if (packet.psi)
                (fieldName = `PSI (${packet.psi.type})`), (color = colors.psi);
            else if (packet.pes)
                (fieldName = 'PES Payload'), (color = colors.payload);
            byteMap.set(i, { packet, fieldName, color });
        }
        if (packet.pes && packet.fieldOffsets.pesHeader) {
            const { offset, length } = packet.fieldOffsets.pesHeader;
            for (let i = 0; i < length; i++)
                byteMap.set(offset + i, {
                    packet,
                    fieldName: 'PES Header',
                    color: colors.pes,
                });
            if (packet.pes.pts)
                for (let i = 0; i < packet.pes.pts.length; i++)
                    byteMap.set(packet.pes.pts.offset + i, {
                        packet,
                        fieldName: 'PTS',
                        color: colors.pts,
                    });
            if (packet.pes.dts)
                for (let i = 0; i < packet.pes.dts.length; i++)
                    byteMap.set(packet.pes.dts.offset + i, {
                        packet,
                        fieldName: 'DTS',
                        color: colors.dts,
                    });
        }
    });
    return byteMap;
}

export async function handleParseSegmentStructure({ url, data, formatHint }) {
    const dataView = new DataView(data);
    const decoder = new TextDecoder();

    // 1. Prioritize the explicit format hint from the UI.
    if (formatHint === 'isobmff') {
        const parsed = parseISOBMFF(data);
        const result = { format: 'isobmff', data: parsed };
        if (result.data.boxes) {
            const samples = buildCanonicalSampleList(result);
            decorateSamples(samples, result);
            result.samples = samples;
        }
        return result;
    }
    if (formatHint === 'ts') {
        return parseTsSegment(data);
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
                path.endsWith('.cmfm')
            ) {
                const parsed = parseISOBMFF(data);
                const result = { format: 'isobmff', data: parsed };
                if (result.data.boxes) {
                    const samples = buildCanonicalSampleList(result);
                    decorateSamples(samples, result);
                    result.samples = samples;
                }
                return result;
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
            const parsed = parseISOBMFF(data);
            const result = { format: 'isobmff', data: parsed };
            if (result.data.boxes) {
                const samples = buildCanonicalSampleList(result);
                decorateSamples(samples, result);
                result.samples = samples;
            }
            return result;
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
    const parsed = parseISOBMFF(data);
    const result = { format: 'isobmff', data: parsed };
    if (result.data.boxes) {
        const samples = buildCanonicalSampleList(result);
        decorateSamples(samples, result);
        result.samples = samples;
    }
    return result;
}

export async function handleGeneratePagedByteMap({
    parsedData,
    page,
    bytesPerPage,
}) {
    const start = (page - 1) * bytesPerPage;
    const end = start + bytesPerPage;

    let fullMap;
    if (parsedData.format === 'isobmff') {
        fullMap = buildByteMapIsobmff(parsedData);
    } else if (parsedData.format === 'ts') {
        fullMap = buildByteMapTs(parsedData);
    } else {
        return [];
    }

    const pagedMap = new Map();
    for (let i = start; i < end; i++) {
        if (fullMap.has(i)) pagedMap.set(i, fullMap.get(i));
    }
    return Array.from(pagedMap.entries());
}