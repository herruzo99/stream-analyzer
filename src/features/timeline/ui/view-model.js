import { findChildrenRecursive } from '@/infrastructure/parsing/utils/recursive-parser.js';
import { driftCalculator } from '../domain/drift-calculator.js';

/**
 * Helper to create a metric object with rich metadata for tooltips.
 */
const m = (
    name,
    value,
    unit = '',
    icon = 'hash',
    status = 'neutral',
    description = '',
    technical = ''
) => ({
    name,
    value,
    unit,
    icon,
    status,
    description,
    technical,
    relatesTo: [], // Populated later if needed
});

const fmtNum = (val, decimals = 2) =>
    val !== null && val !== undefined && !isNaN(val)
        ? val.toFixed(decimals)
        : 'N/A';

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

function getDashInsights(stream) {
    const manifest = stream.manifest;
    const isLive = manifest.type === 'dynamic';
    const insights = [];

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
                    'The manifest provides a UTC Timing source, allowing clients to synchronize their wall-clock time for accurate live-edge requests.',
                    `<UTCTiming schemeIdUri="${
                        utcTiming[0][':@']?.schemeIdUri || '...'
                    }" />`
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
                    'No UTCTiming element found. Clients may drift or fail to join the live edge due to clock skew.',
                    'ISO/IEC 23009-1: Clause 5.8.4.11'
                )
            );
        }
    } else {
        // VOD
        insights.push(
            m(
                'Clock Sync',
                'N/A',
                '',
                'clock',
                'neutral',
                'Clock synchronization is not required for static (VOD) presentations.',
                'Type: static'
            )
        );
    }

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
                'Multiple BaseURLs detected, enabling Client-Side Load Balancing or failover.',
                'Clause 5.6: BaseURL ServiceLocation'
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
                'Content is served from a single BaseURL.',
                'Clause 5.6'
            )
        );
    }

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
                'All AdaptationSets have segmentAlignment="true", ensuring seamless ABR switching at segment boundaries.',
                '@segmentAlignment="true"'
            )
        );
    } else {
        insights.push(
            m(
                'Switching',
                'Mixed',
                '',
                'layers',
                'warning',
                'Some AdaptationSets are not segment aligned. Switching may require overlaps or gaps.',
                `Aligned: ${alignedCount}, Unaligned: ${unalignedCount}`
            )
        );
    }

    return { title: 'Stream Health', metrics: insights };
}

function getDashTimingMetrics(stream) {
    const manifest = stream.manifest;
    // Fallback to summary if direct attribute is missing (common in some parsers)
    const summaryDash = manifest.summary?.dash || {};
    const isLive = manifest.type === 'dynamic';

    const metrics = [
        m(
            'Min Buffer',
            manifest.minBufferTime,
            's',
            'buffer',
            'neutral',
            'The initial amount of data the client should buffer before starting playback.',
            '@minBufferTime'
        ),
        m(
            'Max Seg Dur',
            manifest.maxSegmentDuration || summaryDash.maxSegmentDuration,
            's',
            'clock',
            'neutral',
            'The maximum duration of any Media Segment in the presentation.',
            '@maxSegmentDuration'
        ),
    ];

    if (isLive) {
        const depth = manifest.timeShiftBufferDepth;
        const depthMetric = m(
            'DVR Window',
            depth ? depth : '∞',
            's',
            'history',
            depth && depth < 60 ? 'warning' : 'neutral',
            'The duration of the time-shift buffer (DVR window).',
            '@timeShiftBufferDepth'
        );
        if (depth && depth < 60) {
            depthMetric.warning = {
                text: 'Short DVR window (<60s) may cause playback failures if paused.',
            };
        }
        metrics.push(depthMetric);

        metrics.push(
            m(
                'Update Freq',
                manifest.minimumUpdatePeriod,
                's',
                'refresh',
                'neutral',
                'The minimum time the client must wait before requesting a manifest update.',
                '@minimumUpdatePeriod'
            )
        );
        metrics.push(
            m(
                'Delay',
                manifest.suggestedPresentationDelay,
                's',
                'timer',
                'neutral',
                'Suggested latency behind the live edge for stable playback.',
                '@suggestedPresentationDelay'
            )
        );
    } else {
        metrics.push(
            m(
                'Duration',
                manifest.duration,
                's',
                'film',
                'neutral',
                'Total duration of the VOD presentation.',
                '@mediaPresentationDuration'
            )
        );
    }
    return { title: 'Timing Config', metrics };
}

function getHlsInsights(stream) {
    const manifest = stream.manifest;
    const summary = manifest.summary?.hls || {};
    const insights = [];

    if (summary.targetDuration) {
        const avgDur =
            summary.mediaPlaylistDetails?.averageSegmentDuration ||
            summary.targetDuration;
        const overhead = summary.targetDuration - avgDur;
        const effMetric = m(
            'Efficiency',
            overhead > 1.5 ? 'Low' : 'Good',
            '',
            'percent',
            overhead > 1.5 ? 'warning' : 'success',
            'Compares TargetDuration to average segment duration.',
            `Target: ${summary.targetDuration}s, Avg: ${avgDur.toFixed(2)}s`
        );
        if (overhead > 1.5) {
            effMetric.warning = {
                text: 'TargetDuration is > 1.5s higher than average. Consider lowering it to reduce latency.',
            };
        }
        insights.push(effMetric);
    }

    if (summary.iFramePlaylists > 0) {
        insights.push(
            m(
                'Trick Play',
                'Supported',
                '',
                'image',
                'success',
                'I-Frame playlists (EXT-X-I-FRAME-STREAM-INF) are present for efficient scrubbing.',
                `${summary.iFramePlaylists} I-Frame Tracks`
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
                'No I-Frame playlists found. Scrubbing may be inefficient.',
                'Missing EXT-X-I-FRAME-STREAM-INF'
            )
        );
    }

    if (manifest.partInf) {
        insights.push(
            m(
                'Mode',
                'LL-HLS',
                '',
                'zap',
                'success',
                'Low-Latency HLS features (Partial Segments) detected.',
                'EXT-X-PART-INF Present'
            )
        );
    } else {
        insights.push(
            m(
                'Mode',
                'Standard',
                '',
                'clock',
                'neutral',
                'Standard HLS (No Partial Segments).',
                'HLS v' + (summary.version || '?')
            )
        );
    }
    return { title: 'Stream Health', metrics: insights };
}

function getHlsTimingMetrics(stream) {
    const manifest = stream.manifest;
    const summary = manifest.summary?.hls || {};
    const isLive = manifest.type === 'dynamic';

    const metrics = [
        m(
            'Target Dur',
            summary.targetDuration,
            's',
            'clock',
            'neutral',
            'The maximum duration of any media segment in the playlist.',
            'EXT-X-TARGETDURATION'
        ),
        m(
            'Version',
            summary.version,
            '',
            'tag',
            'neutral',
            'The HLS Protocol compatibility version.',
            'EXT-X-VERSION'
        ),
    ];

    if (isLive) {
        metrics.push(
            m(
                'DVR Window',
                summary.dvrWindow ? fmtNum(summary.dvrWindow, 0) : 'N/A',
                's',
                'history',
                'neutral',
                'The total duration of segments currently available in the playlist.',
                'Sum of EXTINF'
            )
        );
        if (manifest.partInf) {
            metrics.push(
                m(
                    'Part Target',
                    manifest.partInf['PART-TARGET'],
                    's',
                    'zap',
                    'neutral',
                    'Target duration for partial segments in Low-Latency HLS.',
                    'EXT-X-PART-INF:PART-TARGET'
                )
            );
        }
    } else {
        metrics.push(
            m(
                'Total Dur',
                manifest.duration,
                's',
                'film',
                'neutral',
                'Total duration of the VOD presentation.',
                'Sum of EXTINF'
            )
        );
    }
    return { title: 'Timing Config', metrics };
}

function createVisualTracks(stream) {
    const tracks = [];
    let contentMaxTime = 0;
    const manifest = stream.manifest;

    // 1. Media Segments (Determine content range first)
    let segments = [];
    if (stream.protocol === 'hls') {
        const targetState =
            stream.hlsVariantState.get(stream.activeMediaPlaylistId) ||
            Array.from(stream.hlsVariantState.values()).find(
                (s) => s.segments.length > 0
            );
        if (targetState) segments = targetState.segments;
    } else {
        const vidRep = Array.from(stream.dashRepresentationState.values()).find(
            (s) => s.segments.length > 0
        );
        if (vidRep) segments = vidRep.segments;
    }

    let contentStartTime = Infinity;

    if (segments.length > 0) {
        const items = [];
        const sorted = [...segments]
            .filter((s) => s.type === 'Media')
            .sort((a, b) => a.time - b.time);
        let lastEnd = null;

        sorted.forEach((seg) => {
            const relativeTime = seg.time / seg.timescale;
            const start = (seg.periodStart || 0) + relativeTime;
            const duration = seg.duration / seg.timescale;
            const end = start + duration;

            if (start < contentStartTime) contentStartTime = start;
            if (end > contentMaxTime) contentMaxTime = end;

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

    if (contentStartTime === Infinity) contentStartTime = 0;

    // 2. Periods
    const periodItems = manifest.periods.map((p, i) => {
        const start = p.start || 0;
        let duration = p.duration;
        if (duration === null) duration = Math.max(contentMaxTime - start, 0);
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

    // 3. Ad Breaks (Filtered using content range)
    if (stream.adAvails && stream.adAvails.length > 0) {
        // ARCHITECTURAL FIX: Filter out ad avails with invalid timestamps.
        // If content is using absolute time (e.g. > 1000s), we ignore 0-based ad avails
        // which are likely unconfirmed heuristics or relative timeline artifacts.
        const isAbsoluteTime = contentStartTime > 1000;

        const validAvails = stream.adAvails.filter((ad) => {
            if (ad.startTime < 0) return false;
            if (isAbsoluteTime && ad.startTime < 1000) return false; // Filter relative ads in absolute timeline
            return true;
        });

        if (validAvails.length > 0) {
            const adItems = validAvails.map((ad) => {
                const end = ad.startTime + ad.duration;
                // Only expand total content time if the ad is plausibly near the content
                // Otherwise it might be a far-future ad that squashes the view
                if (end > contentMaxTime && end < contentMaxTime + 3600)
                    contentMaxTime = end;

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
            // Insert Ads at index 0 (Bottom of chart usually, or top depending on renderer)
            tracks.unshift({
                id: 'ads',
                label: 'Ad Avails',
                type: 'ad',
                items: adItems,
            });
        }
    }

    return { tracks, contentMaxTime };
}

export function createTimelineViewModel(stream) {
    if (!stream) return null;

    const { tracks, _contentMaxTime } = createVisualTracks(stream);
    const isLive = stream.manifest.type === 'dynamic';

    let timeOffset = 0;
    let totalDuration = stream.manifest.duration;

    const allItems = tracks.flatMap((t) => t.items);
    if (allItems.length > 0) {
        const minStart = Math.min(...allItems.map((i) => i.start));
        const maxEnd = Math.max(...allItems.map((i) => i.end));

        if (isLive) {
            timeOffset = minStart;
            totalDuration = maxEnd - minStart;
        } else {
            // FIX: For VOD with large start times (e.g. extracted periods),
            // also normalize to the content start to avoid huge empty gaps.
            // But only if the start is significantly large (> 60s) to avoid shifting normal 0-start VODs unnecessarily.
            if (minStart > 60) {
                timeOffset = minStart;
                totalDuration = maxEnd - minStart;
            } else {
                const contentSpan = maxEnd - minStart;
                totalDuration = totalDuration || contentSpan;
            }
        }
    }

    if (!totalDuration || totalDuration <= 0) {
        totalDuration = 30;
    }

    const normalizedTracks = tracks.map((t) => {
        const normalizedItems = normalizeTrackItems(t.items, timeOffset);
        return {
            ...t,
            items: normalizedItems,
        };
    });

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
                'layers',
                'neutral',
                'Total number of video tracks (DASH Representations or HLS Variants) detected.',
                `AdaptationSet count: ${stream.manifest.summary?.content.totalVideoTracks}`
            ),
            m(
                'Audio',
                stream.manifest.summary?.content.totalAudioTracks || 0,
                'tracks',
                'audioLines',
                'neutral',
                'Total number of audio tracks detected.',
                `AdaptationSet count: ${stream.manifest.summary?.content.totalAudioTracks}`
            ),
            m(
                'Security',
                stream.manifest.summary?.security?.isEncrypted
                    ? 'DRM'
                    : 'Clear',
                '',
                stream.manifest.summary?.security?.isEncrypted
                    ? 'lock'
                    : 'lockOpen',
                stream.manifest.summary?.security?.isEncrypted
                    ? 'success'
                    : 'neutral',
                stream.manifest.summary?.security?.isEncrypted
                    ? 'Content is encrypted. DRM system signaling detected.'
                    : 'Content is unencrypted (Clear). No DRM signaling found.',
                stream.manifest.summary?.security?.systems
                    ?.map((s) => s.systemId)
                    .join(', ') || 'None'
            ),
        ],
    };

    if (isLive) {
        driftCalculator.update(stream);
    }

    return {
        tracks: normalizedTracks,
        timeOffset,
        totalDuration: Math.max(totalDuration, 10),
        isLive,
        metricsGroups: [healthInsights, timingMetrics, contentStats],
        driftHistory: isLive ? driftCalculator.getHistory(stream.id) : [],
    };
}
