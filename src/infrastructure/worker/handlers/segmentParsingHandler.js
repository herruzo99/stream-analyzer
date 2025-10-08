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

function getFieldShade(baseColor, fieldName, fieldIndex) {
    if (!baseColor || !baseColor.bg)
        return { bg: 'bg-gray-700', style: '--tw-bg-opacity: 0.5' };
    const opacities = [0.1, 0.2, 0.3, 0.4];
    const opacity = opacities[fieldIndex % opacities.length];
    const baseClass = baseColor.bg.replace(/\/\d+/, '');
    return { bg: baseClass, style: `--tw-bg-opacity: ${opacity}` };
}

function buildByteMapIsobmff(boxesOrChunks) {
    const byteMap = new Map();
    const traverse = (box) => {
        if (box.children?.length > 0) {
            for (const child of box.children) traverse(child);
        }
        const contentColor = getFieldShade(box.color, 'Box Content', 0);
        for (
            let i = box.offset + box.headerSize;
            i < box.offset + box.size;
            i++
        ) {
            if (!byteMap.has(i))
                byteMap.set(i, {
                    box,
                    fieldName: 'Box Content',
                    color: contentColor,
                });
        }
        const headerColor = getFieldShade(box.color, 'Box Header', 1);
        for (let i = box.offset; i < box.offset + box.headerSize; i++) {
            byteMap.set(i, {
                box,
                fieldName: 'Box Header',
                color: headerColor,
            });
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
                        byteMap.set(i, {
                            box,
                            fieldName: fieldName,
                            color: fieldColor,
                        });
                    }
                }
            }
        }
    };
    if (boxesOrChunks) {
        for (const item of boxesOrChunks) traverse(item);
    }
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

export async function handleParseSegmentStructure({ url, data }) {
    const decoder = new TextDecoder();
    try {
        if (decoder.decode(data.slice(0, 10)).startsWith('WEBVTT'))
            return { format: 'vtt', data: parseVTT(decoder.decode(data)) };
    } catch {}

    if (
        data.byteLength > 188 &&
        new DataView(data).getUint8(0) === 0x47 &&
        new DataView(data).getUint8(188) === 0x47
    ) {
        return parseTsSegment(data);
    }

    const { boxes, issues, events } = parseISOBMFF(data);
    assignBoxColors(boxes); // Assign colors before returning
    return { format: 'isobmff', data: { boxes, issues, events } };
}

export async function handleGeneratePagedByteMap({
    parsedData,
    page,
    bytesPerPage,
}) {
    const start = (page - 1) * bytesPerPage;
    const end = start + bytesPerPage;

    if (parsedData.format === 'isobmff') {
        // Ensure colors are assigned, in case the cached data didn't have them.
        // This is defensive and ensures robustness.
        if (!parsedData.data.boxes[0]?.color) {
            assignBoxColors(parsedData.data.boxes);
        }
        const fullMap = buildByteMapIsobmff(parsedData.data.boxes);
        const pagedMap = new Map();
        for (let i = start; i < end; i++) {
            if (fullMap.has(i)) pagedMap.set(i, fullMap.get(i));
        }
        return Array.from(pagedMap.entries());
    }

    if (parsedData.format === 'ts') {
        const fullMap = buildByteMapTs(parsedData);
        const pagedMap = new Map();
        for (let i = start; i < end; i++) {
            if (fullMap.has(i)) pagedMap.set(i, fullMap.get(i));
        }
        return Array.from(pagedMap.entries());
    }

    return [];
}