/**
 * Resolves a relative URL against a base URL.
 * @param {string} relative - The relative path.
 * @param {string} base - The base URL.
 * @returns {string} The absolute URL.
 */
function toAbsolute(relative, base) {
    if (!relative) return relative;
    // If already absolute (http://, https://, data:), return as is
    if (/^[a-z]+:/i.test(relative)) {
        return relative;
    }
    try {
        return new URL(relative, base).href;
    } catch (_e) {
        return relative; // Fallback
    }
}

/**
 * Rewrites an HLS manifest to make all URIs absolute.
 * @param {string} content - The raw HLS manifest text.
 * @param {string} baseUrl - The original manifest URL to resolve against.
 * @returns {string} The rebased manifest.
 */
function rebaseHls(content, baseUrl) {
    const lines = content.split(/\r?\n/);
    const rebasedLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        // 1. Handle Tags with URI attributes (e.g., #EXT-X-KEY:METHOD=AES-128,URI="key.php")
        if (trimmed.startsWith('#EXT')) {
            // Regex to find URI="..." or URI=...
            // We generally look for URI="value" or URI=value
            if (trimmed.includes('URI=')) {
                return line.replace(
                    /URI=(?:"([^"]+)"|([^",\s]+))/g,
                    (match, quotedUrl, unquotedUrl) => {
                        const url = quotedUrl || unquotedUrl;
                        const absUrl = toAbsolute(url, baseUrl);
                        return `URI="${absUrl}"`;
                    }
                );
            }
            return line;
        }

        // 2. Handle Comments
        if (trimmed.startsWith('#')) {
            return line;
        }

        // 3. Handle Segment/Playlist URIs (lines that are not tags)
        return toAbsolute(trimmed, baseUrl);
    });

    return rebasedLines.join('\n');
}

/**
 * Rewrites a DASH manifest to ensure it has an absolute BaseURL.
 * @param {string} content - The raw DASH XML.
 * @param {string} baseUrl - The original manifest URL.
 * @returns {string} The rebased manifest.
 */
function rebaseDash(content, baseUrl) {
    // Ensure baseUrl ends with a slash if it's a directory, or strip filename if it's a file
    // Standard URL resolution handles this, but for explicit BaseURL injection, exactness matters.
    // If baseUrl is "http://example.com/manifest.mpd", base path is "http://example.com/"
    const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);

    // 1. Remove existing relative BaseURLs to avoid confusion/precedence issues?
    // Actually, replacing them is safer.
    let newContent = content.replace(
        /<BaseURL>(.*?)<\/BaseURL>/g,
        (match, inner) => {
            const abs = toAbsolute(inner, basePath);
            return `<BaseURL>${abs}</BaseURL>`;
        }
    );

    // 2. If no BaseURL exists at the top level, inject one.
    // We look for the closing of the opening <MPD ...> tag.
    if (!/<BaseURL>/i.test(newContent)) {
        const mpdRegex = /<MPD[^>]*>/;
        const match = newContent.match(mpdRegex);
        if (match) {
            const insertIndex = match.index + match[0].length;
            const baseTag = `\n  <BaseURL>${basePath}</BaseURL>`;
            newContent =
                newContent.slice(0, insertIndex) +
                baseTag +
                newContent.slice(insertIndex);
        }
    }

    return newContent;
}

/**
 * Main entry point to rebase a manifest.
 * @param {string} content - Raw manifest string.
 * @param {string} baseUrl - The original URL of the stream.
 * @param {'dash' | 'hls'} protocol - The streaming protocol.
 * @returns {string} The processed manifest string.
 */
export function rebaseManifest(content, baseUrl, protocol) {
    if (!baseUrl) return content;

    try {
        if (protocol === 'hls') {
            return rebaseHls(content, baseUrl);
        } else if (protocol === 'dash') {
            return rebaseDash(content, baseUrl);
        }
    } catch (e) {
        console.warn('[ManifestRebaser] Failed to rebase manifest:', e);
    }
    return content;
}
