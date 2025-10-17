import { adaptHlsToIr } from './adapter.js';

/**
 * @typedef {import('@/types.ts').HlsSegment} HlsSegment
 * @typedef {import('@/types.ts').EncryptionInfo} EncryptionInfo
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
    /** @type {EncryptionInfo | null} */
    let currentEncryptionInfo = null;
    let currentBitrate = null;
    let discontinuity = false;
    let isGap = false;
    let currentByteRange = null;
    let lastSeenUri = null;

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

            // This is a temporary object to hold the parsed tag before it's pushed
            let currentTag = {
                name: tagName,
                value: null,
                lineNumber: i,
            };

            if (tagValue === null) {
                currentTag.value = null;
            } else if (tagValue.includes('=')) {
                currentTag.value = parseAttributeList(tagValue);
            } else {
                const parts = tagValue.split(',');
                currentTag.value =
                    parts.length > 1 && !isNaN(parseFloat(parts[0]))
                        ? tagValue
                        : !isNaN(parseFloat(tagValue))
                          ? parseFloat(tagValue)
                          : tagValue;
            }

            switch (tagName) {
                case 'EXT-X-STREAM-INF':
                    parsed.isMaster = true;
                    const attributes = parseAttributeList(tagValue);
                    const uri = lines[++i].trim();
                    lastSeenUri = uri;
                    parsed.variants.push({
                        attributes,
                        uri,
                        resolvedUri: new URL(uri, baseUrl).href,
                        lineNumber: i,
                    });
                    break;
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
                        repId: 'hls-media',
                        number: 0, // Placeholder, will be calculated from mediaSequence
                        uniqueId: '', // Placeholder, will be set when URI is parsed
                        resolvedUrl: '', // Placeholder
                        time: 0, // Placeholder, will be calculated from durations
                        timescale: 90000,
                        duration,
                        title: title || '',
                        tags: [],
                        flags: [],
                        parts: [],
                        bitrate: currentBitrate,
                        gap: false,
                        type: 'Media',
                        extinfLineNumber: i,
                        discontinuity,
                        encryptionInfo: currentEncryptionInfo,
                        byteRange: currentByteRange,
                    };
                    if (discontinuity) {
                        currentSegment.flags.push('discontinuity');
                    }
                    if (currentEncryptionInfo) {
                        currentSegment.flags.push('key-change');
                    }
                    discontinuity = false; // Consume the flag
                    break;
                }
                case 'EXT-X-BYTERANGE':
                    {
                        const [length, offset] = tagValue
                            .split('@')
                            .map((v) => parseInt(v, 10));
                        currentByteRange = { length, offset: offset || null };
                    }
                    break;
                case 'EXT-X-GAP':
                    isGap = true;
                    break;
                case 'EXT-X-DISCONTINUITY':
                    discontinuity = true;
                    break;
                case 'EXT-X-BITRATE':
                    currentBitrate = parseInt(tagValue, 10);
                    break;
                case 'EXT-X-KEY':
                    {
                        const keyAttributes = parseAttributeList(tagValue);
                        if (keyAttributes.METHOD === 'NONE') {
                            currentEncryptionInfo = null;
                        } else {
                            currentEncryptionInfo = {
                                method: /** @type {'AES-128'} */ (
                                    keyAttributes.METHOD
                                ),
                                uri: new URL(String(keyAttributes.URI), baseUrl)
                                    .href,
                                iv: String(keyAttributes.IV || null),
                                keyFormat: String(
                                    keyAttributes.KEYFORMAT || 'identity'
                                ),
                                keyFormatVersions: String(
                                    keyAttributes.KEYFORMATVERSIONS || '1'
                                ),
                            };
                        }
                    }
                    break;
                case 'EXT-X-MAP':
                    parsed.map = {
                        ...parseAttributeList(tagValue),
                        lineNumber: i,
                    };
                    break;
                case 'EXT-X-PROGRAM-DATE-TIME':
                    if (currentSegment) {
                        currentSegment.dateTime = tagValue;
                        currentSegment.flags.push('pdt');
                    }
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
                    break;
                case 'EXT-X-VERSION':
                    parsed.version = parseInt(tagValue, 10);
                    break;
                case 'EXT-X-PART-INF':
                    parsed.partInf = parseAttributeList(tagValue);
                    break;
                case 'EXT-X-SERVER-CONTROL':
                    parsed.serverControl = parseAttributeList(tagValue);
                    break;
                case 'EXT-X-PRELOAD-HINT':
                    parsed.preloadHints.push({
                        ...parseAttributeList(tagValue),
                        lineNumber: i,
                    });
                    break;
                case 'EXT-X-RENDITION-REPORT':
                    parsed.renditionReports.push({
                        ...parseAttributeList(tagValue),
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
                default:
                    // This is where unhandled tags are stored
                    break;
            }

            // Always add the raw tag to the tags array for full traceability
            if (currentSegment) {
                currentSegment.tags.push(currentTag);
            } else {
                parsed.tags.push(currentTag);
            }
        } else if (!line.startsWith('#')) {
            lastSeenUri = line;
            if (currentSegment) {
                currentSegment.uri = line;
                currentSegment.resolvedUrl = new URL(line, baseUrl).href;
                currentSegment.uriLineNumber = i;
                if (isGap) {
                    currentSegment.gap = true;
                    currentSegment.flags.push('gap');
                    isGap = false; // consume it
                }
                const rangeStr = currentSegment.byteRange
                    ? `@${currentSegment.byteRange.offset || 0}-${
                          currentSegment.byteRange.length
                      }`
                    : '';
                currentSegment.uniqueId = `${currentSegment.resolvedUrl}${rangeStr}`;
                parsed.segments.push(currentSegment);
                currentSegment = null;
                // ByteRange applies only to the next segment
                if (currentByteRange) {
                    currentByteRange = null;
                }
            }
        } else if (currentSegment && lastSeenUri) {
            // This is a byte-range segment without its own URI line
            currentSegment.uri = lastSeenUri;
            currentSegment.resolvedUrl = new URL(lastSeenUri, baseUrl).href;
            currentSegment.uriLineNumber = i; // Best guess
            const rangeStr = currentSegment.byteRange
                ? `@${currentSegment.byteRange.offset || 0}-${
                      currentSegment.byteRange.length
                  }`
                : '';
            currentSegment.uniqueId = `${currentSegment.resolvedUrl}${rangeStr}`;
            parsed.segments.push(currentSegment);
            currentSegment = null;
            if (currentByteRange) {
                currentByteRange = null;
            }
        }
    }

    const manifest = await adaptHlsToIr(parsed, context);
    return { manifest, definedVariables, baseUrl };
}
