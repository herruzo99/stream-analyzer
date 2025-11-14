/**
 * Applies a delta update to an old HLS playlist object.
 * @param {object} oldParsedHls The fully parsed object of the previous manifest.
 * @param {object} deltaParsedHls The fully parsed object of the new delta update manifest.
 * @returns {object} A new, fully resolved parsed HLS object.
 */
export function applyDeltaUpdate(oldParsedHls, deltaParsedHls) {
    const skipTag = deltaParsedHls.tags.find((t) => t.name === 'EXT-X-SKIP');
    if (!skipTag) {
        // This isn't a delta update, just return the new manifest as-is.
        return deltaParsedHls;
    }

    const skippedSegments = skipTag.value['SKIPPED-SEGMENTS'];

    // Create a deep copy to avoid mutating the old state directly.
    const resolvedHls = JSON.parse(JSON.stringify(oldParsedHls));

    // Update top-level properties from the delta manifest.
    resolvedHls.mediaSequence = deltaParsedHls.mediaSequence;
    resolvedHls.discontinuitySequence = deltaParsedHls.discontinuitySequence;
    resolvedHls.playlistType = deltaParsedHls.playlistType;
    resolvedHls.version = Math.max(resolvedHls.version, deltaParsedHls.version);
    resolvedHls.targetDuration = deltaParsedHls.targetDuration;
    resolvedHls.partInf = deltaParsedHls.partInf;
    resolvedHls.serverControl = deltaParsedHls.serverControl;
    resolvedHls.isLive = deltaParsedHls.isLive;

    // Remove the skipped segments from the end of the old segment list.
    const oldSegmentCount = resolvedHls.segments.length;
    resolvedHls.segments = resolvedHls.segments.slice(skippedSegments);

    // Append the new segments from the delta manifest.
    resolvedHls.segments.push(...deltaParsedHls.segments);

    // Replace the tags with the new set from the delta manifest, excluding the SKIP tag.
    resolvedHls.tags = deltaParsedHls.tags.filter(
        (t) => t.name !== 'EXT-X-SKIP'
    );

    // Also update other arrays that might be present in a delta update
    resolvedHls.preloadHints = deltaParsedHls.preloadHints;
    resolvedHls.renditionReports = deltaParsedHls.renditionReports;


    return resolvedHls;
}