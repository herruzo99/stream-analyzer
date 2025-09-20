/**
 * @typedef {object} HexRow
 * @property {string} offset - The 8-digit hex offset for the start of the row.
 * @property {string} hex - The space-separated hex representation of the bytes.
 * @property {string} ascii - The ASCII representation of the bytes.
 */

/**
 * Creates a lookup map for byte offsets to their box/field metadata.
 * This version is refactored for 100% coverage of all bytes within boxes and to attach color info.
 * @param {import('../segment-analysis/isobmff-parser.js').Box[]} parsedData - Array of parsed box data
 * @returns {Map<number, {box: object, field: string, color: object}>}
 */
function buildByteMap(parsedData) {
    const byteMap = new Map();
    const boxColors = [
        { bg: 'bg-red-500/20', border: 'border-red-500' },
        { bg: 'bg-yellow-500/20', border: 'border-yellow-500' },
        { bg: 'bg-green-500/20', border: 'border-green-500' },
        { bg: 'bg-blue-500/20', border: 'border-blue-500' },
        { bg: 'bg-indigo-500/20', border: 'border-indigo-500' },
        { bg: 'bg-purple-500/20', border: 'border-purple-500' },
        { bg: 'bg-pink-500/20', border: 'border-pink-500' },
        { bg: 'bg-teal-500/20', border: 'border-teal-500' },
        { bg: 'bg-orange-500/20', border: 'border-orange-500' },
        { bg: 'bg-lime-500/20', border: 'border-lime-500' },
        { bg: 'bg-rose-500/20', border: 'border-rose-500' }
    ];
    const reservedColor = { bg: 'bg-gray-700/50' };
    let colorIndex = 0;

    const traverse = (boxes) => {
        if (!boxes) return;

        for (const box of boxes) {
            const color = boxColors[colorIndex % boxColors.length];
            box.color = color; // Attach the color object directly to the box
            const boxStart = box.offset;
            const boxEnd = box.offset + box.size;
            
            for (let i = boxStart; i < boxEnd; i++) {
                byteMap.set(i, { box, field: 'Box Content', color });
            }

            if (box.details) {
                for (const [fieldName, fieldMeta] of Object.entries(box.details)) {
                    if (fieldMeta.offset !== undefined && fieldMeta.length !== undefined) {
                        const fieldColor = (fieldName.includes('reserved') || fieldName.includes('Padding')) ? reservedColor : color;
                        for (let i = fieldMeta.offset; i < fieldMeta.offset + fieldMeta.length; i++) {
                            byteMap.set(i, { box, field: fieldName, color: fieldColor });
                        }
                    }
                }
            }
            
            if (box.children && box.children.length > 0) {
                traverse(box.children);
            }
            
            if (box.children && box.children.length > 0) {
                 let lastChildEnd = box.contentOffset;
                 if (box.children.length > 0) {
                    const lastChild = box.children[box.children.length - 1];
                    lastChildEnd = lastChild.offset + lastChild.size;
                 }
                 
                 if (boxEnd > lastChildEnd) {
                    for (let i = lastChildEnd; i < boxEnd; i++) {
                        byteMap.set(i, { box, field: 'Container Padding', color: reservedColor });
                    }
                 }
            }

            colorIndex++;
        }
    };
    
    if (parsedData && Array.isArray(parsedData)) {
        traverse(parsedData);
    }
    
    const maxOffset = parsedData.reduce((max, box) => Math.max(max, box.offset + box.size), 0);
    for (let i = 0; i < maxOffset; i++) {
        if (!byteMap.has(i)) {
            byteMap.set(i, {
                box: { type: 'UNKNOWN', offset: i, size: 1 },
                field: 'Unmapped Data',
                color: reservedColor
            });
        }
    }

    return byteMap;
}


/**
 * Generates a view model for a hex/ASCII view.
 * @param {ArrayBuffer} buffer The segment data.
 * @param {object[]} parsedData The parsed box structure data.
 * @param {number} startOffset The starting byte offset for this view.
 * @param {number} maxBytes Maximum number of bytes to process.
 * @returns {HexRow[]} An array of row objects for rendering.
 */
export function generateHexAsciiView(buffer, parsedData = null, startOffset = 0, maxBytes = null) {
    if (!buffer) return [];

    const rows = [];
    const view = new Uint8Array(buffer);
    const bytesPerRow = 16;
    const byteMap = parsedData ? buildByteMap(parsedData) : new Map();
    
    const endByte = maxBytes ? Math.min(startOffset + maxBytes, view.length) : view.length;

    for (let i = startOffset; i < endByte; i += bytesPerRow) {
        const rowEndByte = Math.min(i + bytesPerRow, endByte);
        const rowBytes = view.slice(i, rowEndByte);
        const offset = i.toString(16).padStart(8, '0').toUpperCase();

        let hexHtml = '';
        let asciiHtml = '';

        const baseHexClass = 'inline-block h-6 leading-6 w-7 text-center align-middle transition-colors duration-150 cursor-pointer';
        const baseAsciiClass = 'inline-block h-6 leading-6 w-4 text-center align-middle transition-colors duration-150 tracking-tight cursor-pointer';
        const fieldDelimiterClass = 'border-l border-gray-400/50';

        let currentFieldGroup = [];
        let currentAsciiGroup = [];
        let lastMapEntry = null;

        const flushGroup = () => {
            if (currentFieldGroup.length === 0 || !lastMapEntry) return;
            const { box, field, color } = lastMapEntry;
            const dataAttrs = `data-box-offset="${box.offset}" data-field-name="${field}"`;
            const groupClass = `${color ? color.bg : ''}`;
            hexHtml += `<span class="inline-block ${groupClass}" ${dataAttrs}>${currentFieldGroup.join('')}</span>`;
            asciiHtml += `<span class="inline-block ${groupClass}" ${dataAttrs}>${currentAsciiGroup.join('')}</span>`;
            currentFieldGroup = [];
            currentAsciiGroup = [];
        };

        rowBytes.forEach((byte, index) => {
            const byteOffset = i + index;
            const mapEntry = byteMap.get(byteOffset);
            
            if (lastMapEntry && (mapEntry?.box !== lastMapEntry.box || mapEntry?.field !== lastMapEntry.field)) {
                flushGroup();
            }

            let hexCssClass = baseHexClass;
            let asciiCssClass = baseAsciiClass;
            
            if (lastMapEntry && mapEntry?.box === lastMapEntry.box && mapEntry?.field !== lastMapEntry.field) {
                 hexCssClass += ` ${fieldDelimiterClass}`;
                 asciiCssClass += ` ${fieldDelimiterClass}`;
            }

            const dataAttrs = `data-byte-offset="${byteOffset}"`;

            const hexByte = byte.toString(16).padStart(2, '0').toUpperCase();
            currentFieldGroup.push(`<span class="${hexCssClass}" ${dataAttrs}>${hexByte}</span>`);

            const asciiChar = (byte >= 32 && byte <= 126) ? String.fromCharCode(byte).replace('<', '&lt;') : '.';
            currentAsciiGroup.push(`<span class="${asciiCssClass}" ${dataAttrs}>${asciiChar}</span>`);

            lastMapEntry = mapEntry;
        });
        flushGroup();

        const remaining = bytesPerRow - rowBytes.length;
        if (remaining > 0) {
            hexHtml += `<span class="inline-block h-6" style="width: ${remaining * 1.75}rem"></span>`;
            asciiHtml += `<span class="inline-block h-6" style="width: ${remaining * 1}rem"></span>`;
        }

        rows.push({ offset, hex: hexHtml, ascii: asciiHtml });
    }

    return rows;
}