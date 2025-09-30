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

    // This regex uses multiple capture groups to identify different parts of the XML structure.
    // By processing them in a single pass, we avoid the issue of one replacement
    // creating a string that is then incorrectly matched by a subsequent replacement.
    // Group 1: Comments (e.g., <!-- ... -->)
    // Group 2: Processing Instructions (e.g., <?xml ... ?>)
    // Group 3: Opening tag part (e.g., '<' or '</')
    // Group 4: Tag name
    // Group 5: Attribute name (e.g., 'type=')
    // Group 6: Opening quote of an attribute value
    // Group 7: The attribute value itself
    // Group 8: Closing quote of an attribute value
    const regex =
        /(&lt;!--[\s\S]*?--&gt;)|(&lt;\?[\s\S]*?\?&gt;)|(&lt;\/?)([\w:-]+)|([\w:-]+=)|(&quot;)([^&quot;]*)(&quot;)/g;

    return escaped.replace(
        regex,
        (match, comment, pi, open, tag, attr, openQuote, value, closeQuote) => {
            if (comment) {
                return `<span class="text-gray-500 italic">${comment}</span>`;
            }
            if (pi) {
                // Highlighting for PIs can be the same as comments or different
                return `<span class="text-gray-500">${pi}</span>`;
            }
            if (open) {
                // A tag was matched
                return `${open}<span class="text-blue-300">${tag}</span>`;
            }
            if (attr) {
                // An attribute was matched
                return `<span class="text-emerald-300">${attr.slice(
                    0,
                    -1
                )}</span>=`;
            }
            if (openQuote) {
                // An attribute value was matched
                return `${openQuote}<span class="text-yellow-300">${value}</span>${closeQuote}`;
            }
            return match; // Fallback for anything else (e.g., content text)
        }
    );
}

/**
 * Applies syntax highlighting to a raw HLS manifest string.
 * @param {string} text - The raw M3U8 string.
 * @returns {string} An HTML string with syntax highlighting.
 */
export function highlightHls(text) {
    if (!text) return '';
    return text
        .split('\n')
        .map((line) => {
            const escaped = escapeHtml(line.trim());
            if (escaped.startsWith('#EXT')) {
                const separatorIndex = escaped.indexOf(':');
                if (separatorIndex === -1) {
                    return `#<span class="text-purple-300">${escaped.substring(
                        1
                    )}</span>`;
                }
                const tagName = escaped.substring(1, separatorIndex);
                let tagValue = escaped.substring(separatorIndex + 1);

                // Highlight attributes within the value
                tagValue = tagValue.replace(
                    /([A-Z0-9-]+)=/g,
                    '<span class="text-emerald-300">$1</span>='
                );
                // Highlight quoted strings
                tagValue = tagValue.replace(
                    /"([^"]*)"/g,
                    '"<span class="text-yellow-300">$1</span>"'
                );

                return `#<span class="text-purple-300">${tagName}</span>:${tagValue}`;
            }
            if (escaped.startsWith('#')) {
                return `<span class="text-gray-500">${escaped}</span>`;
            }
            return `<span class="text-cyan-400">${escaped}</span>`;
        })
        .join('\n');
}
