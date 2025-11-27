import { findChildrenRecursive } from '@/infrastructure/parsing/utils/recursive-parser.js';

/**
 * Helper to create a metric object with visual status cues.
 */
const m = (
    name,
    value,
    unit = '',
    icon = 'hash',
    status = 'neutral',
    tooltip = ''
) => ({
    name,
    value,
    unit,
    icon,
    status,
    tooltip,
});

/**
 * Formatting Helper
 */
const fmtNum = (val, decimals = 2) =>
    val !== null && val !== undefined && !isNaN(val)
        ? val.toFixed(decimals)
        : 'N/A';

/**
 * Normalizes time values to be relative to a display start time.
 * Defines the items strictly before return to avoid TDZ issues.
 */
function normalizeTrackItems(items, timeOffset) {
    if (!items) return [];
    return items.map((item) => {
        const newStart = Math.max(0, item.start - timeOffset);
        const newEnd = Math.max(0, item.end - timeOffset);
        return {
            ...item,
            originalStart: item.start,
            originalEnd: item.end,
            start: newStart,
            end: newEnd,
        };
    });
}

/**
 * Generates Insights derived from DASH structure.
 */
function getDashInsights(stream) {
    const manifest = stream.manifest;
    const isLive = manifest.type === 'dynamic';
    const insights = [];

    // 1. Synchronization Health
    const utcTiming = findChildrenRecursive(
        manifest.serializedManifest,
        'UTCTiming'
    );
    if (isLive) {
        if (utcTiming.length > 0) {
            insights.push(
                m(
                    'Clock Sync',
                    'Enabled',
                    '',
                    'clock',
                    'success',
                    'UTCTiming element present.'
                )
            );
        } else {
            insights.push(
                m(
                    'Clock Sync',
                    'Missing',
                    '',
                    'alertTriangle',
                    'warning',
                    'No UTCTiming. Drift likely.'
                )
            );
        }
    }

    // 2. Redundancy
    const baseUrls = findChildrenRecursive(
        manifest.serializedManifest,
        'BaseURL'
    );
    if (baseUrls.length > 1) {
        insights.push(
            m(
                'Redundancy',
                `${baseUrls.length} Sources`,
                '',
                'server',
                'success',
                'Multiple BaseURLs detected.'
            )
        );
    } else {
        insights.push(
            m(
                'Redundancy',
                'Single',
                '',
                'server',
                'neutral',
                'Single BaseURL source.'
            )
        );
    }

    // 3. Switching
    let alignedCount = 0;
    let unalignedCount = 0;
    manifest.periods.forEach((p) => {
        p.adaptationSets.forEach((as) => {
            if (as.segmentAlignment) alignedCount++;
            else unalignedCount++;
        });
    });
    if (unalignedCount === 0 && alignedCount > 0) {
        insights.push(
            m(
                'Switching',
                'Aligned',
                '',
                'layers',
                'success',
                'All AdaptationSets are segment aligned.'
            )
        );
    }

    return { title: 'Stream Health', metrics: insights };
}

function getDashTimingMetrics(stream) {
    const manifest = stream.manifest;
    const isLive = manifest.type === 'dynamic';

    const metrics = [
        m('Min Buffer', manifest.minBufferTime, 's', 'buffer'),
        m('Max Seg Dur', manifest.maxSegmentDuration, 's', 'clock'),
    ];

    if (isLive) {
        const depth = manifest.timeShiftBufferDepth;
        metrics.push(
            m(
                'DVR Window',
                depth ? depth : '∞',
                's',
                'history',
                depth && depth < 60 ? 'warning' : 'neutral'
            )
        );
        metrics.push(
            m('Update Freq', manifest.minimumUpdatePeriod, 's', 'refresh')
        );
        metrics.push(
            m('Delay', manifest.suggestedPresentationDelay, 's', 'timer')
        );
    } else {
        metrics.push(m('Duration', manifest.duration, 's', 'film'));
    }

    return { title: 'Timing Config', metrics };
}

/**
 * Generates Insights derived from HLS structure.
 */
function getHlsInsights(stream) {
    const manifest = stream.manifest;
    const summary = manifest.summary?.hls || {};
    const insights = [];

    // 1. Delivery Efficiency
    if (summary.targetDuration) {
        const avgDur =
            summary.mediaPlaylistDetails?.averageSegmentDuration ||
            summary.targetDuration;
        const overhead = summary.targetDuration - avgDur;
        if (overhead > 1.5) {
            insights.push(
                m(
                    'Efficiency',
                    'Low',
                    '',
                    'percent',
                    'warning',
                    `TargetDuration is much larger than Avg Segment.`
                )
            );
        } else {
            insights.push(
                m(
                    'Efficiency',
                    'Good',
                    '',
                    'percent',
                    'success',
                    'TargetDuration matches segment durations.'
                )
            );
        }
    }

    // 2. Trick Play
    if (summary.iFramePlaylists > 0) {
        insights.push(
            m(
                'Trick Play',
                'Supported',
                '',
                'image',
                'success',
                `${summary.iFramePlaylists} I-Frame playlists found.`
            )
        );
    } else {
        insights.push(
            m(
                'Trick Play',
                'None',
                '',
                'image',
                'neutral',
                'No I-Frame playlists detected.'
            )
        );
    }

    // 3. Low Latency
    if (manifest.partInf) {
        insights.push(
            m(
                'Mode',
                'LL-HLS',
                '',
                'zap',
                'success',
                'Low-Latency HLS features detected.'
            )
        );
    } else {
        insights.push(
            m('Mode', 'Standard', '', 'clock', 'neutral', 'Standard HLS.')
        );
    }

    return { title: 'Stream Health', metrics: insights };
}

function getHlsTimingMetrics(stream) {
    const manifest = stream.manifest;
    const summary = manifest.summary?.hls || {};
    const isLive = manifest.type === 'dynamic';

    const metrics = [
        m('Target Dur', summary.targetDuration, 's', 'clock'),
        m('Version', summary.version, '', 'tag'),
    ];

    if (isLive) {
        metrics.push(
            m(
                'DVR Window',
                summary.dvrWindow ? fmtNum(summary.dvrWindow, 0) : 'N/A',
                's',
                'history'
            )
        );
        if (manifest.partInf)
            metrics.push(
                m('Part Target', manifest.partInf['PART-TARGET'], 's', 'zap')
            );
    } else {
        metrics.push(m('Total Dur', manifest.duration, 's', 'film'));
    }

    return { title: 'Timing Config', metrics };
}

/**
 * Extracts raw tracks and calculates content boundaries.
 */
function createVisualTracks(stream) {
    const tracks = [];
    let contentMaxTime = 0;
    const manifest = stream.manifest;

    // 1. Ad Breaks
    if (stream.adAvails && stream.adAvails.length > 0) {
        const adItems = stream.adAvails.map((ad) => {
            const end = ad.startTime + ad.duration;
            if (end > contentMaxTime) contentMaxTime = end;
            return {
                id: ad.id,
                start: ad.startTime,
                end,
                duration: ad.duration,
                label: 'Ad',
                type: 'ad',
                data: { ...ad },
            };
        });

        tracks.push({
            id: 'ads',
            label: 'Ad Avails',
            type: 'ad',
            items: adItems,
        });
    }

    // 2. Media Segments
    let segments = [];
    if (stream.protocol === 'hls') {
        const targetState =
            stream.hlsVariantState.get(stream.activeMediaPlaylistId) ||
            Array.from(stream.hlsVariantState.values()).find(
                (s) => s.segments.length > 0
            );
        if (targetState) segments = targetState.segments;
    } else {
        // Prefer video representation
        const vidRep = Array.from(stream.dashRepresentationState.values()).find(
            (s) => s.segments.length > 0
        );
        if (vidRep) segments = vidRep.segments;
    }

    if (segments.length > 0) {
        const items = [];
        const sorted = [...segments]
            .filter((s) => s.type === 'Media')
            .sort((a, b) => a.time - b.time);
        let lastEnd = null;

        sorted.forEach((seg) => {
            const start = seg.time / seg.timescale;
            const duration = seg.duration / seg.timescale;
            const end = start + duration;

            if (end > contentMaxTime) contentMaxTime = end;

            // Gap Detection (>100ms tolerance)
            if (lastEnd !== null && start > lastEnd + 0.1) {
                items.push({
                    id: `gap-${fmtNum(lastEnd)}`,
                    start: lastEnd,
                    end: start,
                    duration: start - lastEnd,
                    label: 'Gap',
                    type: 'gap',
                    data: { gapDuration: start - lastEnd },
                });
            }

            items.push({
                id: seg.uniqueId,
                start,
                end,
                duration,
                label: `${seg.number}`,
                type: 'segment',
                data: {
                    number: seg.number,
                    duration: fmtNum(duration, 3),
                    time: fmtNum(start, 3),
                    url: seg.resolvedUrl,
                },
            });
            lastEnd = end;
        });

        if (items.length > 0) {
            tracks.push({
                id: 'video',
                label: 'Segments',
                type: 'video',
                items,
            });
        }
    }

    // 3. Periods (Structure)
    const periodItems = manifest.periods.map((p, i) => {
        const start = p.start || 0;
        let duration = p.duration;
        if (duration === null) duration = Math.max(contentMaxTime - start, 0);

        // Extend period end to match content if it was shorter/unknown
        const end = Math.max(start + duration, contentMaxTime);
        if (end > contentMaxTime) contentMaxTime = end;

        return {
            id: p.id || `period-${i}`,
            start,
            end,
            duration: end - start,
            label: `Period ${i + 1}`,
            type: 'period',
            data: { id: p.id, start },
        };
    });

    tracks.push({
        id: 'periods',
        label: 'Periods',
        type: 'period',
        items: periodItems,
    });

    return { tracks };
}

export function createTimelineViewModel(stream) {
    if (!stream) return null;

    // 1. Generate raw tracks and find bounds
    const { tracks } = createVisualTracks(stream);
    const isLive = stream.manifest.type === 'dynamic';

    // 2. Calculate Offset and Duration for Chart
    let timeOffset = 0;
    let totalDuration = stream.manifest.duration || 60;

    const allItems = tracks.flatMap((t) => t.items);
    if (allItems.length > 0) {
        const minStart = Math.min(...allItems.map((i) => i.start));
        const maxEnd = Math.max(...allItems.map((i) => i.end));

        if (isLive) {
            // For live, we shift the timeline so the start of the window is 0
            timeOffset = minStart;
        }

        // Duration is the span of the content
        const contentSpan = maxEnd - minStart;
        totalDuration = Math.max(totalDuration, contentSpan);
    }

    // 3. Normalize Tracks (Shift by timeOffset)
    // We perform this mapping explicitly to avoid ReferenceErrors or shadowing.
    const normalizedTracks = tracks.map((t) => {
        const normalizedItems = normalizeTrackItems(t.items, timeOffset);
        return {
            ...t,
            items: normalizedItems,
        };
    });

    // 4. Generate Metrics Groups
    const healthInsights =
        stream.protocol === 'dash'
            ? getDashInsights(stream)
            : getHlsInsights(stream);
    const timingMetrics =
        stream.protocol === 'dash'
            ? getDashTimingMetrics(stream)
            : getHlsTimingMetrics(stream);

    const contentStats = {
        title: 'Content Stats',
        metrics: [
            m(
                'Video',
                stream.manifest.summary?.content.totalVideoTracks || 0,
                'tracks',
                'layers'
            ),
            m(
                'Audio',
                stream.manifest.summary?.content.totalAudioTracks || 0,
                'tracks',
                'audioLines'
            ),
            m(
                'Security',
                stream.manifest.summary?.security?.isEncrypted
                    ? 'DRM'
                    : 'Clear',
                '',
                stream.manifest.summary?.security?.isEncrypted
                    ? 'lock'
                    : 'lockOpen'
            ),
        ],
    };

    return {
        tracks: normalizedTracks,
        timeOffset,
        totalDuration: Math.max(totalDuration, 10), // Ensure at least some width
        isLive,
        metricsGroups: [healthInsights, timingMetrics, contentStats],
    };
}
