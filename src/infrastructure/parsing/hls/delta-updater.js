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
