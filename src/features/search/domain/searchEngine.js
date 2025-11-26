/**
 * Recursively searches a manifest object for a query string.
 * @param {object} manifest The manifest object to search.
 * @param {string} query The search query.
 * @returns {Array} Array of search results.
 */
export function searchManifest(manifest, query) {
    if (!query || query.trim().length < 2) return [];

    const lowerQuery = query.toLowerCase();
    const results = [];
    const maxResults = 100;

    function traverse(node, path = 'MPD') {
        if (results.length >= maxResults) return;
        if (!node || typeof node !== 'object') return;

        // Handle the specific fast-xml-parser attribute grouping key ':@'
        if (node[':@']) {
            for (const [attrKey, attrVal] of Object.entries(node[':@'])) {
                if (results.length >= maxResults) return;

                // Skip xmlns and schema definitions to reduce noise
                if (
                    attrKey.startsWith('xmlns') ||
                    attrKey.includes('schemaLocation')
                )
                    continue;

                const attrPath = `${path}@${attrKey}`;
                const strVal = String(attrVal);

                // 1. Match Attribute Name (Key)
                if (attrKey.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        path: attrPath,
                        key: attrKey,
                        value: strVal,
                        context: `Attribute: ${attrKey}`,
                        type: 'key',
                    });
                }
                // 2. Match Attribute Value
                else if (strVal.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        path: attrPath,
                        key: attrKey,
                        value: strVal,
                        context: `${attrKey}="${strVal}"`,
                        type: 'value',
                    });
                }
            }
        }

        // Iterate over standard children
        for (const [key, value] of Object.entries(node)) {
            if (results.length >= maxResults) return;

            // Skip internal keys, raw blobs, and the attribute container we just handled
            if (
                key === 'rawManifest' ||
                key === 'serializedManifest' ||
                key === ':@' ||
                key === 'parent'
            )
                continue;

            // 3. Match Element/Property Name (Key)
            if (key.toLowerCase().includes(lowerQuery)) {
                results.push({
                    path: `${path}.${key}`,
                    key,
                    value: typeof value === 'object' ? 'Object' : String(value),
                    context: `Element: <${key}>`,
                    type: 'key',
                });
            }

            // 4. Match Primitive Values (Text content, boolean flags, etc.)
            if (
                value !== null &&
                typeof value !== 'object' &&
                typeof value !== 'function'
            ) {
                const strValue = String(value);
                if (strValue.toLowerCase().includes(lowerQuery)) {
                    // Special handling for #text nodes to make path cleaner
                    const displayPath =
                        key === '#text' ? path : `${path}.${key}`;
                    results.push({
                        path: displayPath,
                        key,
                        value: strValue,
                        context:
                            key === '#text'
                                ? `Content: "${strValue}"`
                                : `${key}: ${strValue}`,
                        type: 'value',
                    });
                }
            }

            // 5. Recursion
            if (typeof value === 'object') {
                if (Array.isArray(value)) {
                    value.forEach((child, index) => {
                        // For arrays, we append [index]
                        // If the key is 'children', we skip appending it to the path if possible,
                        // but for generic manifest structures (like Period), we want Period[0]
                        traverse(child, `${path}.${key}[${index}]`);
                    });
                } else {
                    // Flatten singleton objects in path for readability if they act like children
                    traverse(value, `${path}.${key}`);
                }
            }
        }
    }

    // Start traversal.
    // If the root object is an array (rare for root manifest), handle it.
    // Otherwise start at the top.
    if (Array.isArray(manifest)) {
        manifest.forEach((item, i) => traverse(item, `[${i}]`));
    } else {
        // DASH root is usually under a key like 'MPD', but the serialized object passed in
        // might *be* the MPD object itself (from fast-xml-parser).
        // We assume the passed object is the node itself.
        traverse(manifest, '');
    }

    return results;
}
