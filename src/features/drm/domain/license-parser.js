/**
 * Attempts to make sense of license request/response bodies.
 * Handles JSON (ClearKey), XML (PlayReady), and falls back to Hex (Widevine/FairPlay).
 * @param {ArrayBuffer | string} data
 * @param {string} contentType
 * @returns {{ format: string, content: string }}
 */
export function parseLicensePayload(data, contentType = '') {
    if (!data) return { format: 'Empty', content: '' };

    let text = '';
    if (typeof data === 'string') {
        text = data;
    } else {
        try {
            text = new TextDecoder('utf-8').decode(data);
        } catch {
            text = '';
        }
    }

    // 1. Try JSON (ClearKey)
    if (
        contentType.includes('json') ||
        (text.startsWith('{') && text.endsWith('}'))
    ) {
        const json = JSON.parse(text);
        return { format: 'JSON', content: JSON.stringify(json, null, 2) };
    }

    // 2. Try XML (PlayReady)
    if (contentType.includes('xml') || text.trim().startsWith('<')) {
        // Simple check if it looks like XML
        if (text.includes('SoapAction') || text.includes('WRMHEADER')) {
            return { format: 'XML (PlayReady)', content: formatXml(text) };
        }
    }

    // 3. Fallback: Hex Dump (Widevine / FairPlay)
    const buffer =
        typeof data === 'string'
            ? new TextEncoder().encode(data)
            : new Uint8Array(data);

    return {
        format: 'Binary (Hex)',
        content: bufferToHex(buffer),
    };
}

function bufferToHex(buffer) {
    const hex = Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');

    // Chunk for readability (16 bytes per line)
    const chunks = [];
    for (let i = 0; i < hex.length; i += 48) {
        // 16 bytes * 3 chars (2 hex + 1 space)
        chunks.push(hex.slice(i, i + 48).trim());
    }
    return chunks.join('\n');
}

function formatXml(xml) {
    // Very basic pretty printer
    let formatted = '';
    let indent = 0;
    const tab = '  ';
    xml.split(/>\s*</).forEach((node) => {
        if (node.match(/^\/\w/)) indent -= 1;
        formatted += tab.repeat(Math.max(0, indent)) + '<' + node + '>\r\n';
        if (node.match(/^<?\w[^>]*[^/]$/)) indent += 1; // Fixed escape
    });
    return formatted.substring(1, formatted.length - 3);
}
