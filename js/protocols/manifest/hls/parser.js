import { adaptHlsToIr } from './adapter.js';

/**
 * @typedef {object} HlsSegment
 * @property {number} duration
 * @property {string} title
 * @property {any[]} tags
 * @property {Record<string, string|number> | null} key
 * @property {object[]} parts
 * @property {number|null} bitrate
 * @property {boolean} gap
 * @property {string} [uri]
 * @property {string} [resolvedUrl]
 * @property {boolean} [discontinuity]
 * @property {string} [dateTime]
 * @property {string} type
 * @property {number} extinfLineNumber
 * @property {number} [uriLineNumber]
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
 * Pre-processes manifest lines to handle variable substitution.
 * @param {string[]} lines - The raw lines from the manifest.
 * @param {string} playlistUrl - The URL from which the manifest was fetched.
 * @param {Map<string, {value: string, source: string}>=} parentVariables - Variables inherited from a master playlist.
 * @returns {{substitutedLines: string[], definedVariables: Map<string, {value: string, source: string}>}} The lines after substitution and any new variables defined.
 */
function applyVariableSubstitution(
    lines,
    playlistUrl,
    parentVariables = new Map()
) {
    const variables = new Map(parentVariables);
    const urlParams = new URL(playlistUrl).searchParams;

    // First pass: define variables
    lines.forEach((line) => {
        if (line.startsWith('#EXT-X-DEFINE:')) {
            const attrs = parseAttributeList(line.substring(14));
            if (attrs.NAME && attrs.VALUE !== undefined) {
                variables.set(String(attrs.NAME), {
                    value: String(attrs.VALUE),
                    source: 'VALUE',
                });
            } else if (attrs.QUERYPARAM) {
                const paramName = String(attrs.QUERYPARAM);
                const paramValue = urlParams.get(paramName);
                if (paramValue !== null) {
                    variables.set(paramName, {
                        value: paramValue,
                        source: `QUERYPARAM (${paramName})`,
                    });
                }
            } else if (attrs.IMPORT) {
                const importName = String(attrs.IMPORT);
                if (parentVariables.has(importName)) {
                    variables.set(importName, {
                        value: parentVariables.get(importName).value,
                        source: `IMPORT (${importName})`,
                    });
                }
            }
        }
    });

    if (variables.size === 0) {
        return { substitutedLines: lines, definedVariables: variables };
    }

    // Second pass: substitute
    const substitutedLines = lines.map((line) => {
        return line.replace(/{\$[a-zA-Z0-9_-]+}/g, (match) => {
            const varName = match.substring(2, match.length - 1);
            return variables.has(varName)
                ? variables.get(varName).value
                : match;
        });
    });

    return { substitutedLines, definedVariables: variables };
}

/**
 * Parses an HLS Manifest string and returns a structured object.
 * @param {string} manifestString The raw HLS playlist.
 * @param {string} baseUrl The URL from which the playlist was fetched.
 * @param {Map<string, {value: string, source: string}>=} parentVariables - Variables inherited from a master playlist.
 * @returns {Promise<{manifest: import('../../../core/types.js').Manifest, definedVariables: Map<string, {value: string, source: string}>, baseUrl: string}>}
 */
export async function parseManifest(manifestString, baseUrl, parentVariables) {
    let rawManifestForParsing = manifestString;
    let initialLines = manifestString.split(/\r?\n/);

    if (!initialLines[0] || initialLines[0].trim() !== '#EXTM3U') {
        if (manifestString.includes('#EXTINF:')) {
            initialLines.unshift('#EXTM3U');
            rawManifestForParsing = initialLines.join('\n'); // Update raw string
        } else {
            throw new Error('Invalid HLS playlist. Must start with #EXTM3U.');
        }
    }

    const { substitutedLines: lines, definedVariables } =
        applyVariableSubstitution(initialLines, baseUrl, parentVariables);

    const isMaster = lines.some((line) => line.startsWith('#EXT-X-STREAM-INF'));

    const parsed = {
        isMaster: isMaster,
        version: 1,
        tags: [],
        segments: [],
        variants: [],
        media: [],
        raw: rawManifestForParsing, // Original raw string
        baseUrl: baseUrl,
        isLive: !isMaster, // Heuristic: Master is VOD by default, Media is Live by default
        preloadHints: [],
        renditionReports: [],
    };

    /** @type {HlsSegment | null} */
    let currentSegment = null;
    let currentKey = null;
    let currentBitrate = null;

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
                case 'EXT-X-STREAM-INF': {
                    parsed.isMaster = true;
                    const attributes = parseAttributeList(tagValue);
                    const uri = lines[++i].trim();
                    parsed.variants.push({
                        attributes,
                        uri,
                        resolvedUri: new URL(uri, baseUrl).href,
                        lineNumber: i,
                    });
                    break;
                }
                case 'EXT-X-MEDIA':
                    parsed.isMaster = true;
                    parsed.media.push({
                        ...parseAttributeList(tagValue),
                        lineNumber: i,
                    });
                    break;
                case 'EXT-X-I-FRAME-STREAM-INF':
                    parsed.isMaster = true;
                    parsed.tags.push({
                        name: tagName,
                        value: parseAttributeList(tagValue),
                        lineNumber: i,
                    });
                    break;
                case 'EXTINF': {
                    const [durationStr, title] = tagValue.split(',');
                    let duration = parseFloat(durationStr);
                    if (isNaN(duration)) {
                        duration = 0;
                    }
                    currentSegment = {
                        duration,
                        title: title || '',
                        tags: [],
                        key: currentKey,
                        parts: [],
                        bitrate: currentBitrate,
                        gap: false,
                        type: 'Media',
                        extinfLineNumber: i,
                    };
                    break;
                }
                case 'EXT-X-GAP':
                    if (currentSegment) {
                        currentSegment.gap = true;
                        currentSegment.uri = null;
                        currentSegment.resolvedUrl = null;
                        parsed.segments.push(currentSegment);
                        currentSegment = null;
                    }
                    break;
                case 'EXT-X-BITRATE':
                    currentBitrate = parseInt(tagValue, 10);
                    break;
                case 'EXT-X-BYTERANGE':
                    if (currentSegment)
                        currentSegment.tags.push({
                            name: tagName,
                            value: tagValue,
                            lineNumber: i,
                        }); // Store byterange as a generic tag for now
                    break;
                case 'EXT-X-DISCONTINUITY':
                    if (currentSegment) currentSegment.discontinuity = true;
                    break;
                case 'EXT-X-KEY': {
                    const keyAttributes = parseAttributeList(tagValue);
                    currentKey = keyAttributes;
                    if (keyAttributes.METHOD === 'NONE') {
                        currentKey = null;
                    }
                    parsed.tags.push({
                        name: tagName,
                        value: keyAttributes,
                        lineNumber: i,
                    });
                    break;
                }
                case 'EXT-X-MAP':
                    parsed.map = {
                        ...parseAttributeList(tagValue),
                        lineNumber: i,
                    };
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
                    if (tagValue === 'VOD') {
                        parsed.isLive = false;
                    } else if (tagValue === 'EVENT') {
                        parsed.isLive = true;
                    }
                    break;
                case 'EXT-X-ENDLIST':
                    parsed.isLive = false;
                    parsed.tags.push({
                        name: tagName,
                        value: null,
                        lineNumber: i,
                    });
                    break;
                case 'EXT-X-VERSION':
                    parsed.version = parseInt(tagValue, 10);
                    parsed.tags.push({
                        name: tagName,
                        value: parsed.version,
                        lineNumber: i,
                    });
                    break;
                // --- Low Latency HLS Tags ---
                case 'EXT-X-PART-INF':
                    parsed.partInf = parseAttributeList(tagValue);
                    parsed.tags.push({
                        name: tagName,
                        value: parsed.partInf,
                        lineNumber: i,
                    });
                    break;
                case 'EXT-X-SERVER-CONTROL':
                    parsed.serverControl = parseAttributeList(tagValue);
                    parsed.tags.push({
                        name: tagName,
                        value: parsed.serverControl,
                        lineNumber: i,
                    });
                    break;
                case 'EXT-X-PART':
                    if (currentSegment) {
                        const partAttrs = parseAttributeList(tagValue);
                        currentSegment.parts.push({
                            ...partAttrs,
                            resolvedUri: new URL(String(partAttrs.URI), baseUrl)
                                .href,
                            lineNumber: i,
                        });
                    }
                    break;
                case 'EXT-X-PRELOAD-HINT':
                    parsed.preloadHints.push({
                        ...parseAttributeList(tagValue),
                        lineNumber: i,
                    });
                    parsed.tags.push({
                        name: tagName,
                        value: parsed.preloadHints.at(-1),
                        lineNumber: i,
                    });
                    break;
                case 'EXT-X-RENDITION-REPORT':
                    parsed.renditionReports.push({
                        ...parseAttributeList(tagValue),
                        lineNumber: i,
                    });
                    parsed.tags.push({
                        name: tagName,
                        value: parsed.renditionReports.at(-1),
                        lineNumber: i,
                    });
                    break;
                // --- Other Modern Tags ---
                case 'EXT-X-DEFINE': // Handled in pre-pass, but store it for inspection
                case 'EXT-X-SKIP':
                case 'EXT-X-CONTENT-STEERING':
                case 'EXT-X-DATERANGE':
                case 'EXT-X-SESSION-DATA':
                    parsed.tags.push({
                        name: tagName,
                        value: parseAttributeList(tagValue),
                        lineNumber: i,
                    });
                    break;
                default:
                    if (currentSegment) {
                        currentSegment.tags.push({
                            name: tagName,
                            value: tagValue,
                            lineNumber: i,
                        });
                    } else {
                        parsed.tags.push({
                            name: tagName,
                            value: tagValue,
                            lineNumber: i,
                        });
                    }
                    break;
            }
        } else if (!line.startsWith('#')) {
            if (currentSegment) {
                currentSegment.uri = line;
                currentSegment.resolvedUrl = new URL(line, baseUrl).href;
                currentSegment.uriLineNumber = i;
                parsed.segments.push(currentSegment);
                currentSegment = null;
            }
        }
    }

    const manifest = adaptHlsToIr(parsed);
    return { manifest, definedVariables, baseUrl };
}
