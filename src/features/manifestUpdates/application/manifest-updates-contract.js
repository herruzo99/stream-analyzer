export const MANIFEST_UPDATES_LIMITS = Object.freeze({
    history: 100,
    diffRows: 2000,
    lineCharacters: 500,
    copyCharacters: 256 * 1024,
    labelCharacters: 120,
});

/**
 * @param {unknown} value
 * @param {number} [limit]
 */
const safeText = (value, limit = MANIFEST_UPDATES_LIMITS.labelCharacters) =>
    String(value ?? '').slice(0, limit);

function getHistory(stream) {
    const playlistEntries = Array.from(stream.mediaPlaylists?.entries?.() || []);
    const populatedPlaylist = playlistEntries.find(
        ([, playlist]) => (playlist?.updates?.length || 0) > 0
    );
    const firstPlaylistId = populatedPlaylist?.[0] || playlistEntries[0]?.[0];
    const activePlaylist = stream.mediaPlaylists?.get?.(
        stream.activeMediaPlaylistId
    );
    const playlistId =
        ((activePlaylist?.updates?.length || 0) > 0
            ? stream.activeMediaPlaylistId
            : firstPlaylistId) ||
        (stream.mediaPlaylists?.has?.('master') ? 'master' : null);
    if (stream.protocol === 'hls' && playlistId) {
        const playlist = stream.mediaPlaylists?.get(playlistId);
        if ((playlist?.updates?.length || 0) > 0) {
            return {
                updates: playlist.updates,
                selectedId: playlist.activeUpdateId || null,
            };
        }
    }
    return {
        updates: stream.manifestUpdates || [],
        selectedId: stream.activeManifestUpdateId || null,
    };
}

function lineText(line) {
    const content = Array.isArray(line?.parts)
        ? line.parts.map((part) => part?.value || '').join('')
        : line?.content || '';
    return safeText(
        `${line?.indentation || ''}${content}`,
        MANIFEST_UPDATES_LIMITS.lineCharacters
    );
}

function createDiffRows(update) {
    const source = Array.isArray(update?.diffModel) ? update.diffModel : [];
    return source.slice(0, MANIFEST_UPDATES_LIMITS.diffRows).map((line, index) => {
        const kind = ['added', 'removed', 'modified'].includes(line?.type)
            ? line.type
            : 'unchanged';
        return {
            id: `sa-manifest-diff:v1:${safeText(update.id, 180)}:${index}`,
            kind,
            marker:
                kind === 'added'
                    ? '+'
                    : kind === 'removed'
                      ? '-'
                      : kind === 'modified'
                        ? '~'
                        : ' ',
            label:
                kind === 'added'
                    ? 'Added line'
                    : kind === 'removed'
                      ? 'Removed line'
                      : kind === 'modified'
                        ? 'Modified line'
                        : 'Unchanged line',
            text: lineText(line),
        };
    });
}

function createStatus(stream, now) {
    const source = stream.pollingStatus || {};
    const lastSuccessAt = Number.isFinite(source.lastSuccessAt)
        ? source.lastSuccessAt
        : null;
    const staleAfter = Math.max(
        30_000,
        Number(stream.smartPollingInterval || 0) * 3
    );
    const stale =
        stream.isPolling === true &&
        lastSuccessAt !== null &&
        now - lastSuccessAt > staleAfter;
    let state = safeText(source.state || '', 24);
    if (stream.manifest?.type !== 'dynamic') state = 'vod';
    else if (stream.isPolling !== true && state !== 'canceled') state = 'paused';
    else if (stale && !['offline', 'retrying'].includes(state)) state = 'stale';
    else if (!state) state = stream.isPolling ? 'active' : 'paused';

    const labels = {
        active: 'Monitoring active',
        checking: 'Checking now',
        retrying: 'Retry scheduled',
        offline: 'Browser offline',
        stale: 'Updates stale',
        canceled: 'Polling canceled',
        paused: 'Polling paused',
        vod: 'On-demand manifest',
    };
    return {
        state,
        label: labels[state] || 'Polling state unavailable',
        message: safeText(source.message || labels[state] || '', 180),
        lastSuccessAt,
        nextPollAt: Number.isFinite(source.nextPollAt)
            ? source.nextPollAt
            : null,
        retryCount: Math.max(0, Math.min(8, Number(source.retryCount) || 0)),
    };
}

export function createManifestUpdatesModel(stream, options = {}) {
    const now = Number.isFinite(options.now) ? options.now : Date.now();
    const { updates, selectedId } = getHistory(stream);
    const bounded = updates.slice(0, MANIFEST_UPDATES_LIMITS.history).map((update) => ({
        id: safeText(update.id, 180),
        sequenceNumber: Number.isFinite(update.sequenceNumber)
            ? update.sequenceNumber
            : null,
        endSequenceNumber: Number.isFinite(update.endSequenceNumber)
            ? update.endSequenceNumber
            : null,
        timestamp: safeText(update.timestamp || 'Unknown time', 48),
        changes: {
            additions: Math.max(0, Number(update.changes?.additions) || 0),
            removals: Math.max(0, Number(update.changes?.removals) || 0),
            modifications: Math.max(0, Number(update.changes?.modifications) || 0),
        },
        rawManifest: safeText(
            update.rawManifest,
            MANIFEST_UPDATES_LIMITS.copyCharacters
        ),
        diffRows: createDiffRows(update),
        diffTruncated:
            Array.isArray(update.diffModel) &&
            update.diffModel.length > MANIFEST_UPDATES_LIMITS.diffRows,
    }));
    const selected =
        bounded.find((update) => update.id === selectedId) || bounded[0] || null;
    return {
        streamId: stream.id,
        streamName: safeText(stream.name || 'Active stream'),
        status: createStatus(stream, now),
        updates: bounded,
        selected,
        historyTruncated: updates.length > MANIFEST_UPDATES_LIMITS.history,
    };
}
