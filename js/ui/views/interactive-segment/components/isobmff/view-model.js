/**
 * Generates a slightly different background color shade based on a field name by varying opacity.
 * @param {object} baseColor - The base color object with a 'bg' property (e.g., 'bg-red-500/20').
 * @param {string} fieldName - The name of the field to generate a shade for.
 * @param {number} fieldIndex - An index to ensure variation.
 * @returns {{bg: string, style: string}} A new color object with a base class and a style attribute for opacity.
 */
function getFieldShade(baseColor, fieldName, fieldIndex) {
    if (!baseColor || !baseColor.bg) {
        return { bg: 'bg-gray-700', style: '--tw-bg-opacity: 0.5' }; // A safe default
    }

    const opacities = [0.1, 0.2, 0.3, 0.4];
    const opacity = opacities[fieldIndex % opacities.length];
    const baseClass = baseColor.bg.replace(/\/\d+/, '');

    return { bg: baseClass, style: `--tw-bg-opacity: ${opacity}` };
}

/**
 * A utility to build a detailed map of every byte in an ISOBMFF segment,
 * associating it with its parent box, specific field, and assigned color.
 * This is crucial for interactive highlighting.
 * @param {Array<import('../../../../../infrastructure/segment/isobmff/parser.js').Box | object>} boxesOrChunks
 * @returns {Map<number, {box: import('../../../../../infrastructure/segment/isobmff/parser.js').Box, fieldName: string, color: {bg: string, style: string}}>}
 */
export function buildByteMap(boxesOrChunks) {
    const byteMap = new Map();

    /**
     * @param {import('../../../../../infrastructure/segment/isobmff/parser.js').Box} box
     */
    const traverse = (box) => {
        // Post-order traversal: children paint first, then parent fills the gaps.

        // 1. Recurse into children. They get first dibs on the byte map.
        if (box.children?.length > 0) {
            for (const child of box.children) {
                traverse(child);
            }
        }

        // 2. After children have painted, fill in this box's content area
        // where no children have painted.
        const contentColor = getFieldShade(box.color, 'Box Content', 0);
        for (
            let i = box.offset + box.headerSize;
            i < box.offset + box.size;
            i++
        ) {
            if (!byteMap.has(i)) {
                byteMap.set(i, {
                    box,
                    fieldName: 'Box Content',
                    color: contentColor,
                });
            }
        }

        // 3. Finally, paint this box's own fields and header. This will
        // overwrite the generic content fill for this box, but not for children.
        const headerColor = getFieldShade(box.color, 'Box Header', 1);
        for (let i = box.offset; i < box.offset + box.headerSize; i++) {
            byteMap.set(i, {
                box,
                fieldName: 'Box Header',
                color: headerColor,
            });
        }

        if (box.details) {
            let fieldIndex = 2; // Start after content and header
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
