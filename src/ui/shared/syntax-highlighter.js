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
 * Applies syntax highlighting to a single line of a raw HLS manifest string.
 * @param {string} text - A single line from an M3U8 string.
 * @returns {string} An HTML string with syntax highlighting.
 */
export function highlightHls(text) {
    if (!text) return '';
    const escaped = escapeHtml(text.trim());

    if (escaped.startsWith('#EXT')) {
        const separatorIndex = escaped.indexOf(':');
        if (separatorIndex === -1) {
            return `#<span class="text-purple-300">${escaped.substring(
                1
            )}</span>`;
        }
        const tagName = escaped.substring(1, separatorIndex);
        let attributesPart = escaped.substring(separatorIndex + 1);

        // Highlight attributes and their values
        attributesPart = attributesPart.replace(
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

        // Handle values without an attribute key (like in EXTINF)
        if (!attributesPart.includes('=')) {
            attributesPart = `<span class="text-yellow-300">${attributesPart}</span>`;
        }

        return `#<span class="text-purple-300">${tagName}</span>:${attributesPart}`;
    }
    if (escaped.startsWith('#')) {
        return `<span class="text-slate-500">${escaped}</span>`;
    }
    // URIs and other content
    return `<span class="text-cyan-400">${escaped}</span>`;
}