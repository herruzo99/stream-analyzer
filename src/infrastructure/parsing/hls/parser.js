import { adaptHlsToIr } from './adapter.js';

/**
 * @typedef {object} HlsSegment
 * @property {number} duration
 * @property {string} title
 * @property {any[]} tags
 * @property {string[]} flags
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

function parseAttributeList(attrString) {
    /** @type {Record<string, string | number>} */
    const attributes = {};
    const regex = /([A-Z0-9-]+)=("[^"]*"|[^,]+)/g;
    let match;

    while ((match = regex.exec(attrString)) !== null) {
        const key = match[1];
        let value = match[2];

        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
        }

        const numValue = /^-?\d+(\.\d+)?$/.test(value)
            ? parseFloat(value)
            : value;
        attributes[key] = numValue;
    }
    return attributes;
}

function applyVariableSubstitution(
    lines,
    playlistUrl,
    parentVariables = new Map()
) {
    const variables = new Map(parentVariables);
    const urlParams = new URL(playlistUrl).searchParams;

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

export async function parseManifest(
    manifestString,
    baseUrl,
    parentVariables,
    context
) {
    let linesForParsing = manifestString.split(/\r?\n/);

    if (!manifestString.trim().startsWith('#EXTM3U')) {
        const newLines = [].concat(linesForParsing);
        newLines.unshift('#EXTM3U');
        linesForParsing = newLines;
    }

    const { substitutedLines: lines, definedVariables } =
        applyVariableSubstitution(linesForParsing, baseUrl, parentVariables);

    const isMaster = lines.some((line) => line.startsWith('#EXT-X-STREAM-INF'));
    let isLive = !lines.some((line) => line.startsWith('#EXT-X-ENDLIST'));

    const parsed = {
        isMaster: isMaster,
        version: 1,
        tags: [],
        segments: [],
        variants: [],
        media: [],
        raw: manifestString,
        baseUrl: baseUrl,
        isLive: isLive,
        preloadHints: [],
        renditionReports: [],
    };

    /** @type {HlsSegment | null} */
    let currentSegment = null;
    let currentKey = null;
    let currentBitrate = null;
    let discontinuity = false;
    let isGap = false;
    let keyChangeNextSegment = false;

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
                        flags: [],
                        key: currentKey,
                        parts: [],
                        bitrate: currentBitrate,
                        gap: false,
                        type: 'Media',
                        extinfLineNumber: i,
                        discontinuity,
                    };
                    if (discontinuity) {
                        currentSegment.flags.push('discontinuity');
                    }
                    if (keyChangeNextSegment) {
                        currentSegment.flags.push('key-change');
                        keyChangeNextSegment = false;
                    }
                    discontinuity = false; // Consume the flag
                    break;
                }
                case 'EXT-X-GAP':
                    isGap = true;
                    break;
                case 'EXT-X-DISCONTINUITY':
                    discontinuity = true;
                    break;
                case 'EXT-X-BITRATE':
                    currentBitrate = parseInt(tagValue, 10);
                    break;
                case 'EXT-X-KEY': {
                    const keyAttributes = parseAttributeList(tagValue);
                    currentKey = keyAttributes;
                    if (keyAttributes.METHOD === 'NONE') {
                        currentKey = null;
                    }
                    keyChangeNextSegment = true;
                    // Fallthrough to add to tags array
                }
                // eslint-disable-next-line no-fallthrough
                case 'EXT-X-MAP':
                    parsed.map = {
                        ...parseAttributeList(tagValue),
                        lineNumber: i,
                    };
                // Fallthrough
                // eslint-disable-next-line no-fallthrough
                case 'EXT-X-PROGRAM-DATE-TIME':
                    if (currentSegment) {
                        currentSegment.dateTime = tagValue;
                        currentSegment.flags.push('pdt');
                    }
                // Fallthrough
                // eslint-disable-next-line no-fallthrough
                case 'EXT-X-TARGETDURATION':
                    parsed.targetDuration = parseInt(tagValue, 10);
                // Fallthrough
                // eslint-disable-next-line no-fallthrough
                case 'EXT-X-MEDIA-SEQUENCE':
                    parsed.mediaSequence = parseInt(tagValue, 10);
                // Fallthrough
                // eslint-disable-next-line no-fallthrough
                case 'EXT-X-PLAYLIST-TYPE':
                    parsed.playlistType = tagValue;
                    if (tagValue === 'VOD') {
                        parsed.isLive = false;
                    } else if (tagValue === 'EVENT') {
                        parsed.isLive = true;
                    }
                // Fallthrough
                // eslint-disable-next-line no-fallthrough
                case 'EXT-X-ENDLIST':
                    if (tagName === 'EXT-X-ENDLIST') parsed.isLive = false;
                // Fallthrough
                // eslint-disable-next-line no-fallthrough
                case 'EXT-X-VERSION':
                    if (tagName === 'EXT-X-VERSION')
                        parsed.version = parseInt(tagValue, 10);
                // Fallthrough
                // eslint-disable-next-line no-fallthrough
                case 'EXT-X-PART-INF':
                    if (tagName === 'EXT-X-PART-INF')
                        parsed.partInf = parseAttributeList(tagValue);
                // Fallthrough
                // eslint-disable-next-line no-fallthrough
                case 'EXT-X-SERVER-CONTROL':
                    if (tagName === 'EXT-X-SERVER-CONTROL')
                        parsed.serverControl = parseAttributeList(tagValue);
                // Fallthrough
                // eslint-disable-next-line no-fallthrough
                case 'EXT-X-PRELOAD-HINT': {
                    if (tagName === 'EXT-X-PRELOAD-HINT') {
                        parsed.preloadHints.push({
                            ...parseAttributeList(tagValue),
                            lineNumber: i,
                        });
                    }
                    // Fallthrough
                }
                // eslint-disable-next-line no-fallthrough
                case 'EXT-X-RENDITION-REPORT': {
                    if (tagName === 'EXT-X-RENDITION-REPORT') {
                        parsed.renditionReports.push({
                            ...parseAttributeList(tagValue),
                            lineNumber: i,
                        });
                    }
                    // Fallthrough
                }
                // eslint-disable-next-line no-fallthrough
                case 'EXT-X-PART':
                    if (tagName === 'EXT-X-PART' && currentSegment) {
                        const partAttrs = parseAttributeList(tagValue);
                        currentSegment.parts.push({
                            ...partAttrs,
                            resolvedUri: new URL(String(partAttrs.URI), baseUrl)
                                .href,
                            lineNumber: i,
                        });
                    }
                // Fallthrough
                // eslint-disable-next-line no-fallthrough
                default: {
                    let value;
                    if (tagValue === null) {
                        value = null;
                    } else if (tagValue.includes('=')) {
                        value = parseAttributeList(tagValue);
                    } else {
                        // Check if it's a number after splitting by comma
                        const parts = tagValue.split(',');
                        value =
                            parts.length > 1 && !isNaN(parseFloat(parts[0]))
                                ? tagValue // Keep comma-separated values as string for now
                                : !isNaN(parseFloat(tagValue))
                                  ? parseFloat(tagValue)
                                  : tagValue;
                    }

                    if (currentSegment) {
                        currentSegment.tags.push({
                            name: tagName,
                            value,
                            lineNumber: i,
                        });
                    } else {
                        parsed.tags.push({
                            name: tagName,
                            value,
                            lineNumber: i,
                        });
                    }
                    break;
                }
            }
        } else if (!line.startsWith('#')) {
            if (currentSegment) {
                currentSegment.uri = line;
                currentSegment.resolvedUrl = new URL(line, baseUrl).href;
                currentSegment.uriLineNumber = i;
                if (isGap) {
                    currentSegment.gap = true;
                    currentSegment.flags.push('gap');
                    isGap = false; // consume it
                }
                parsed.segments.push(currentSegment);
                currentSegment = null;
            }
        }
    }

    const manifest = await adaptHlsToIr(parsed, context);
    return { manifest, definedVariables, baseUrl };
}