/**
 * @typedef {object} HexRow
 * @property {string} offset - The 8-digit hex offset for the start of the row.
 * @property {string} hex - The space-separated hex representation of the bytes.
 * @property {string} ascii - The ASCII representation of the bytes.
 */

function buildByteMapTs(parsedData) {
    const byteMap = new Map();
    const colors = {
        header: { bg: 'bg-blue-900/60' },
        af: { bg: 'bg-yellow-800/60' },
        pcr: { bg: 'bg-yellow-500/60' },
        pes: { bg: 'bg-purple-800/60' },
        pts: { bg: 'bg-purple-500/60' },
        dts: { bg: 'bg-purple-400/60' },
        psi: { bg: 'bg-green-800/60' },
        payload: { bg: 'bg-gray-800/50' },
        stuffing: { bg: 'bg-gray-700/50' },
        pointer: { bg: 'bg-cyan-800/60' },
        null: { bg: 'bg-gray-900/80' },
    };

    if (!parsedData || !parsedData.data || !parsedData.data.packets) return byteMap;

    parsedData.data.packets.forEach(packet => {
        // Map TS Header
        for (let i = 0; i < 4; i++) {
            byteMap.set(packet.offset + i, { packet, field: 'TS Header', color: colors.header });
        }
        
        // Map Adaptation Field
        if (packet.adaptationField) {
            const af = packet.adaptationField;
            const afOffset = packet.fieldOffsets.adaptationField.offset;
            for (let i = 0; i < af.length.value + 1; i++) {
                 byteMap.set(afOffset + i, { packet, field: 'Adaptation Field', color: colors.af });
            }
            if (af.pcr) {
                for (let i = 0; i < af.pcr.length; i++) {
                    byteMap.set(af.pcr.offset + i, { packet, field: 'PCR', color: colors.pcr });
                }
            }
            if (af.stuffing_bytes) {
                 for (let i = 0; i < af.stuffing_bytes.length; i++) {
                    byteMap.set(af.stuffing_bytes.offset + i, { packet, field: 'Stuffing', color: colors.stuffing });
                }
            }
        }

        // Map Pointer Field
        if (packet.fieldOffsets.pointerField) {
            const { offset, length } = packet.fieldOffsets.pointerField;
            for (let i = 0; i < length; i++) {
                byteMap.set(offset + i, { packet, field: 'Pointer Field & Stuffing', color: colors.pointer });
            }
        }

        // Map Payload
        if (packet.pid === 0x1FFF) { // Null packet
             for (let i = 4; i < 188; i++) byteMap.set(packet.offset + i, { packet, field: 'Null Packet Payload', color: colors.null });
        } else if (packet.psi) {
            const sectionOffset = packet.psi.header.section_syntax_indicator === 1 ? packet.offset + packet.fieldOffsets.pointerField.length + 8 : packet.offset + packet.fieldOffsets.pointerField.length + 3;
            for (let i = 0; i < packet.psi.header.section_length + 3; i++) {
                byteMap.set(sectionOffset - 8 + i, { packet, field: `PSI (${packet.psi.type})`, color: colors.psi });
            }
        } else if (packet.pes) {
            const pesOffset = packet.fieldOffsets.pesHeader.offset;
            for (let i = 0; i < packet.fieldOffsets.pesHeader.length; i++) {
                byteMap.set(pesOffset + i, { packet, field: 'PES Header', color: colors.pes });
            }
            if (packet.pes.pts) {
                 for (let i = 0; i < packet.pes.pts.length; i++) {
                    byteMap.set(packet.pes.pts.offset + i, { packet, field: 'PTS', color: colors.pts });
                }
            }
            if (packet.pes.dts) {
                 for (let i = 0; i < packet.pes.dts.length; i++) {
                    byteMap.set(packet.pes.dts.offset + i, { packet, field: 'DTS', color: colors.dts });
                }
            }
            const payloadStart = pesOffset + packet.fieldOffsets.pesHeader.length;
            for (let i = payloadStart; i < packet.offset + 188; i++) {
                byteMap.set(i, { packet, field: 'PES Payload', color: colors.payload });
            }
        }
    });

    return byteMap;
}

/**
 * Creates a lookup map for byte offsets to their box/field metadata.
 * @param {object} parsedData - Array of parsed box data or TS packet data
 * @returns {Map<number, {box: object, field: string, color: object}>}
 */
function buildByteMap(parsedData) {
    if (parsedData?.format === 'ts') {
        return buildByteMapTs(parsedData);
    }
    
    // --- ISOBMFF Logic ---
    const byteMap = new Map();
    const boxColors = [
        { bg: 'bg-red-500/20', border: 'border-red-500' }, { bg: 'bg-yellow-500/20', border: 'border-yellow-500' },
        { bg: 'bg-green-500/20', border: 'border-green-500' }, { bg: 'bg-blue-500/20', border: 'border-blue-500' },
        { bg: 'bg-indigo-500/20', border: 'border-indigo-500' }, { bg: 'bg-purple-500/20', border: 'border-purple-500' },
        { bg: 'bg-pink-500/20', border: 'border-pink-500' }, { bg: 'bg-teal-500/20', border: 'border-teal-500' },
    ];
    const reservedColor = { bg: 'bg-gray-700/50' };
    let colorIndex = 0;

    const traverse = (boxes) => {
        if (!boxes) return;
        for (const box of boxes) {
            const color = boxColors[colorIndex % boxColors.length];
            box.color = color;
            for (let i = box.offset; i < box.offset + box.size; i++) {
                byteMap.set(i, { box, field: 'Box Content', color });
            }
            if (box.details) {
                for (const [fieldName, fieldMeta] of Object.entries(box.details)) {
                    if (fieldMeta.offset !== undefined && fieldMeta.length !== undefined) {
                        const fieldColor = fieldName.includes('reserved') || fieldName.includes('Padding') ? reservedColor : color;
                        for (let i = fieldMeta.offset; i < fieldMeta.offset + fieldMeta.length; i++) {
                            byteMap.set(i, { box, field: fieldName, color: fieldColor });
                        }
                    }
                }
            }
            if (box.children?.length > 0) traverse(box.children);
            colorIndex++;
        }
    };
    if (Array.isArray(parsedData)) traverse(parsedData);
    return byteMap;
}


/**
 * Generates a view model for a hex/ASCII view.
 * @param {ArrayBuffer} buffer The segment data.
 * @param {object[] | null} parsedData The parsed box structure data.
 * @param {number} startOffset The starting byte offset for this view.
 * @param {number} maxBytes Maximum number of bytes to process.
 * @returns {HexRow[]} An array of row objects for rendering.
 */
export function generateHexAsciiView(
    buffer,
    parsedData = null,
    startOffset = 0,
    maxBytes = null
) {
    if (!buffer) return [];

    const rows = [];
    const view = new Uint8Array(buffer);
    const bytesPerRow = 16;
    const endByte = maxBytes
        ? Math.min(startOffset + maxBytes, view.length)
        : view.length;

    if (!parsedData) {
        // Fallback for raw view if needed
        for (let i = startOffset; i < endByte; i += bytesPerRow) {
             const rowEndByte = Math.min(i + bytesPerRow, endByte);
            const rowBytes = view.slice(i, rowEndByte);
            const offset = i.toString(16).padStart(8, '0').toUpperCase();
            let hexHtml = '';
            let asciiHtml = '';

            rowBytes.forEach(byte => {
                hexHtml += `<span class="inline-block w-7 text-center">${byte.toString(16).padStart(2, '0').toUpperCase()}</span>`;
                asciiHtml += `<span class="inline-block w-4 text-center">${byte >= 32 && byte <= 126 ? String.fromCharCode(byte).replace('<', '&lt;') : '.'}</span>`;
            });
            rows.push({ offset, hex: hexHtml, ascii: asciiHtml });
        }
        return rows;
    }

    const byteMap = buildByteMap(parsedData);
    for (let i = startOffset; i < endByte; i += bytesPerRow) {
        const rowEndByte = Math.min(i + bytesPerRow, endByte);
        const rowBytes = view.slice(i, rowEndByte);
        const offset = i.toString(16).padStart(8, '0').toUpperCase();

        let hexHtml = '';
        let asciiHtml = '';

        const baseHexClass = 'inline-block h-6 leading-6 w-7 text-center align-middle transition-colors duration-150';
        const baseAsciiClass = 'inline-block h-6 leading-6 w-4 text-center align-middle transition-colors duration-150 tracking-tight';
        
        let currentFieldGroup = [];
        let currentAsciiGroup = [];
        let lastMapEntry = null;

        const flushGroup = () => {
            if (currentFieldGroup.length === 0) return;
            const entry = lastMapEntry || { box: {}, packet: {}, field: 'Unmapped', color: {} };
            const { box, packet, field, color } = entry;
            const dataAttrs = `data-packet-offset="${packet?.offset}" data-box-offset="${box?.offset}" data-field-name="${field}"`;
            const groupClass = `${color ? color.bg : ''}`;
            hexHtml += `<span class="inline-block ${groupClass}" ${dataAttrs}>${currentFieldGroup.join('')}</span>`;
            asciiHtml += `<span class="inline-block ${groupClass}" ${dataAttrs}>${currentAsciiGroup.join('')}</span>`;
            currentFieldGroup = [];
            currentAsciiGroup = [];
        };

        rowBytes.forEach((byte, index) => {
            const byteOffset = i + index;
            const mapEntry = byteMap.get(byteOffset);

            if (lastMapEntry && (mapEntry?.packet !== lastMapEntry.packet || mapEntry?.box !== lastMapEntry.box || mapEntry?.field !== lastMapEntry.field)) {
                flushGroup();
            }

            const dataAttrs = `data-byte-offset="${byteOffset}"`;
            const hexByte = byte.toString(16).padStart(2, '0').toUpperCase();
            currentFieldGroup.push(`<span class="${baseHexClass}" ${dataAttrs}>${hexByte}</span>`);
            const asciiChar = byte >= 32 && byte <= 126 ? String.fromCharCode(byte).replace('<', '&lt;') : '.';
            currentAsciiGroup.push(`<span class="${baseAsciiClass}" ${dataAttrs}>${asciiChar}</span>`);
            lastMapEntry = mapEntry;
        });
        flushGroup();

        rows.push({ offset, hex: hexHtml, ascii: asciiHtml });
    }

    return rows;
}