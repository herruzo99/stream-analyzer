const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

/**
 * Simple FNV-1a hash function for strings.
 * @param {string} str The string to hash.
 * @returns {number} A 32-bit hash value.
 */
function fnv1a(str) {
    let hash = FNV_OFFSET_BASIS;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash *= FNV_PRIME;
    }
    return hash >>> 0;
}

/**
 * Generates a slightly different background color shade based on a field name.
 * @param {object} baseColor - The base color object with a 'bg' property.
 * @param {string} fieldName - The name of the field to generate a shade for.
 * @returns {object} A new color object with a modified 'bg' property.
 */
function getFieldShade(baseColor, fieldName) {
    const hash = fnv1a(fieldName);
    const tintFactor = (hash % 5) * 5; // Generates tints of 0, 5, 10, 15, 20
    const baseClass = baseColor.bg;
    const newClass = baseClass.replace(/\/\d+/, `/${20 + tintFactor}`);
    return { ...baseColor, bg: newClass };
}

/**
 * A utility to build a detailed map of every byte in an ISOBMFF segment,
 * associating it with its parent box, specific field, and assigned color.
 * This is crucial for interactive highlighting.
 * @param {Array<import('../../../../../protocols/segment/isobmff/parser.js').Box | object>} boxesOrChunks
 * @returns {Map<number, {box: import('../../../../../protocols/segment/isobmff/parser.js').Box, fieldName: string, color: object}>}
 */
export function buildByteMap(boxesOrChunks) {
    const byteMap = new Map();
    const reservedColor = { bg: 'bg-gray-700/50' };

    /**
     * @param {import('../../../../../protocols/segment/isobmff/parser.js').Box} box
     */
    const traverse = (box) => {
        if (box.isChunk) {
            // It's a logical chunk container
            const chunkColor = getFieldShade(box.color, 'Chunk');
            for (let i = box.offset; i < box.offset + box.size; i++) {
                if (!byteMap.has(i)) {
                    byteMap.set(i, {
                        box,
                        fieldName: 'CMAF Chunk',
                        color: chunkColor,
                    });
                }
            }
            // Recurse into the actual boxes inside the chunk
            if (box.children?.length > 0) {
                for (const child of box.children) {
                    traverse(child);
                }
            }
            return;
        }

        // It's a regular box
        if (box.children?.length > 0) {
            for (const child of box.children) {
                traverse(child);
            }
        }

        const contentStart = box.offset + box.headerSize;
        const contentEnd = box.offset + box.size;
        const contentColor = getFieldShade(box.color, 'Box Content');
        for (let i = contentStart; i < contentEnd; i++) {
            if (!byteMap.has(i)) {
                byteMap.set(i, {
                    box,
                    fieldName: 'Box Content',
                    color: contentColor,
                });
            }
        }

        if (box.details) {
            for (const [fieldName, fieldMeta] of Object.entries(box.details)) {
                if (
                    fieldMeta.offset !== undefined &&
                    fieldMeta.length !== undefined &&
                    fieldMeta.length > 0
                ) {
                    const fieldColor =
                        fieldName.includes('reserved') ||
                        fieldName.includes('Padding') ||
                        fieldName.includes('pre_defined')
                            ? reservedColor
                            : getFieldShade(box.color, fieldName);

                    const lengthInBytes = Math.ceil(fieldMeta.length);
                    for (
                        let i = fieldMeta.offset;
                        i < fieldMeta.offset + lengthInBytes;
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
        for (const item of boxesOrChunks) {
            traverse(item);
        }
    }
    return byteMap;
}
