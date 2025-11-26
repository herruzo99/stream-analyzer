/**
 * @typedef {Object} PatchRule
 * @property {string} id - Unique ID for the rule.
 * @property {'string' | 'regex'} type - The type of match to perform.
 * @property {string} target - The string or regex pattern to find.
 * @property {string} replacement - The string to replace matches with.
 * @property {boolean} active - Whether the rule is currently active.
 */

/**
 * Applies a list of patch rules to a manifest string.
 * @param {string} content - The original manifest content.
 * @param {PatchRule[]} rules - The list of rules to apply.
 * @returns {string} The patched manifest content.
 */
export function applyPatches(content, rules) {
    if (!content || !rules || rules.length === 0) {
        return content;
    }

    let patchedContent = content;

    for (const rule of rules) {
        if (!rule.active || !rule.target) continue;

        try {
            if (rule.type === 'regex') {
                const regex = new RegExp(rule.target, 'g');
                patchedContent = patchedContent.replace(
                    regex,
                    rule.replacement || ''
                );
            } else {
                // String replacement - replace all occurrences
                const target = rule.target;
                const replacement = rule.replacement || '';
                // Escape special regex characters to use replaceAll-like behavior with regex if needed,
                // or use split/join for simple global replacement.
                patchedContent = patchedContent.split(target).join(replacement);
            }
        } catch (e) {
            console.warn(`Failed to apply patch rule ${rule.id}:`, e);
        }
    }

    return patchedContent;
}

/**
 * Generates a Blob URL for the given content and MIME type.
 * @param {string} content - The content to create a Blob from.
 * @param {string} mimeType - The MIME type (e.g., 'application/dash+xml').
 * @returns {string} The Blob URL.
 */
export function generateBlobUrl(content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    return URL.createObjectURL(blob);
}
