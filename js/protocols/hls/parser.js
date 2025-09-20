import { adaptHlsToIr } from './adapter.js';

/**
 * @typedef {object} HlsSegment
 * @property {number} duration
 * @property {string} title
 * @property {any[]} tags
 * @property {Record<string, string|number> | null} key
 * @property {string} [uri]
 * @property {string} [resolvedUri]
 * @property {string} [byteRange]
 * @property {boolean} [discontinuity]
 * @property {string} [dateTime]
 */

/**
 * Parses an attribute list string (e.g., 'BANDWIDTH=1280000,CODECS="..."')
 * into a key-value object.
 * @param {string} attrString
 * @returns {Record<string, string | number>}
 */
function parseAttributeList(attrString) {
    /** @type {Record<string, string | number>} */
    const attributes = {};
    // This regex splits by comma, but not inside quotes.
    const parts = attrString.match(/("[^"]*")|[^,]+/g) || [];
    parts.forEach((part) => {
        const eqIndex = part.indexOf('=');
        if (eqIndex === -1) return;
        const key = part.substring(0, eqIndex);
        const value = part.substring(eqIndex + 1).replace(/"/g, '');
        // Attempt to convert numbers
        const numValue = /^-?\d+(\.\d+)?$/.test(value)
            ? parseFloat(value)
            : value;
        attributes[key] = numValue;
    });
    return attributes;
}

/**
 * Parses an HLS Manifest string and returns a structured object.
 * This implementation covers key tags from RFC 8216 for structural analysis.
 * @param {string} manifestString The raw HLS playlist.
 * @param {string} baseUrl The URL from which the playlist was fetched.
 * @returns {Promise<{manifest: import('../../core/state.js').Manifest, baseUrl: string}>}
 */
export async function parseManifest(manifestString, baseUrl) {
    const lines = manifestString.split(/\r?\n/);

    if (!lines[0] || lines[0].trim() !== '#EXTM3U') {
        throw new Error('Invalid HLS playlist. Must start with #EXTM3U.');
    }

    const parsed = {
        isMaster: false,
        version: 1,
        tags: [],
        segments: [],
        variants: [],
        media: [],
        raw: manifestString,
        baseUrl: baseUrl,
    };

    /** @type {HlsSegment | null} */
    let currentSegment = null;
    let currentKey = null;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('#EXT')) {
            const separatorIndex = line.indexOf(':');
            let tagName, tagValue;

            if (separatorIndex === -1) {
                tagName = line.substring(1);
                tagValue = null;
            } else {
                tagName = line.substring(1, separatorIndex);
                tagValue = line.substring(separatorIndex + 1);
            }

            switch (tagName) {
                // Master Playlist Tags
                case 'EXT-X-STREAM-INF':
                    parsed.isMaster = true;
                    const attributes = parseAttributeList(tagValue);
                    const uri = lines[++i].trim();
                    parsed.variants.push({
                        attributes,
                        uri,
                        resolvedUri: new URL(uri, baseUrl).href,
                    });
                    break;
                case 'EXT-X-MEDIA':
                    parsed.isMaster = true;
                    parsed.media.push(parseAttributeList(tagValue));
                    break;
                case 'EXT-X-I-FRAME-STREAM-INF':
                    parsed.isMaster = true; // Also indicates a master
                    // Not fully parsed for now, but recognized
                    parsed.tags.push({ name: tagName, value: tagValue });
                    break;

                // Media Playlist Tags
                case 'EXTINF':
                    const [duration, title] = tagValue.split(',');
                    currentSegment = {
                        duration: parseFloat(duration),
                        title: title || '',
                        tags: [],
                        key: currentKey,
                    };
                    break;
                case 'EXT-X-BYTERANGE':
                    if (currentSegment) currentSegment.byteRange = tagValue;
                    break;
                case 'EXT-X-DISCONTINUITY':
                    if (currentSegment) currentSegment.discontinuity = true;
                    break;
                case 'EXT-X-KEY':
                    currentKey = parseAttributeList(tagValue);
                    break;
                case 'EXT-X-MAP':
                    parsed.map = parseAttributeList(tagValue);
                    break;
                case 'EXT-X-PROGRAM-DATE-TIME':
                    if (currentSegment) currentSegment.dateTime = tagValue;
                    break;
                case 'EXT-X-TARGETDURATION':
                    parsed.targetDuration = parseInt(tagValue, 10);
                    break;
                case 'EXT-X-MEDIA-SEQUENCE':
                    parsed.mediaSequence = parseInt(tagValue, 10);
                    break;
                case 'EXT-X-PLAYLIST-TYPE':
                    parsed.playlistType = tagValue;
                    break;
                case 'EXT-X-ENDLIST':
                    parsed.isLive = false;
                    break;

                // Common Tags
                case 'EXT-X-VERSION':
                    parsed.version = parseInt(tagValue, 10);
                    break;

                // Default for other tags
                default:
                    if (currentSegment) {
                        currentSegment.tags.push({
                            name: tagName,
                            value: tagValue,
                        });
                    } else {
                        parsed.tags.push({ name: tagName, value: tagValue });
                    }
                    break;
            }
        } else if (!line.startsWith('#')) {
            // It's a URI
            if (currentSegment) {
                currentSegment.uri = line;
                currentSegment.resolvedUri = new URL(line, baseUrl).href;
                parsed.segments.push(currentSegment);
                currentSegment = null;
            }
        }
        // Lines starting with '#' but not '#EXT' are comments and are ignored.
    }

    if (!parsed.isMaster && typeof parsed.isLive === 'undefined') {
        parsed.isLive = true;
    }

    const manifest = adaptHlsToIr(parsed);
    return { manifest, baseUrl };
}