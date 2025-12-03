const escapeHtml = (str) =>
    str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/**
 * Applies syntax highlighting to a raw DASH manifest string.
 * @param {string} text - The raw XML string.
 * @returns {string} An HTML string with syntax highlighting.
 */
export function highlightDash(text) {
    if (!text) return '';
    const escaped = escapeHtml(text);

    // This series of replacements applies color classes for different XML parts.
    return (
        escaped
            // Comments
            .replace(
                /(&lt;!--[\s\S]*?--&gt;)/g,
                '<span class="text-slate-500 italic">$1</span>'
            )
            // Processing Instructions
            .replace(
                /(&lt;\?[\s\S]*?\?&gt;)/g,
                '<span class="text-slate-500">$1</span>'
            )
            // Tag names
            .replace(
                /(&lt;\/?)([\w:-]+)/g,
                '$1<span class="text-blue-300">$2</span>'
            )
            // Attribute names and values
            .replace(
                /([\w:-]+)=(&quot;)(.*?)(&quot;)/g,
                '<span class="text-emerald-300">$1</span>=$2<span class="text-yellow-300">$3</span>$4'
            )
    );
}

/**
 * Helper to highlight HLS attributes within a string.
 */
function highlightHlsAttributes(text) {
    return text.replace(
        /([A-Z0-9-]+)=(&quot;[^&quot;]*&quot;|[^,]+)/g,
        (match, key, value) => {
            const isQuoted = value.startsWith('&quot;');
            const cleanValue = isQuoted ? value.slice(6, -6) : value; // remove &quot;
            const valueSpan = `<span class="text-yellow-300">${cleanValue}</span>`;

            return `<span class="text-emerald-300">${key}</span>=${
                isQuoted ? `&quot;${valueSpan}&quot;` : valueSpan
            }`;
        }
    );
}

/**
 * Applies syntax highlighting to a single line of a raw HLS manifest string.
 * @param {string} text - A single line from an M3U8 string.
 * @returns {string} An HTML string with syntax highlighting.
 */
export function highlightHls(text) {
    if (!text) return '';
    const escaped = escapeHtml(text);
    const trimmed = escaped.trim();

    // 1. Standard Tag Highlighting
    if (trimmed.startsWith('#EXT')) {
        const separatorIndex = escaped.indexOf(':');
        if (separatorIndex === -1) {
            // Tag without value (e.g., #EXTM3U)
            const tagMatch = escaped.match(/^(\s*)(#EXT[\w-]+)(.*)$/);
            if (tagMatch) {
                return `${tagMatch[1]}<span class="text-purple-300">${tagMatch[2]}</span>${tagMatch[3]}`;
            }
            return `<span class="text-purple-300">${escaped}</span>`;
        }

        const preTag = escaped.substring(0, separatorIndex);
        const attributesPart = escaped.substring(separatorIndex + 1);

        // Color the Tag
        const tagHtml = preTag.replace(
            /(#EXT[\w-]+)/,
            '<span class="text-purple-300">$1</span>'
        );

        // Highlight attributes
        const finalAttrs = highlightHlsAttributes(attributesPart);

        // If no attributes matched, but content exists, color it yellow (value-only tag)
        const renderedAttrs =
            finalAttrs === attributesPart &&
            attributesPart.trim().length > 0 &&
            !attributesPart.includes('=')
                ? `<span class="text-yellow-300">${attributesPart}</span>`
                : finalAttrs;

        return `${tagHtml}:${renderedAttrs}`;
    }

    // 2. Comment Highlighting
    if (trimmed.startsWith('#')) {
        return `<span class="text-slate-500">${escaped}</span>`;
    }

    // 3. Fragment/Attribute Fallback (For Diff Views)
    // If the text contains "KEY=VALUE" patterns, treat it as a list of attributes
    if (/[A-Z0-9-]+=[^,]+/.test(trimmed)) {
        return highlightHlsAttributes(escaped);
    }

    // 4. URI / Generic Content Highlighting
    const uriMatch = escaped.match(/^(\s*)(.*)$/);
    if (uriMatch) {
        return `${uriMatch[1]}<span class="text-cyan-400">${uriMatch[2]}</span>`;
    }
    return `<span class="text-cyan-400">${escaped}</span>`;
}
