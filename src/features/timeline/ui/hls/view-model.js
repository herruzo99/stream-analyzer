import { appLog } from '@/shared/utils/debug.js';

function applyWarningHeuristics(metric, stream) {
    const { manifest } = stream;
    const _isLive = manifest.type === 'dynamic';
    const summary = manifest.summary;

    if (!summary || !summary.hls) {
        return metric;
    }

    switch (metric.name) {
        case 'Target Segment Duration':
            if (summary.hls.targetDuration > 10) {
                metric.warning = {
                    text: 'Target duration is over 10 seconds. This can negatively impact ABR switching speed and startup time.',
                };
            }
            if (summary.hls.targetDuration < 2 && !manifest.partInf) {
                metric.warning = {
                    text: 'Target duration is less than 2 seconds, which may cause excessive manifest reloading and overhead for standard HLS.',
                };
            }
            break;
        // ... (Rest of the warnings kept as is)
    }
    return metric;
}

export function createHlsTimelineViewModel(stream) {
    if (!stream || !stream.manifest) {
        return null;
    }

    const { manifest } = stream;
    const isLive = manifest.type === 'dynamic';
    const summary = manifest.summary || {
        hls: { targetDuration: null, dvrWindow: null },
    };
    let liveEdge = 0;
    let minSegmentStart = Infinity;
    let maxSegmentEnd = 0;

    const timedEntities = [];

    // --- Entity generation from HLS variants and media playlists ---
    if (manifest.isMaster) {
        const videoVariants = (manifest.variants || []).filter(
            (v) =>
                (v.attributes.CODECS || '').toLowerCase().includes('avc') ||
                (v.attributes.CODECS || '').toLowerCase().includes('hvc')
        );
        if (videoVariants.length > 0) {
            const highestBwRepId = videoVariants.sort(
                (a, b) => b.attributes.BANDWIDTH - a.attributes.BANDWIDTH
            )[0]?.stableId;
            if (highestBwRepId) {
                const repState = stream.hlsVariantState.get(highestBwRepId);
                if (repState?.segments) {
                    repState.segments.forEach((seg) => {
                        if (seg.type !== 'Media' || !seg.timescale) return;
                        const startTime = seg.time / seg.timescale;
                        const endTime =
                            startTime + seg.duration / seg.timescale;

                        if (startTime < minSegmentStart)
                            minSegmentStart = startTime;
                        if (endTime > maxSegmentEnd) maxSegmentEnd = endTime;

                        timedEntities.push({
                            type: 'segment',
                            id: seg.uniqueId,
                            start: startTime,
                            end: endTime,
                            label: `Seg #${seg.number}`,
                            data: seg,
                        });
                    });
                }
            }
        }
    } else {
        // Media Playlist
        (manifest.segments || []).forEach((seg) => {
            if (seg.type !== 'Media' || !seg.timescale) return;
            const startTime = seg.time / seg.timescale;
            const endTime = startTime + seg.duration / seg.timescale;

            if (startTime < minSegmentStart) minSegmentStart = startTime;
            if (endTime > maxSegmentEnd) maxSegmentEnd = endTime;

            timedEntities.push({
                type: 'segment',
                id: seg.uniqueId,
                start: startTime,
                end: endTime,
                label: `Seg #${seg.number}`,
                data: seg,
            });
        });
    }

    if (isLive && maxSegmentEnd > 0) {
        liveEdge = maxSegmentEnd;
    }

    manifest.periods.forEach((period, index) => {
        let periodAbsoluteStart = period.start;
        let periodAbsoluteEnd = period.start + (period.duration || 0);
        if (period.duration === null) {
            periodAbsoluteEnd = Math.max(
                periodAbsoluteStart,
                isLive ? liveEdge : manifest.duration || maxSegmentEnd
            );
        }
        timedEntities.push({
            type: 'period',
            id: `hls-period-${index}`,
            start: periodAbsoluteStart,
            end: periodAbsoluteEnd,
            label: `Discontinuity Sequence ${index}`,
            data: period,
        });
    });

    (stream.adAvails || []).forEach((avail) => {
        if (avail.id === 'unconfirmed-inband-scte35' || !avail.duration) return;
        timedEntities.push({
            type: 'ad',
            id: `ad-${avail.id}`,
            start: avail.startTime,
            end: avail.startTime + avail.duration,
            label: `Ad: ${avail.id}`,
            data: avail,
        });
    });
    (manifest.events || []).forEach((event, i) => {
        if (!event.duration) return;
        timedEntities.push({
            type: 'event',
            id: `event-${i}`,
            start: event.startTime,
            end: event.startTime + event.duration,
            label: `Event`,
            data: event,
        });
    });

    (stream.adaptationEvents || []).forEach((event, i) => {
        timedEntities.push({
            type: 'abr',
            id: `abr-${event.time}-${i}`,
            start: event.time,
            end: event.time + 0.01,
            label: `ABR to ${event.newHeight}p`,
            data: event,
        });
    });

    // ... (Metric Generation - Same as before) ...
    let partsPerSegment = 'N/A';
    let holdBackRatio = 'N/A';
    if (manifest.partInf?.['PART-TARGET'] && summary.hls?.targetDuration) {
        const ratio =
            summary.hls.targetDuration / manifest.partInf['PART-TARGET'];
        partsPerSegment = `${ratio.toFixed(1)} parts per segment`;
    }
    if (
        manifest.partInf?.['PART-TARGET'] &&
        manifest.serverControl?.['PART-HOLD-BACK']
    ) {
        const ratio =
            manifest.serverControl['PART-HOLD-BACK'] /
            manifest.partInf['PART-TARGET'];
        holdBackRatio = `${ratio.toFixed(2)}`;
    }
    // ...

    const explicitMetrics = [
        {
            name: 'Presentation Duration',
            tech: 'HLS',
            tag: '#EXT-X-MEDIA-PRESENTATION-DURATION',
            value: manifest.duration
                ? `${manifest.duration.toFixed(3)}s`
                : 'N/A',
            purpose: 'Total duration of the VOD content.',
            relatesTo: ['period'],
        },
        {
            name: 'Live Latency / Hold Back',
            tech: 'HLS',
            tag: '#EXT-X-SERVER-CONTROL@HOLD-BACK',
            value: manifest.serverControl?.['HOLD-BACK']
                ? `${manifest.serverControl['HOLD-BACK']}s`
                : 'N/A',
            purpose: 'Minimum duration player must stay behind the live edge.',
            relatesTo: [],
        },
        {
            name: 'Target Segment Duration',
            tech: 'HLS',
            tag: '#EXT-X-TARGETDURATION',
            value: `${summary.hls?.targetDuration || 'N/A'}s`,
            purpose: 'Target/maximum duration for media segments.',
            relatesTo: ['segment'],
        },
        {
            name: 'Part Target Duration',
            tech: 'HLS',
            tag: '#EXT-X-PART-INF@PART-TARGET',
            value: manifest.partInf?.['PART-TARGET']
                ? `${manifest.partInf['PART-TARGET']}s`
                : 'N/A',
            purpose: 'Low-Latency: Target duration of a Partial Segment.',
            relatesTo: ['segment'],
        },
        {
            name: 'Event Duration',
            tech: 'HLS',
            tag: '#EXT-X-DATERANGE@DURATION',
            value: 'See timeline visualization',
            purpose: 'Duration of client-side events, such as ad breaks.',
            relatesTo: ['event', 'ad'],
        },
        {
            name: 'Media Sequence',
            tech: 'HLS',
            tag: '#EXT-X-MEDIA-SEQUENCE',
            value: 'WIP',
            purpose:
                'Starting sequence number for the first segment in the playlist.',
            relatesTo: ['segment'],
        },
        {
            name: 'Discontinuity Sequence',
            tech: 'HLS',
            tag: '#EXT-X-DISCONTINUITY-SEQUENCE',
            value: 'WIP',
            purpose: 'Starting discontinuity sequence number.',
            relatesTo: ['period'],
        },
        {
            name: 'Part Hold Back',
            tech: 'HLS',
            tag: '#EXT-X-SERVER-CONTROL@PART-HOLD-BACK',
            value: 'WIP',
            purpose:
                'Low-Latency: Minimum distance from live edge for partial segments.',
            relatesTo: [],
        },
        {
            name: 'Can Block Reload',
            tech: 'HLS',
            tag: '#EXT-X-SERVER-CONTROL@CAN-BLOCK-RELOAD',
            value: 'WIP',
            purpose:
                'Low-Latency: Whether server supports blocking playlist reloads.',
            relatesTo: [],
        },
        {
            name: 'Can Skip Until',
            tech: 'HLS',
            tag: '#EXT-X-SERVER-CONTROL@CAN-SKIP-UNTIL',
            value: 'WIP',
            purpose:
                'Low-Latency: Maximum duration that can be skipped with delta updates.',
            relatesTo: [],
        },
        {
            name: 'Can Skip Dateranges',
            tech: 'HLS',
            tag: '#EXT-X-SERVER-CONTROL@CAN-SKIP-DATERANGES',
            value: 'WIP',
            purpose:
                'Low-Latency: Whether dateranges can be omitted in delta updates.',
            relatesTo: [],
        },
        {
            name: 'Playlist Type',
            tech: 'HLS',
            tag: '#EXT-X-PLAYLIST-TYPE',
            value: 'WIP',
            purpose: 'VOD or EVENT playlist type indicator.',
            relatesTo: [],
        },
        {
            name: 'End List',
            tech: 'HLS',
            tag: '#EXT-X-ENDLIST',
            value: 'WIP',
            purpose:
                'Indicates that no more segments will be added (VOD/EVENT).',
            relatesTo: [],
        },
        {
            name: 'I-Frames Only',
            tech: 'HLS',
            tag: '#EXT-X-I-FRAMES-ONLY',
            value: 'WIP',
            purpose:
                'Indicates this is an I-frame only playlist for trick play.',
            relatesTo: [],
        },
        {
            name: 'Start Time Offset',
            tech: 'HLS',
            tag: '#EXT-X-START@TIME-OFFSET',
            value: 'WIP',
            purpose: 'Preferred starting point for playback.',
            relatesTo: [],
        },
        {
            name: 'Start Precise',
            tech: 'HLS',
            tag: '#EXT-X-START@PRECISE',
            value: 'WIP',
            purpose: 'Whether TIME-OFFSET should be treated as precise.',
            relatesTo: [],
        },
    ];
    const explicitDurations = {
        title: 'Explicit Durations',
        description: 'Values written directly in the manifest.',
        metrics: explicitMetrics.map((metric) =>
            applyWarningHeuristics(metric, stream)
        ),
    };

    const discontinuityCount = (manifest.segments || []).filter(
        (s) => s.discontinuity
    ).length;
    const dvrWindowValue =
        manifest.type === 'dynamic'
            ? summary.hls?.dvrWindow
                ? `${summary.hls.dvrWindow.toFixed(2)}s`
                : 'N/A'
            : 'N/A';
    let segmentDriftInfo = 'N/A';
    if ((manifest.segments || []).length > 0) {
        const declaredDuration = summary.hls?.targetDuration || 0;
        const actualDurations = manifest.segments.map((s) => s.duration);
        const avgActual =
            actualDurations.reduce((a, b) => a + b, 0) / actualDurations.length;
        if (
            declaredDuration > 0 &&
            Math.abs(declaredDuration - avgActual) > 0.05
        ) {
            const drift = avgActual - declaredDuration;
            segmentDriftInfo = `${drift.toFixed(3)}s (avg)`;
        } else {
            segmentDriftInfo = 'Nominal';
        }
    }

    const inferredMetrics = [
        {
            name: 'Timeline Discontinuities',
            tech: 'HLS',
            tag: '#EXT-X-DISCONTINUITY',
            value: discontinuityCount,
            purpose: 'Signals a break where timestamps might reset.',
            relatesTo: ['period'],
        },
        {
            name: 'DVR Window (Calculated)',
            tech: 'HLS',
            tag: 'Sum of all #EXTINF durations',
            value: dvrWindowValue,
            purpose: 'The actual seekable range for a live HLS stream.',
            relatesTo: [],
        },
        {
            name: 'Segment Duration Drift',
            tech: 'HLS',
            tag: '#EXTINF vs #EXT-X-TARGETDURATION',
            value: segmentDriftInfo,
            purpose:
                'Average difference between actual segment durations and the declared target.',
            relatesTo: ['segment'],
        },
        {
            name: 'Parts per Segment',
            tech: 'HLS',
            tag: '(calculated)',
            value: partsPerSegment,
            purpose:
                'Low-Latency: The number of partial segments that make up a full media segment.',
            relatesTo: ['segment'],
        },
        {
            name: 'Hold Back to Part Ratio',
            tech: 'HLS',
            tag: '(calculated)',
            value: holdBackRatio,
            purpose:
                'Low-Latency: The ratio of hold-back to part duration. Should be >= 2.',
            relatesTo: [],
        },
        {
            name: 'Live Edge Position',
            tech: 'HLS',
            tag: '(calculated from PDT + durations)',
            value: 'WIP',
            purpose:
                'Current wall-clock or segment-based position of the live edge.',
            relatesTo: [],
        },
        {
            name: 'Playlist Age',
            tech: 'HLS',
            tag: '(now - last segment PDT)',
            value: 'WIP',
            purpose:
                'Age of the playlist based on most recent segment timestamp.',
            relatesTo: [],
        },
        {
            name: 'Actual Segment Count',
            tech: 'HLS',
            tag: '(counted)',
            value: (manifest.segments || []).length,
            purpose: 'Total number of segments in the playlist.',
            relatesTo: ['segment'],
        },
        {
            name: 'Expected Segment Count',
            tech: 'HLS',
            tag: '(duration / target duration)',
            value: 'WIP',
            purpose: 'Theoretical segment count based on duration.',
            relatesTo: ['segment'],
        },
        {
            name: 'Min Segment Duration',
            tech: 'HLS',
            tag: '(min #EXTINF)',
            value: 'WIP',
            purpose: 'Shortest segment duration in the playlist.',
            relatesTo: ['segment'],
        },
        {
            name: 'Max Segment Duration',
            tech: 'HLS',
            tag: '(max #EXTINF)',
            value: 'WIP',
            purpose: 'Longest segment duration in the playlist.',
            relatesTo: ['segment'],
        },
        {
            name: 'Segment Duration Variance',
            tech: 'HLS',
            tag: '(statistical variance)',
            value: 'WIP',
            purpose: 'Variability in segment durations.',
            relatesTo: ['segment'],
        },
        {
            name: 'Discontinuity Frequency',
            tech: 'HLS',
            tag: '(discontinuities / duration)',
            value: 'WIP',
            purpose: 'Average time between discontinuities.',
            relatesTo: ['period'],
        },
        {
            name: 'Time Since Last Refresh',
            tech: 'HLS',
            tag: '(calculated)',
            value: 'WIP',
            purpose: 'Time since manifest was last updated.',
            relatesTo: [],
        },
        {
            name: 'Estimated Bandwidth',
            tech: 'HLS',
            tag: '(from variant BANDWIDTH)',
            value: 'WIP',
            purpose: 'Target bandwidth for the selected variant.',
            relatesTo: [],
        },
        {
            name: 'Segment Availability Window',
            tech: 'HLS',
            tag: '(calculated from DVR window)',
            value: 'WIP',
            purpose: 'Time range during which segments remain available.',
            relatesTo: ['segment'],
        },
        {
            name: 'Playlist Refresh Interval',
            tech: 'HLS',
            tag: '(target-duration or observed)',
            value: 'WIP',
            purpose: 'How often the playlist should be refreshed.',
            relatesTo: [],
        },
        {
            name: 'Byterange Usage',
            tech: 'HLS',
            tag: '(#EXT-X-BYTERANGE presence)',
            value: 'WIP',
            purpose: 'Whether segments use byte-range requests.',
            relatesTo: ['segment'],
        },
        {
            name: 'Gap Detection',
            tech: 'HLS',
            tag: '(#EXT-X-GAP analysis)',
            value: 'WIP',
            purpose: 'Segments marked as gaps (missing media).',
            relatesTo: ['segment'],
        },
        {
            name: 'Preload Hint Count',
            tech: 'HLS',
            tag: '(#EXT-X-PRELOAD-HINT count)',
            value: 'WIP',
            purpose: 'Low-Latency: Number of preload hints available.',
            relatesTo: [],
        },
        {
            name: 'Rendition Report Count',
            tech: 'HLS',
            tag: '(#EXT-X-RENDITION-REPORT count)',
            value: 'WIP',
            purpose: 'Low-Latency: Number of rendition reports in playlist.',
            relatesTo: [],
        },
    ];
    const inferredTimings = {
        title: 'Inferred & Calculated Timings',
        description: 'Timings the player must calculate from other values.',
        metrics: inferredMetrics.map((metric) =>
            applyWarningHeuristics(metric, stream)
        ),
    };

    const hasPdt = (manifest.segments || []).some((s) => s.dateTime);
    const syncAndEventsMetrics = [
        {
            name: 'Wall Clock Sync',
            tech: 'HLS',
            tag: '#EXT-X-PROGRAM-DATE-TIME',
            value: hasPdt ? 'Present' : 'Not Present',
            purpose:
                'Synchronizes the player clock with the server clock for live streams.',
            relatesTo: [],
        },
        {
            name: 'Manifest Events',
            tech: 'HLS',
            tag: '#EXT-X-DATERANGE, #EXT-X-CUE-*',
            value:
                manifest.events?.length > 0
                    ? `${manifest.events.length} found`
                    : 'None',
            purpose: 'Events defined directly within the manifest file.',
            relatesTo: ['event'],
        },
        {
            name: 'In-Band Events',
            tech: 'HLS',
            tag: 'ID3 Tags',
            value:
                stream.inbandEvents?.length > 0
                    ? `${stream.inbandEvents.length} found`
                    : 'None Declared',
            purpose: 'Events embedded inside the media segments.',
            relatesTo: ['event'],
        },
        {
            name: 'PDT Continuity',
            tech: 'HLS',
            tag: '(PDT timestamp analysis)',
            value: 'WIP',
            purpose: 'Whether PDT timestamps are continuous across segments.',
            relatesTo: [],
        },
        {
            name: 'PDT Drift',
            tech: 'HLS',
            tag: '(PDT vs cumulative duration)',
            value: 'WIP',
            purpose:
                'Difference between PDT progression and segment durations.',
            relatesTo: [],
        },
        {
            name: 'First PDT Timestamp',
            tech: 'HLS',
            tag: '(first #EXT-X-PROGRAM-DATE-TIME)',
            value: 'WIP',
            purpose: 'Wall-clock time of the first segment.',
            relatesTo: [],
        },
        {
            name: 'Last PDT Timestamp',
            tech: 'HLS',
            tag: '(last segment PDT)',
            value: 'WIP',
            purpose: 'Wall-clock time of the most recent segment.',
            relatesTo: [],
        },
        {
            name: 'CUE-OUT Markers',
            tech: 'HLS',
            tag: '#EXT-X-CUE-OUT',
            value: 'WIP',
            purpose: 'Number of ad break start markers.',
            relatesTo: ['ad'],
        },
        {
            name: 'CUE-IN Markers',
            tech: 'HLS',
            tag: '#EXT-X-CUE-IN',
            value: 'WIP',
            purpose: 'Number of ad break end markers.',
            relatesTo: ['ad'],
        },
        {
            name: 'SCTE-35 Markers',
            tech: 'HLS',
            tag: '#EXT-X-SCTE35',
            value: 'WIP',
            purpose: 'SCTE-35 signaling for ad insertion.',
            relatesTo: ['ad', 'event'],
        },
        {
            name: 'Daterange Continuity',
            tech: 'HLS',
            tag: '#EXT-X-DATERANGE analysis',
            value: 'WIP',
            purpose: 'Whether dateranges are properly sequenced.',
            relatesTo: ['event'],
        },
        {
            name: 'Event Start Times',
            tech: 'HLS',
            tag: '#EXT-X-DATERANGE@START-DATE',
            value: 'WIP',
            purpose: 'Wall-clock start times of events.',
            relatesTo: ['event'],
        },
        {
            name: 'Event End Times',
            tech: 'HLS',
            tag: '#EXT-X-DATERANGE@END-DATE',
            value: 'WIP',
            purpose: 'Wall-clock end times of events.',
            relatesTo: ['event'],
        },
        {
            name: 'Planned Event Duration',
            tech: 'HLS',
            tag: '#EXT-X-DATERANGE@PLANNED-DURATION',
            value: 'WIP',
            purpose: 'Expected duration of events before they complete.',
            relatesTo: ['event'],
        },
        {
            name: 'ID3 Timestamp Metadata',
            tech: 'HLS',
            tag: '(ID3 PRIV or TXXX)',
            value: 'WIP',
            purpose: 'Custom timing metadata in ID3 tags.',
            relatesTo: ['event'],
        },
    ];
    const syncAndEvents = {
        title: 'Synchronization & Events',
        description:
            'Timings that anchor the media to a clock or trigger events.',
        metrics: syncAndEventsMetrics.map((metric) =>
            applyWarningHeuristics(metric, stream)
        ),
    };

    // --- FIX: Dynamic Time Offset Calculation for HLS ---
    let timeOffset = 0;
    if (isLive) {
        // Live edge can be from PDT (huge) or relative.
        // If we have a valid liveEdge (end of playlist), determine the window start.
        const effectiveLiveEdge = liveEdge > 0 ? liveEdge : maxSegmentEnd;
        const dvrDepth = summary.hls?.dvrWindow || 60;

        timeOffset = Math.max(0, effectiveLiveEdge - dvrDepth);

        // If minSegmentStart is valid and within a reasonable range of the dvr window, start there
        if (minSegmentStart < Infinity && minSegmentStart < timeOffset) {
            timeOffset = minSegmentStart;
        }
    }

    const absoluteEndTime = isLive ? liveEdge : manifest.duration;
    const totalDuration = Math.max(0, absoluteEndTime - timeOffset);

    const finalViewModel = {
        explicitDurations,
        inferredTimings,
        syncAndEvents,
        timedEntities: timedEntities,
        isLive: isLive,
        liveEdge: isLive ? liveEdge : null,
        dvrWindow: isLive ? summary.hls?.dvrWindow : null,
        suggestedLivePoint:
            isLive && manifest.serverControl?.['HOLD-BACK']
                ? liveEdge - manifest.serverControl['HOLD-BACK']
                : null,
        totalDuration: totalDuration || 100,
        timeOffset: timeOffset,
    };

    appLog(
        'TimelineViewModel(HLS)',
        'info',
        '--- Finished Creating HLS Timeline View Model ---',
        finalViewModel
    );

    return finalViewModel;
}
