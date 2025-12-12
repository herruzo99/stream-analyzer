// import { appLog } from '@/shared/utils/debug';
import { adaptHlsToIr } from './adapter.js';

export function parseAttributeList(attrString) {
    const attributes = {};
    let key = '';
    let value = '';
    let state = 'KEY'; // States: KEY, PRE_VALUE, VALUE_UNQUOTED, VALUE_QUOTED
    let i = 0;
    const len = attrString.length;

    while (i < len) {
        const char = attrString[i];

        switch (state) {
            case 'KEY':
                if (char === '=') {
                    state = 'PRE_VALUE';
                    key = key.trim();
                } else if (char === ',') {
                    if (key.trim()) {
                        attributes[key.trim()] = null;
                    }
                    key = '';
                } else {
                    key += char;
                }
                break;

            case 'PRE_VALUE':
                if (/\s/.test(char)) {
                    // Skip leading whitespace
                } else if (char === '"') {
                    state = 'VALUE_QUOTED';
                } else if (char === ',') {
                    attributes[key] = '';
                    key = '';
                    state = 'KEY';
                } else {
                    state = 'VALUE_UNQUOTED';
                    value += char;
                }
                break;

            case 'VALUE_QUOTED':
                if (char === '\\' && i + 1 < len) {
                    value += attrString[i + 1];
                    i++;
                } else if (char === '"') {
                    attributes[key] = value;
                    key = '';
                    value = '';
                    state = 'WAIT_COMMA';
                } else {
                    value += char;
                }
                break;

            case 'VALUE_UNQUOTED':
                if (char === ',') {
                    let finalValue = value.trim();
                    if (/^-?\d+(\.\d+)?$/.test(finalValue)) {
                        attributes[key] = parseFloat(finalValue);
                    } else {
                        attributes[key] = finalValue;
                    }
                    key = '';
                    value = '';
                    state = 'KEY';
                } else {
                    value += char;
                }
                break;

            case 'WAIT_COMMA':
                if (char === ',') {
                    state = 'KEY';
                }
                break;
        }
        i++;
    }

    if (state === 'VALUE_UNQUOTED' && key) {
        let finalValue = value.trim();
        if (/^-?\d+(\.\d+)?$/.test(finalValue)) {
            attributes[key] = parseFloat(finalValue);
        } else {
            attributes[key] = finalValue;
        }
    } else if (state === 'KEY' && key.trim()) {
        attributes[key.trim()] = null;
    }

    return /** @type {Record<string, string | number>} */ (attributes);
}

function resolveKeyUri(uri, baseUrl) {
    if (/^[a-z]+:/i.test(uri)) {
        return uri;
    }
    try {
        return new URL(uri, baseUrl).href;
    } catch (_e) {
        return uri;
    }
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
        return line.replace(/{\$[a-zA-Z0-9_-]+}/g, (match, offset, string) => {
            const varName = match.substring(2, match.length - 1);
            return variables.has(varName)
                ? variables.get(varName).value
                : match;
        });
    });

    return { substitutedLines, definedVariables: variables };
}

function finalizeCurrentSegment(
    segment,
    byteRange,
    uri,
    lastRangeState,
    baseUrl
) {
    if (!segment || !uri) {
        return { finalizedSegment: segment, nextRangeState: lastRangeState };
    }

    segment.uri = uri;
    segment.resolvedUrl = new URL(uri, baseUrl).href;

    let nextContinuationOffset = lastRangeState.end;
    if (segment.resolvedUrl !== lastRangeState.uri) {
        nextContinuationOffset = 0;
    }

    let newEndOffset = 0;

    if (byteRange) {
        let startOffset;
        if (byteRange.offset !== null) {
            startOffset = byteRange.offset;
        } else {
            startOffset = nextContinuationOffset;
        }

        segment.byteRange = {
            length: byteRange.length,
            offset: startOffset,
        };

        newEndOffset = startOffset + byteRange.length;
    } else {
        newEndOffset = 0;
    }

    if (segment.byteRange) {
        const start = segment.byteRange.offset;
        const end = start + segment.byteRange.length - 1;
        segment.uniqueId = `${segment.resolvedUrl}@media@${start}-${end}`;
    } else {
        segment.uniqueId = segment.resolvedUrl;
    }

    return {
        finalizedSegment: segment,
        nextRangeState: { uri: segment.resolvedUrl, end: newEndOffset },
    };
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
    const isLive = context?.isLive ?? false;

    const parsed = {
        isMaster: isMaster,
        version: 1,
        tags: [],
        segmentGroups: [[]],
        variants: [],
        iframeStreams: [],
        media: [],
        raw: manifestString,
        baseUrl: baseUrl,
        isLive: isLive,
        preloadHints: [],
        renditionReports: [],
        segments: [],
    };

    /** @type {import('@/types.js').HlsSegment | null} */
    let currentSegment = null;
    /** @type {import('@/types.js').EncryptionInfo | null} */
    let currentEncryptionInfo = null;

    /** @type {{ type: 'in' | 'out' | 'cont', duration?: number, elapsedTime?: number } | null} */
    let pendingCue = null;

    // ARCHITECTURAL FIX: pendingProgramDateTime to capture PDT before EXTINF
    let pendingProgramDateTime = null;

    let currentBitrate = null;
    let discontinuity = false;
    let isGap = false;
    let currentByteRange = null;
    let lastSeenUri = null;
    let lastRangeState = { uri: null, end: 0 };
    let cumulativeDuration = 0;

    for (let i = 0; i < lines.length; i++) {
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

            let currentTag = {
                name: tagName,
                value: null,
                lineNumber: i + 1,
            };

            // Enhanced Tag Value Parsing
            if (tagValue === null) {
                currentTag.value = null;
            } else {
                const isQuotedString =
                    tagValue.startsWith('"') && tagValue.endsWith('"');
                if (isQuotedString) {
                    currentTag.value = tagValue.substring(
                        1,
                        tagValue.length - 1
                    );
                } else if (tagValue.includes('=') && !tagValue.includes(',')) {
                    // Single Key=Value pairs or Special tags
                    if (
                        tagName === 'EXT-X-STREAM-INF' ||
                        tagName === 'EXT-X-I-FRAME-STREAM-INF' ||
                        tagName === 'EXT-X-MEDIA' ||
                        tagName === 'EXT-X-KEY' ||
                        tagName === 'EXT-X-SESSION-KEY' ||
                        tagName === 'EXT-X-CUE-OUT-CONT' // Force object parsing for this
                    ) {
                        currentTag.value = parseAttributeList(tagValue);
                    } else if (tagName === 'EXT-X-CUE-OUT') {
                        // CUE-OUT can be "DURATION=X" or just "X"
                        // We keep it as string/number for specific handling below, unless it clearly has equals
                        if (isNaN(parseFloat(tagValue))) {
                            currentTag.value = parseAttributeList(tagValue);
                        } else {
                            currentTag.value = parseFloat(tagValue);
                        }
                    } else {
                        const numValue = parseFloat(tagValue);
                        currentTag.value = !isNaN(numValue)
                            ? numValue
                            : tagValue;
                    }
                } else if (tagValue.includes('=')) {
                    currentTag.value = parseAttributeList(tagValue);
                } else {
                    const numValue = parseFloat(tagValue);
                    currentTag.value = !isNaN(numValue) ? numValue : tagValue;
                }
            }

            if (tagName === 'EXT-X-STREAM-INF') {
                const attributes = parseAttributeList(String(tagValue));
                let uri = '';
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine && !nextLine.startsWith('#')) {
                        uri = nextLine;
                        i = j;
                        break;
                    }
                }
                if (uri) {
                    const stableId =
                        attributes['STABLE-VARIANT-ID'] ||
                        attributes['NAME'] ||
                        `variant-${parsed.variants.length}`;

                    parsed.variants.push({
                        attributes,
                        uri,
                        resolvedUri: new URL(uri, baseUrl).href,
                        lineNumber: i,
                        stableId,
                    });
                }
                continue;
            }

            if (tagName === 'EXT-X-I-FRAME-STREAM-INF') {
                const attributes = parseAttributeList(String(tagValue));
                parsed.iframeStreams.push({
                    value: attributes,
                    resolvedUri: new URL(String(attributes.URI), baseUrl).href,
                    lineNumber: i + 1,
                });
                continue;
            }

            switch (tagName) {
                case 'EXTINF': {
                    if (currentSegment) {
                        const { finalizedSegment, nextRangeState } =
                            finalizeCurrentSegment(
                                currentSegment,
                                currentByteRange,
                                lastSeenUri,
                                lastRangeState,
                                baseUrl
                            );
                        parsed.segmentGroups[
                            parsed.segmentGroups.length - 1
                        ].push(finalizedSegment);
                        lastRangeState = nextRangeState;
                        cumulativeDuration += currentSegment.duration;
                    }

                    const [durationStr, title] = String(currentTag.value).split(
                        ','
                    );
                    currentSegment = {
                        repId: 'hls-media',
                        number: 0,
                        uniqueId: '',
                        resolvedUrl: '',
                        time: cumulativeDuration,
                        timescale: 1,
                        duration: parseFloat(durationStr),
                        title: title || '',
                        tags: [],
                        flags: [],
                        parts: [],
                        bitrate: currentBitrate,
                        gap: false,
                        type: 'Media',
                        extinfLineNumber: i + 1,
                        discontinuity,
                        encryptionInfo: currentEncryptionInfo,
                        byteRange: null,
                    };

                    if (discontinuity) {
                        currentSegment.flags.push('discontinuity');
                    }
                    if (currentEncryptionInfo) {
                        currentSegment.flags.push('key-change');
                    }

                    if (pendingCue) {
                        currentSegment.cue = pendingCue;
                        // Don't clear pendingCue if it's a CONT that implies state,
                        // but CUE-OUT usually applies to the immediate segment chain until CUE-IN.
                        // However, standard ad model attaches start event to start segment.
                        // We attach it here and clear.
                        pendingCue = null;
                    }

                    if (pendingProgramDateTime) {
                        currentSegment.dateTime = pendingProgramDateTime;
                        currentSegment.flags.push('pdt');
                        pendingProgramDateTime = null;
                    }

                    discontinuity = false;
                    break;
                }
                case 'EXT-X-CUE-OUT': {
                    let duration = 0;
                    // Robust handling: tagValue could be "30", "DURATION=30", or parsed object
                    if (
                        typeof currentTag.value === 'object' &&
                        currentTag.value !== null
                    ) {
                        if (currentTag.value.DURATION)
                            duration = parseFloat(currentTag.value.DURATION);
                    } else {
                        const val = String(tagValue);
                        if (val.includes('DURATION=')) {
                            const match = val.match(/DURATION=([\d.]+)/);
                            if (match) duration = parseFloat(match[1]);
                        } else if (!isNaN(parseFloat(val))) {
                            duration = parseFloat(val);
                        }
                    }

                    /** @type {{ type: 'out', duration: number }} */
                    const cueData = { type: 'out', duration };

                    if (currentSegment) {
                        currentSegment.cue = cueData;
                    } else {
                        pendingCue = cueData;
                    }
                    break;
                }
                case 'EXT-X-CUE-IN': {
                    /** @type {{ type: 'in' }} */
                    const cueData = { type: 'in' };
                    if (currentSegment) {
                        currentSegment.cue = cueData;
                    } else {
                        pendingCue = cueData;
                    }
                    break;
                }
                case 'EXT-X-CUE-OUT-CONT': {
                    // Robust CUE-OUT-CONT parsing
                    let duration = 0;
                    let elapsedTime = 0;
                    const attrs =
                        typeof currentTag.value === 'object'
                            ? currentTag.value
                            : parseAttributeList(String(tagValue));

                    // Normalize keys (spec is case-sensitive but real world varies)
                    if (attrs['Duration'] !== undefined)
                        duration = Number(attrs['Duration']);
                    else if (attrs['DURATION'] !== undefined)
                        duration = Number(attrs['DURATION']);

                    if (attrs['ElapsedTime'] !== undefined)
                        elapsedTime = Number(attrs['ElapsedTime']);
                    else if (attrs['ELAPSEDTIME'] !== undefined)
                        elapsedTime = Number(attrs['ELAPSEDTIME']);

                    /** @type {{ type: 'cont', duration: number, elapsedTime: number }} */
                    const cueData = { type: 'cont', duration, elapsedTime };

                    if (currentSegment) {
                        currentSegment.cue = cueData;
                    } else {
                        pendingCue = cueData;
                    }
                    break;
                }
                case 'EXT-X-MEDIA': {
                    const mediaAttrs = parseAttributeList(String(tagValue));
                    let resolvedMediaUri = '';
                    if (mediaAttrs.URI) {
                        resolvedMediaUri = new URL(
                            String(mediaAttrs.URI),
                            baseUrl
                        ).href;
                    }

                    parsed.media.push({
                        value: mediaAttrs,
                        resolvedUri: resolvedMediaUri,
                        lineNumber: i + 1,
                    });
                    break;
                }
                case 'EXT-X-BYTERANGE': {
                    const parts = String(tagValue).split('@');
                    const length = parseInt(parts[0], 10);
                    let offset = null;
                    if (parts.length > 1) {
                        offset = parseInt(parts[1], 10);
                    }
                    currentByteRange = { length, offset };
                    break;
                }
                case 'EXT-X-GAP':
                    isGap = true;
                    break;
                case 'EXT-X-DISCONTINUITY':
                    discontinuity = true;
                    lastRangeState = { uri: null, end: 0 };
                    if (
                        parsed.segmentGroups[parsed.segmentGroups.length - 1]
                            .length > 0
                    ) {
                        parsed.segmentGroups.push([]);
                    }
                    break;
                case 'EXT-X-BITRATE':
                    currentBitrate = parseInt(String(tagValue), 10);
                    break;
                case 'EXT-X-KEY': {
                    const keyAttributes = parseAttributeList(String(tagValue));
                    if (keyAttributes.METHOD === 'NONE') {
                        currentEncryptionInfo = null;
                    } else {
                        let keyUri = String(keyAttributes.URI);
                        let iv = String(keyAttributes.IV || null);
                        const lastColonIndex = keyUri.lastIndexOf(':');
                        if (
                            keyUri.startsWith('skd:') &&
                            lastColonIndex > 'skd://'.length
                        ) {
                            iv = '0x' + keyUri.substring(lastColonIndex + 1);
                            keyUri = keyUri.substring(0, lastColonIndex);
                        }
                        currentEncryptionInfo = {
                            method: /** @type {'AES-128' | 'SAMPLE-AES' | 'CENC' | 'NONE'} */ (
                                keyAttributes.METHOD
                            ),
                            uri: resolveKeyUri(keyUri, baseUrl),
                            iv: iv,
                            keyFormat: String(
                                keyAttributes.KEYFORMAT || 'identity'
                            ),
                            keyFormatVersions: String(
                                keyAttributes.KEYFORMATVERSIONS || '1'
                            ),
                        };
                    }
                    break;
                }
                case 'EXT-X-MAP': {
                    parsed.map = {
                        ...parseAttributeList(String(tagValue)),
                        lineNumber: i + 1,
                    };
                    const mapUri = parsed.map.URI;
                    const mapByteRangeStr = parsed.map.BYTERANGE;
                    if (mapUri && mapByteRangeStr) {
                        const [lengthStr, offsetStr] =
                            String(mapByteRangeStr).split('@');
                        const length = parseInt(lengthStr, 10);
                        const offset = parseInt(offsetStr, 10);

                        if (!isNaN(length) && !isNaN(offset)) {
                            const resolvedUrl = new URL(mapUri, baseUrl).href;
                            const uniqueId = `${resolvedUrl}@init@${offset}-${
                                offset + length - 1
                            }`;
                            /** @type {import('@/types.js').HlsSegment} */
                            const initSegment = {
                                repId: 'hls-media-init',
                                type: 'Init',
                                number: 0,
                                uniqueId,
                                resolvedUrl,
                                template: mapUri,
                                time: -1,
                                duration: 0,
                                timescale: 90000,
                                gap: false,
                                flags: [],
                                title: 'Initialization Segment',
                                tags: [currentTag],
                                parts: [],
                                bitrate: null,
                                byteRange: { length, offset },
                                encryptionInfo: currentEncryptionInfo,
                                extinfLineNumber: currentTag.lineNumber,
                                discontinuity: false,
                                uriLineNumber: currentTag.lineNumber,
                            };
                            parsed.segmentGroups[
                                parsed.segmentGroups.length - 1
                            ].push(initSegment);
                        }
                    }
                    break;
                }
                case 'EXT-X-PROGRAM-DATE-TIME':
                    // Capture PDT even if segment isn't open yet
                    if (currentSegment) {
                        currentSegment.dateTime = String(tagValue);
                        currentSegment.flags.push('pdt');
                    } else {
                        pendingProgramDateTime = String(tagValue);
                    }
                    break;
                case 'EXT-X-TARGETDURATION':
                    parsed.targetDuration = parseInt(String(tagValue), 10);
                    break;
                case 'EXT-X-MEDIA-SEQUENCE': {
                    const parsedSeq = parseInt(String(tagValue), 10);
                    parsed.mediaSequence = isNaN(parsedSeq) ? 0 : parsedSeq;
                    break;
                }
                case 'EXT-X-PLAYLIST-TYPE':
                    parsed.playlistType = String(tagValue);
                    break;
                case 'EXT-X-ENDLIST':
                    break;
                case 'EXT-X-VERSION':
                    parsed.version = parseInt(String(tagValue), 10);
                    break;
                case 'EXT-X-PART-INF':
                    parsed.partInf = parseAttributeList(String(tagValue));
                    break;
                case 'EXT-X-SERVER-CONTROL':
                    parsed.serverControl = parseAttributeList(String(tagValue));
                    break;
                case 'EXT-X-PRELOAD-HINT':
                    parsed.preloadHints.push({
                        ...parseAttributeList(String(tagValue)),
                        lineNumber: i + 1,
                    });
                    break;
                case 'EXT-X-RENDITION-REPORT':
                    parsed.renditionReports.push({
                        ...parseAttributeList(String(tagValue)),
                        lineNumber: i + 1,
                    });
                    break;
                case 'EXT-X-PART':
                    if (currentSegment) {
                        const partAttrs = parseAttributeList(String(tagValue));
                        currentSegment.parts.push({
                            ...partAttrs,
                            resolvedUri: new URL(String(partAttrs.URI), baseUrl)
                                .href,
                            lineNumber: i + 1,
                        });
                    }
                    break;
            }

            if (currentSegment) {
                currentSegment.tags.push(currentTag);
            } else {
                parsed.tags.push(currentTag);
            }
        } else if (!line.startsWith('#')) {
            lastSeenUri = line;
            if (currentSegment) {
                currentSegment.uriLineNumber = i + 1;
                if (isGap) {
                    currentSegment.gap = true;
                    currentSegment.flags.push('gap');
                }
                const { finalizedSegment, nextRangeState } =
                    finalizeCurrentSegment(
                        currentSegment,
                        currentByteRange,
                        lastSeenUri,
                        lastRangeState,
                        baseUrl
                    );
                parsed.segmentGroups[parsed.segmentGroups.length - 1].push(
                    finalizedSegment
                );
                lastRangeState = nextRangeState;
                cumulativeDuration += currentSegment.duration;
                currentSegment = null;
                isGap = false;
            }
        }
    }

    if (currentSegment) {
        const { finalizedSegment, _nextRangeState } = finalizeCurrentSegment(
            currentSegment,
            currentByteRange,
            lastSeenUri,
            lastRangeState,
            baseUrl
        );
        parsed.segmentGroups[parsed.segmentGroups.length - 1].push(
            finalizedSegment
        );
    }

    parsed.segments = parsed.segmentGroups.flat();

    const startSeq =
        typeof parsed.mediaSequence === 'number' && !isNaN(parsed.mediaSequence)
            ? parsed.mediaSequence
            : 0;

    parsed.segments.forEach((seg, index) => {
        if (seg.type === 'Media') {
            seg.number = startSeq + index;
        }
    });

    const manifest = await adaptHlsToIr(parsed, context);
    return { manifest, definedVariables, baseUrl };
}
