/**
 * heuristic to determine what "kind" of update this was.
 */
function determineUpdateType(update, prevUpdate) {
    if (!prevUpdate)
        return { type: 'init', label: 'Initial Load', icon: 'play' };

    const tags = [];

    // Check for Errors/Warnings
    const errors =
        update.complianceResults?.filter((r) => r.status === 'fail').length ||
        0;
    const warns =
        update.complianceResults?.filter((r) => r.status === 'warn').length ||
        0;

    if (errors > 0)
        return {
            type: 'error',
            label: `${errors} Errors`,
            icon: 'alertTriangle',
            color: 'text-red-500',
        };
    if (warns > 0 && !prevUpdate.hasNewIssues)
        tags.push({ label: 'Warning', color: 'text-amber-500' });

    // Check Diff Semantics
    const { additions, removals, modifications } = update.changes;
    const totalChanges = additions + removals + modifications;

    if (totalChanges === 0) {
        return {
            type: 'idle',
            label: 'No Changes',
            icon: 'moon',
            color: 'text-slate-600',
        };
    }

    // Ad Detection (Naive heuristic based on string content or period count)
    // Real impl would check the IR, but raw text regex is faster for this view model
    if (
        update.rawManifest.includes('SCTE35') &&
        !prevUpdate.rawManifest.includes('SCTE35')
    ) {
        return {
            type: 'ad',
            label: 'SCTE-35 Signal',
            icon: 'advertising',
            color: 'text-purple-400',
        };
    }

    if (additions > 10)
        return {
            type: 'major',
            label: 'Major Update',
            icon: 'gitMerge',
            color: 'text-blue-400',
        };

    return {
        type: 'update',
        label: `Refreshed`,
        icon: 'refresh',
        color: 'text-slate-400',
    };
}

export function createManifestUpdatesViewModel(stream) {
    // Handle HLS/DASH Context
    const activePlaylistKey =
        stream.activeMediaPlaylistId ||
        (stream.protocol === 'hls' ? 'master' : null);

    let updates = [];
    let activeUpdateId = null;

    if (stream.protocol === 'hls' && activePlaylistKey) {
        const playlistData = stream.mediaPlaylists.get(activePlaylistKey);
        updates = playlistData?.updates || [];
        activeUpdateId = playlistData?.activeUpdateId;
    } else {
        updates = stream.manifestUpdates || [];
        activeUpdateId = stream.activeManifestUpdateId;
    }

    // Fallback: If no active update is selected but we have updates, select the latest one.
    if (!activeUpdateId && updates.length > 0) {
        activeUpdateId = updates[0].id;
    }

    // Sort: Newest first for the feed logic, but we usually store them newest first in store anyway.
    // Let's ensure consistency.
    const sortedUpdates = [...updates];

    // Enrich updates with semantic info
    const enrichedUpdates = sortedUpdates.map((u, i) => {
        // prev is i+1 because list is desc
        const prev = sortedUpdates[i + 1] || null;
        const meta = determineUpdateType(u, prev);

        // Calculate Interval delay
        let drift = 0;
        if (prev) {
            const currTime = new Date('1970-01-01T' + u.timestamp).getTime();
            const prevTime = new Date('1970-01-01T' + prev.timestamp).getTime();
            drift = currTime - prevTime;
        }

        return {
            ...u,
            meta,
            metrics: {
                intervalMs: drift,
                changeCount:
                    u.changes.additions +
                    u.changes.removals +
                    u.changes.modifications,
            },
        };
    });

    const activeUpdate =
        enrichedUpdates.find((u) => u.id === activeUpdateId) ||
        enrichedUpdates[0] ||
        null;

    // Chart Data: Limit to last 50 points for sparklines, reverse for time-axis (old -> new)
    const chartData = [...enrichedUpdates]
        .reverse()
        .slice(-50)
        .map((u) => ({
            timestamp: u.timestamp,
            changes: u.metrics.changeCount,
            interval: u.metrics.intervalMs,
        }));

    return {
        stream,
        updates: enrichedUpdates,
        activeUpdate,
        chartData,
        stats: {
            count: updates.length,
            avgInterval: chartData.length
                ? (
                      chartData.reduce((a, b) => a + b.interval, 0) /
                      chartData.length
                  ).toFixed(0)
                : 0,
            lastUpdate: updates[0]?.timestamp || 'N/A',
        },
        isLive: stream.manifest?.type === 'dynamic',
    };
}
