/**
 * @typedef {object} HexRow
 * @property {string} offset - The 8-digit hex offset for the start of the row.
 * @property {string} hex - The space-separated hex representation of the bytes.
 * @property {string} ascii - The ASCII representation of the bytes.
 */

/**
 * Creates a lookup map for byte offsets to their box/field metadata.
 * This version is refactored for 100% coverage of all bytes within boxes.
 * @param {import('../segment-analysis/isobmff-parser.js').Box[]} parsedData - Array of parsed box data
 * @returns {Map<number, {box: object, field: string, color: string}>}
 */
function buildByteMap(parsedData) {
    const byteMap = new Map();
    const boxColors = [
        'bg-red-500/20', 'bg-yellow-500/20', 'bg-green-500/20',
        'bg-blue-500/20', 'bg-indigo-500/20', 'bg-purple-500/20', 'bg-pink-500/20',
        'bg-teal-500/20', 'bg-orange-500/20', 'bg-lime-500/20', 'bg-rose-500/20'
    ];
    let colorIndex = 0;

    const traverse = (boxes) => {
        if (!boxes) return;

        for (const box of boxes) {
            const color = boxColors[colorIndex % boxColors.length];
            const boxStart = box.offset;
            const boxEnd = box.offset + box.size;
            
            // Step 1: Map the entire box area with a base "Box Content" label.
            // This ensures 100% coverage for this box from the start.
            for (let i = boxStart; i < boxEnd; i++) {
                byteMap.set(i, { box, field: 'Box Content', color });
            }

            // Step 2: Map the header specifically.
            for (let i = boxStart; i < box.contentOffset; i++) {
                byteMap.set(i, { box, field: 'Header', color });
            }

            // Step 3: Map detailed fields, overwriting the generic "Box Content".
            if (box.details) {
                for (const [fieldName, fieldMeta] of Object.entries(box.details)) {
                    if (fieldMeta.offset !== undefined && fieldMeta.length !== undefined) {
                        for (let i = fieldMeta.offset; i < fieldMeta.offset + fieldMeta.length; i++) {
                            byteMap.set(i, { box, field: fieldName, color });
                        }
                    }
                }
            }
            
            // Step 4: Recursively map children. This will overwrite the parent's generic
            // "Box Content" mapping with more specific child data.
            if (box.children && box.children.length > 0) {
                traverse(box.children);
            }
            
            // Step 5: Map any remaining gaps within a container as "Container Padding".
            // This covers areas inside a container that are not children boxes.
            if (box.children && box.children.length > 0) {
                 let lastChildEnd = box.contentOffset;
                 if (box.children.length > 0) {
                    const lastChild = box.children[box.children.length - 1];
                    lastChildEnd = lastChild.offset + lastChild.size;
                 }
                 
                 if (boxEnd > lastChildEnd) {
                    for (let i = lastChildEnd; i < boxEnd; i++) {
                        byteMap.set(i, { box, field: 'Container Padding', color: 'bg-gray-500/20' });
                    }
                 }
            }


            colorIndex++;
        }
    };
    
    if (parsedData && Array.isArray(parsedData)) {
        traverse(parsedData);
    }
    
    // Final gap check for data between top-level boxes (should be rare)
    const maxOffset = parsedData.reduce((max, box) => Math.max(max, box.offset + box.size), 0);
    for (let i = 0; i < maxOffset; i++) {
        if (!byteMap.has(i)) {
            byteMap.set(i, {
                box: { type: 'UNKNOWN', offset: i, size: 1 },
                field: 'Unmapped Data',
                color: 'bg-gray-700/50'
            });
        }
    }

    return byteMap;
}


/**
 * Generates a view model for a hex/ASCII view.
 * The tooltip content is now deferred to the view to handle dynamically.
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

        const hexParts = [];
        const asciiParts = [];

        const baseHexClass = 'inline-block h-6 leading-6 w-7 text-center align-middle transition-colors duration-150 cursor-pointer';
        const baseAsciiClass = 'inline-block h-6 leading-6 w-4 text-center align-middle transition-colors duration-150 tracking-tight cursor-pointer';
        const hoverDefault = 'hover:bg-gray-600/50';

        rowBytes.forEach((byte, index) => {
            const byteOffset = i + index;
            const mapEntry = byteMap.get(byteOffset);

            let hexCssClass = baseHexClass;
            let asciiCssClass = baseAsciiClass;
            let dataAttrs = `data-byte-offset="${byteOffset}"`;

            if (mapEntry) {
                hexCssClass += ` ${mapEntry.color}`;
                asciiCssClass += ` ${mapEntry.color}`;
                dataAttrs += ` data-box-offset="${mapEntry.box.offset}" data-field-name="${mapEntry.field}"`;
            } else {
                hexCssClass += ` ${hoverDefault}`;
                asciiCssClass += ` ${hoverDefault}`;
            }

            const hexByte = byte.toString(16).padStart(2, '0').toUpperCase();
            hexParts.push(`<span class="${hexCssClass}" ${dataAttrs}>${hexByte}</span>`);

            const asciiChar = (byte >= 32 && byte <= 126) ? String.fromCharCode(byte).replace('<', '&lt;') : '.';
            asciiParts.push(`<span class="${asciiCssClass}" ${dataAttrs}>${asciiChar}</span>`);
        });

        while (hexParts.length < bytesPerRow) {
            hexParts.push(`<span class="${baseHexClass} text-gray-700 select-none"></span>`);
            asciiParts.push(`<span class="${baseAsciiClass} text-gray-700 select-none"></span>`);
        }
        
        const hexHtml = `<div class="flex gap-0">${hexParts.join('')}</div>`;
        const asciiHtml = `<div class="flex gap-0">${asciiParts.join('')}</div>`;

        rows.push({ offset, hex: hexHtml, ascii: asciiHtml });
    }

    return rows;
}