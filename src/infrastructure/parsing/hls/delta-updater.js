/**
 * Applies a delta update to an old HLS playlist object.
 * @param {object} oldParsedHls The fully parsed object of the previous manifest.
 * @param {object} deltaParsedHls The fully parsed object of the new delta update manifest.
 * @returns {object} A new, fully resolved parsed HLS object.
 */
export function applyDeltaUpdate(oldParsedHls, deltaParsedHls) {
    const skipTag = deltaParsedHls.tags.find((t) => t.name === 'EXT-X-SKIP');
    if (!skipTag) {
        return deltaParsedHls;
    }

    const skippedSegments = skipTag.value['SKIPPED-SEGMENTS'];

    const resolvedHls = JSON.parse(JSON.stringify(oldParsedHls));

    resolvedHls.mediaSequence = deltaParsedHls.mediaSequence;
    resolvedHls.discontinuitySequence = deltaParsedHls.discontinuitySequence;
    resolvedHls.playlistType = deltaParsedHls.playlistType;

    const oldSegmentCount = resolvedHls.segments.length;
    resolvedHls.segments = resolvedHls.segments.slice(
        oldSegmentCount - (oldSegmentCount - skippedSegments)
    );

    resolvedHls.segments.push(...deltaParsedHls.segments);

    resolvedHls.tags = deltaParsedHls.tags.filter(
        (t) => t.name !== 'EXT-X-SKIP'
    );

    resolvedHls.targetDuration = deltaParsedHls.targetDuration;
    resolvedHls.partInf = deltaParsedHls.partInf;
    resolvedHls.serverControl = deltaParsedHls.serverControl;
    resolvedHls.isLive = deltaParsedHls.isLive;

    return resolvedHls;
}

/**
 * Serializes a parsed HLS object back into a manifest string.
 * @param {object} parsedHls The parsed HLS object.
 * @returns {string} The manifest string.
 */
export function serializeHls(parsedHls) {
    const lines = ['#EXTM3U'];
    if (parsedHls.version > 1) {
        lines.push(`#EXT-X-VERSION:${parsedHls.version}`);
    }
    if (parsedHls.targetDuration) {
        lines.push(`#EXT-X-TARGETDURATION:${parsedHls.targetDuration}`);
    }
    if (parsedHls.mediaSequence) {
        lines.push(`#EXT-X-MEDIA-SEQUENCE:${parsedHls.mediaSequence}`);
    }
    if (parsedHls.partInf) {
        lines.push(
            `#EXT-X-PART-INF:PART-TARGET=${parsedHls.partInf['PART-TARGET']}`
        );
    }
    if (parsedHls.serverControl) {
        const attrs = Object.entries(parsedHls.serverControl)
            .map(([k, v]) => `${k}=${v}`)
            .join(',');
        lines.push(`#EXT-X-SERVER-CONTROL:${attrs}`);
    }

    let lastKey = null;

    parsedHls.segments.forEach((segment) => {
        if (segment.discontinuity) {
            lines.push('#EXT-X-DISCONTINUITY');
        }
        if (
            segment.key &&
            JSON.stringify(segment.key) !== JSON.stringify(lastKey)
        ) {
            const attrs = Object.entries(segment.key)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',');
            lines.push(`#EXT-X-KEY:${attrs}`);
            lastKey = segment.key;
        }
        if (segment.dateTime) {
            lines.push(`#EXT-X-PROGRAM-DATE-TIME:${segment.dateTime}`);
        }
        lines.push(
            `#EXTINF:${segment.duration.toFixed(5)},${segment.title || ''}`
        );
        if (segment.uri) {
            lines.push(segment.uri);
        }
        segment.parts.forEach((part) => {
            const attrs = Object.entries(part)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',');
            lines.push(`#EXT-X-PART:${attrs}`);
        });
    });

    if (!parsedHls.isLive) {
        lines.push('#EXT-X-ENDLIST');
    }

    return lines.join('\n');
}