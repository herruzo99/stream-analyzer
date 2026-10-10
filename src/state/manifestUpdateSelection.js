/**
 * Resolve which history owns an update before mutating selection state.
 * An empty active HLS playlist must not capture a DASH/direct-HLS history selection.
 *
 * @param {object} stream
 * @param {string} updateId
 * @returns {{ kind: 'playlist', playlistId: string } | { kind: 'manifest' } | { kind: 'none' }}
 */
export function resolveManifestUpdateSelection(stream, updateId) {
    const playlistId = Array.from(stream.mediaPlaylists?.entries?.() || []).find(
        ([, playlist]) =>
            (playlist?.updates || []).some((update) => update.id === updateId)
    )?.[0];
    if (playlistId) return { kind: 'playlist', playlistId };
    if ((stream.manifestUpdates || []).some((update) => update.id === updateId)) {
        return { kind: 'manifest' };
    }
    return { kind: 'none' };
}
