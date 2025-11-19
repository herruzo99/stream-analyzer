import {
    getInheritedElement,
    getAttr,
    findChildrenRecursive,
    findChildren,
} from '@/infrastructure/parsing/utils/recursive-parser.js';


function applyWarningHeuristics(metric, stream) {
    const { manifest } = stream;
    const isLive = manifest.type === 'dynamic';

    switch (metric.name) {
        case 'DVR Window':
            if (
                isLive &&
                manifest.timeShiftBufferDepth &&
                manifest.timeShiftBufferDepth < 60
            ) {
                metric.warning = {
                    text: 'DVR window is less than 60 seconds, which may provide a poor user experience for seeking.',
                };
            }
            break;
        case 'Minimum Buffer': {
            const maxSegmentDuration = manifest.maxSegmentDuration;
            const minBufferTime = manifest.minBufferTime;
            if (maxSegmentDuration && minBufferTime < maxSegmentDuration) {
                metric.warning = {
                    text: `Minimum buffer time (${minBufferTime}s) is less than the max segment duration (${maxSegmentDuration}s), increasing the risk of rebuffering.`,
                };
            }
            if (minBufferTime > 30) {
                metric.warning = {
                    text: 'A large minimum buffer time (>30s) can lead to slow startup.',
                };
            }
            break;
        }
        case 'Period Gap/Overlap': {
            const gapValue = parseFloat(metric.value);
            if (!isNaN(gapValue) && Math.abs(gapValue) > 0.001) {
                metric.warning = {
                    text: `A significant ${gapValue > 0 ? 'gap' : 'overlap'} of ${Math.abs(gapValue).toFixed(3)}s exists between periods, which can cause playback glitches.`,
                };
            }
            if (manifest.periods.length > 1) {
                const hasContinuityDescriptor = manifest.periods.every((p) =>
                    findChildrenRecursive(
                        p.serializedManifest,
                        'SupplementalProperty'
                    ).some(
                        (sp) =>
                            getAttr(sp, 'schemeIdUri') ===
                            'urn:mpeg:dash:period-continuity:2015' &&
                            getAttr(sp, 'value') === '1'
                    )
                );
                if (!hasContinuityDescriptor) {
                    metric.warning = {
                        text: 'Multi-period stream lacks the Period Continuity descriptor. Timestamps may not align between periods, risking playback stalls.',
                    };
                }
            }
            break;
        }
        case 'Wall Clock Sync':
            if (isLive && metric.value === 'Not Present') {
                metric.warning = {
                    text: 'Live streams should include a UTCTiming element to ensure clients can synchronize to a common clock, enabling features like synchronized start.',
                };
            }
            break;
        case 'In-Band Events': {
            const hasInbandDeclaration = (manifest.periods || []).some((p) =>
                (p.adaptationSets || []).some(
                    (as) => (as.inbandEventStreams || []).length > 0
                )
            );
            if (hasInbandDeclaration && stream.inbandEvents?.length === 0) {
                metric.warning = {
                    text: 'Manifest declares InbandEventStream, but no "emsg" events have been detected in loaded segments yet. This may be expected if events occur later in the stream.',
                };
            }
            break;
        }
    }
    return metric;
}

export function createDashTimelineViewModel(stream) {
    if (!stream || !stream.manifest) {
        return null;
    }

    const { manifest } = stream;
    const isLive = manifest.type === 'dynamic';
    let liveEdge = 0;

    if (isLive && manifest.availabilityStartTime) {
        liveEdge =
            (Date.now() - manifest.availabilityStartTime.getTime()) / 1000;
    }

    const timedEntities = [];
    let maxSegmentEnd = 0;
    let minSegmentStart = Infinity;

    manifest.periods.forEach((period, periodIndex) => {
        const videoAdaptationSets = period.adaptationSets.filter(
            (as) => as.contentType === 'video'
        );
        if (videoAdaptationSets.length === 0) return;

        const allVideoRepsInPeriod = videoAdaptationSets.flatMap(
            (as) => as.representations
        );
        if (allVideoRepsInPeriod.length === 0) return;

        const topRep = allVideoRepsInPeriod.sort(
            (a, b) => b.bandwidth - a.bandwidth
        )[0];

        const compositeKey = `${period.id || periodIndex}-${topRep.id}`;
        const repState = stream.dashRepresentationState.get(compositeKey);

        if (repState?.segments) {
            const periodStart = period.start || 0;
            repState.segments.forEach((seg) => {
                if (seg.type !== 'Media' || !seg.timescale) return;
                const startTime = periodStart + seg.time / seg.timescale;
                const endTime = startTime + seg.duration / seg.timescale;

                if (endTime > maxSegmentEnd) maxSegmentEnd = endTime;
                if (startTime < minSegmentStart) minSegmentStart = startTime;

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
    });

    if (isLive && maxSegmentEnd > liveEdge) {
        liveEdge = maxSegmentEnd;
    }

    manifest.periods.forEach((period, index) => {
        let periodAbsoluteStart = period.start;
        let periodAbsoluteEnd = period.start + (period.duration || 0);

        if (period.duration === null) {
            if (index < manifest.periods.length - 1) {
                periodAbsoluteEnd = manifest.periods[index + 1].start;
            } else {
                periodAbsoluteEnd = Math.max(
                    periodAbsoluteStart,
                    isLive ? liveEdge : manifest.duration || maxSegmentEnd
                );
            }
        }

        if (periodAbsoluteEnd < periodAbsoluteStart) {
            periodAbsoluteEnd = periodAbsoluteStart;
        }

        timedEntities.push({
            type: 'period',
            id: `period-${period.id || index}`,
            start: periodAbsoluteStart,
            end: periodAbsoluteEnd,
            label: `Period ${period.id || index}`,
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

    let representativeTemplateEl = null;
    if (
        manifest.periods[0]?.adaptationSets[0]?.representations[0]
            ?.serializedManifest
    ) {
        for (const period of manifest.periods) {
            for (const as of period.adaptationSets) {
                for (const rep of as.representations) {
                    const hierarchy = [
                        rep.serializedManifest,
                        as.serializedManifest,
                        period.serializedManifest,
                    ];
                    const template = getInheritedElement(
                        'SegmentTemplate',
                        hierarchy
                    );
                    if (template) {
                        representativeTemplateEl = template;
                        break;
                    }
                }
                if (representativeTemplateEl) break;
            }
            if (representativeTemplateEl) break;
        }
    }

    const getTemplateAttr = (attr) =>
        representativeTemplateEl
            ? (getAttr(representativeTemplateEl, attr) ?? 'N/A')
            : 'N/A';

    let targetSegmentDurationValue = 'N/A';
    if (representativeTemplateEl) {
        const duration = getAttr(representativeTemplateEl, 'duration');
        const timescale = getAttr(representativeTemplateEl, 'timescale');
        if (duration && timescale) {
            targetSegmentDurationValue = `${(duration / timescale).toFixed(3)}s`;
        } else if (
            findChildrenRecursive(representativeTemplateEl, 'SegmentTimeline')
                .length > 0
        ) {
            targetSegmentDurationValue = 'Varies (Timeline)';
        }
    }

    const ptoValue = getTemplateAttr('presentationTimeOffset');
    const timescaleValue = getTemplateAttr('timescale');
    const atoValue = getTemplateAttr('availabilityTimeOffset');
    const atcValue =
        getTemplateAttr('availabilityTimeComplete') === 'false'
            ? 'false'
            : 'true';

    const explicitMetrics = [
        {
            name: 'Minimum Buffer',
            tech: 'DASH',
            tag: 'MPD@minBufferTime',
            value: manifest.minBufferTime
                ? `${manifest.minBufferTime.toFixed(3)}s`
                : 'N/A',
            purpose: 'Minimum buffer duration the player should maintain.',
            relatesTo: [],
        },
        {
            name: 'Max Segment Duration',
            tech: 'DASH',
            tag: 'MPD@maxSegmentDuration',
            value: manifest.maxSegmentDuration
                ? `${manifest.maxSegmentDuration.toFixed(3)}s`
                : 'N/A',
            purpose: 'Upper bound on any segment duration in the presentation.',
            relatesTo: ['segment'],
        },
        {
            name: 'Target Segment Duration',
            tech: 'DASH',
            tag: 'SegmentTemplate@duration',
            value: targetSegmentDurationValue,
            purpose: 'Target duration for media segments.',
            relatesTo: ['segment'],
        },
        {
            name: 'Presentation Time Offset',
            tech: 'DASH',
            tag: 'SegmentTemplate@presentationTimeOffset',
            value: ptoValue,
            purpose: 'Offset applied to segment timing within a period.',
            relatesTo: ['segment'],
        },
        {
            name: 'Timescale',
            tech: 'DASH',
            tag: 'SegmentTemplate@timescale',
            value: timescaleValue,
            purpose: 'Units per second for interpreting segment timing values.',
            relatesTo: ['segment'],
        },
    ].concat(
        isLive
            ? [
                {
                    name: 'DVR Window',
                    tech: 'DASH',
                    tag: 'MPD@timeShiftBufferDepth',
                    value: manifest.timeShiftBufferDepth
                        ? `${manifest.timeShiftBufferDepth.toFixed(3)}s`
                        : 'Not Specified',
                    purpose:
                        'Advertised duration a user can seek backward in a live stream.',
                    relatesTo: [],
                },
                {
                    name: 'Availability Start Time',
                    tech: 'DASH',
                    tag: 'MPD@availabilityStartTime',
                    value:
                        manifest.availabilityStartTime?.toISOString() ||
                        'Not Specified',
                    purpose:
                        'Wall-clock time when the content became available (live streams).',
                    relatesTo: [],
                },
                {
                    name: 'Availability End Time',
                    tech: 'DASH',
                    tag: 'MPD@availabilityEndTime',
                    value:
                        manifest.availabilityEndTime?.toISOString() ||
                        'Not Specified',
                    purpose:
                        'Wall-clock time when the content stops being available.',
                    relatesTo: [],
                },
                {
                    name: 'Publish Time',
                    tech: 'DASH',
                    tag: 'MPD@publishTime',
                    value:
                        manifest.publishTime?.toISOString() || 'Not Present',
                    purpose: 'Wall-clock time when this MPD was published.',
                    relatesTo: [],
                },
                {
                    name: 'Minimum Update Period',
                    tech: 'DASH',
                    tag: 'MPD@minimumUpdatePeriod',
                    value: manifest.minimumUpdatePeriod
                        ? `${manifest.minimumUpdatePeriod.toFixed(3)}s`
                        : 'Not Specified',
                    purpose:
                        'Minimum interval between manifest refreshes (live streams).',
                    relatesTo: [],
                },
                {
                    name: 'Suggested Presentation Delay',
                    tech: 'DASH',
                    tag: 'MPD@suggestedPresentationDelay',
                    value: manifest.suggestedPresentationDelay
                        ? `${manifest.suggestedPresentationDelay.toFixed(3)}s`
                        : 'Not Specified',
                    purpose:
                        'Recommended offset from the live edge for playback start.',
                    relatesTo: [],
                },
            ]
            : [
                {
                    name: 'Presentation Duration',
                    tech: 'DASH',
                    tag: 'MPD@mediaPresentationDuration',
                    value: manifest.duration
                        ? `${manifest.duration.toFixed(3)}s`
                        : 'N/A',
                    purpose: 'Total duration of the VOD content.',
                    relatesTo: ['period'],
                },
            ]
    );

    let periodGapInfo = 'N/A';
    let inferredPeriodDurationCount = 0;
    if (manifest.periods.length > 1) {
        let totalGap = 0;
        for (let i = 1; i < manifest.periods.length; i++) {
            const prev = manifest.periods[i - 1];
            const curr = manifest.periods[i];
            if (prev.duration !== null) {
                const gap = curr.start - (prev.start + prev.duration);
                if (Math.abs(gap) > 0.001) totalGap += gap;
            } else {
                inferredPeriodDurationCount++;
            }
        }
        periodGapInfo = `${totalGap.toFixed(3)}s (${inferredPeriodDurationCount} inferred)`;
    }

    let segmentDriftInfo = 'N/A';
    if (representativeTemplateEl) {
        const timelineEl = findChildren(
            representativeTemplateEl,
            'SegmentTimeline'
        )[0];
        const timescale = getAttr(representativeTemplateEl, 'timescale') || 1;
        if (timelineEl) {
            const sElements = findChildren(timelineEl, 'S');
            if (sElements.length > 1) {
                let totalDeclaredDuration = 0;
                let totalActualDuration = 0;
                let lastTime = getAttr(sElements[0], 't') || 0;

                sElements.forEach((s) => {
                    const r = getAttr(s, 'r') || 0;
                    const d = getAttr(s, 'd');
                    totalDeclaredDuration += d * (r + 1);
                });

                for (let i = 1; i < sElements.length; i++) {
                    const t = getAttr(sElements[i], 't');
                    if (t !== undefined) {
                        totalActualDuration += t - lastTime;
                        lastTime = t;
                    }
                }
                const lastS = sElements[sElements.length - 1];
                totalActualDuration +=
                    getAttr(lastS, 'd') * ((getAttr(lastS, 'r') || 0) + 1);

                const drift = totalActualDuration - totalDeclaredDuration;
                const driftSeconds = (drift / timescale).toFixed(4);
                segmentDriftInfo = `${drift} units (${driftSeconds}s)`;
            } else {
                segmentDriftInfo = 'Single <S> entry';
            }
        } else {
            segmentDriftInfo = 'Uses @duration or $Number$';
        }
    }

    let jitterInfo = 'N/A';
    if (isLive && stream.manifestUpdates.length > 1) {
        const timestampsInSeconds = stream.manifestUpdates
            .map((u) => {
                const parts = u.timestamp.split(':');
                return parts.length === 3
                    ? parseInt(parts[0], 10) * 3600 +
                    parseInt(parts[1], 10) * 60 +
                    parseFloat(parts[2].replace(',', '.'))
                    : NaN;
            })
            .filter((t) => !isNaN(t))
            .reverse();

        if (timestampsInSeconds.length > 1) {
            const intervals = [];
            for (let i = 1; i < timestampsInSeconds.length; i++) {
                intervals.push(
                    timestampsInSeconds[i] - timestampsInSeconds[i - 1]
                );
            }
            if (intervals.length > 0) {
                const mean =
                    intervals.reduce((a, b) => a + b, 0) / intervals.length;
                const stdDev = Math.sqrt(
                    intervals.reduce(
                        (sum, interval) => sum + Math.pow(interval - mean, 2),
                        0
                    ) / intervals.length
                );
                jitterInfo = `${stdDev.toFixed(3)}s (std dev)`;
            }
        }
    }

    const liveEdgeDisplay = liveEdge ? `${liveEdge.toFixed(3)}s` : 'N/A';

    const inferredMetrics = [
        {
            name: 'Period Gap/Overlap',
            tech: 'DASH',
            tag: 'Difference between Period timings',
            value: periodGapInfo,
            purpose: 'Detects gaps or overlaps between content periods.',
            relatesTo: ['period'],
        },
        {
            name: 'Segment Timeline Drift',
            tech: 'DASH',
            tag: '<S> @t differences',
            value: segmentDriftInfo,
            purpose:
                'Difference between declared segment durations and actual presentation times.',
            relatesTo: ['segment'],
        },
    ].concat(
        isLive
            ? [
                {
                    name: 'Live Edge Position',
                    tech: 'DASH',
                    tag: '(calculated)',
                    value: liveEdgeDisplay,
                    purpose:
                        'Current wall-clock or segment-based position of the live edge.',
                    relatesTo: [],
                },
                {
                    name: 'Time to Live Edge',
                    tech: 'DASH',
                    tag: '(live edge - playhead)',
                    value: manifest.suggestedPresentationDelay
                        ? `${manifest.suggestedPresentationDelay.toFixed(3)}s`
                        : 'Not Specified',
                    purpose:
                        'Calculated optimal playback position relative to live edge.',
                    relatesTo: [],
                },
                {
                    name: 'Manifest Update Jitter',
                    tech: 'DASH',
                    tag: '(publishTime analysis)',
                    value: jitterInfo,
                    purpose: 'Variation in time between manifest updates.',
                    relatesTo: [],
                },
                {
                    name: 'Segment Availability Window',
                    tech: 'DASH',
                    tag: '(calculated)',
                    value: 'Complex (per-segment)',
                    purpose:
                        'Time range during which each segment remains available.',
                    relatesTo: ['segment'],
                },
            ]
            : []
    );

    const hasUtcTiming =
        findChildrenRecursive(manifest.serializedManifest, 'UTCTiming').length >
        0;
    const scte35Count = (stream.adAvails || []).filter((a) =>
        a.detectionMethod.includes('SCTE35')
    ).length;
    const scte35Value = scte35Count > 0 ? `${scte35Count} found` : 'None';
    const latency = manifest.serviceDescriptions?.[0]?.latencies?.[0];
    const latencyValue = latency
        ? `Target: ${latency.target}ms`
        : 'Not Present';
    const prt = findChildrenRecursive(
        manifest.serializedManifest,
        'ProducerReferenceTime'
    )[0];
    const prtValue = prt ? 'Present' : 'Not Present';

    const syncAndEventsMetrics = [
        {
            name: 'In-Band Events',
            tech: 'DASH',
            tag: '<InbandEventStream> (emsg)',
            value:
                (stream.inbandEvents || []).length > 0
                    ? `${stream.inbandEvents.length} found`
                    : 'None Declared',
            purpose: 'Events embedded inside the media segments.',
            relatesTo: ['event'],
        },
        {
            name: 'Manifest Events',
            tech: 'DASH',
            tag: '<EventStream>',
            value:
                manifest.events?.length > 0
                    ? `${manifest.events.length} found`
                    : 'None',
            purpose: 'Events defined directly within the manifest.',
            relatesTo: ['event'],
        },
        {
            name: 'SCTE-35 Markers',
            tech: 'DASH',
            tag: '(emsg or EventStream)',
            value: scte35Value,
            purpose: 'Ad insertion markers embedded in segments or manifest.',
            relatesTo: ['ad', 'event'],
        },
    ].concat(
        isLive
            ? [
                {
                    name: 'Wall Clock Sync',
                    tech: 'DASH',
                    tag: '<UTCTiming>',
                    value: hasUtcTiming ? 'Present' : 'Not Present',
                    purpose:
                        'Synchronizes the player clock with the server clock.',
                    relatesTo: [],
                },
                {
                    name: 'Service Description Timing',
                    tech: 'DASH',
                    tag: '<ServiceDescription>',
                    value: latencyValue,
                    purpose: 'Latency and playback configuration parameters.',
                    relatesTo: [],
                },
                {
                    name: 'Producer Reference Time',
                    tech: 'DASH',
                    tag: '<ProducerReferenceTime>',
                    value: prtValue,
                    purpose:
                        'Encoder timing information for ultra-low latency.',
                    relatesTo: [],
                },
                {
                    name: 'Availability Time Offset',
                    tech: 'DASH',
                    tag: '@availabilityTimeOffset',
                    value: atoValue,
                    purpose:
                        'Reduces segment availability delay for low-latency.',
                    relatesTo: ['segment'],
                },
                {
                    name: 'Availability Time Complete',
                    tech: 'DASH',
                    tag: '@availabilityTimeComplete',
                    value: atcValue,
                    purpose: 'Indicates if segment is completely available.',
                    relatesTo: ['segment'],
                },
            ]
            : []
    );

    const sortByRelatesToAndContext = (isLiveStream) => (a, b) => {
        const getEntityTypeScore = (metric) => {
            if (metric.relatesTo.includes('period')) return 0;
            if (metric.relatesTo.includes('segment')) return 1;
            return 2;
        };

        const scoreA = getEntityTypeScore(a);
        const scoreB = getEntityTypeScore(b);
        if (scoreA !== scoreB) {
            return scoreA - scoreB;
        }
        return a.name.localeCompare(b.name);
    };

    const sortFn = sortByRelatesToAndContext(isLive);

    const explicitDurations = {
        title: 'Explicit Durations',
        description: 'Values written directly in the manifest.',
        metrics: explicitMetrics
            .sort(sortFn)
            .map((metric) => applyWarningHeuristics(metric, stream)),
    };

    const inferredTimings = {
        title: 'Inferred & Calculated Timings',
        description: 'Timings the player must calculate from other values.',
        metrics: inferredMetrics
            .sort(sortFn)
            .map((metric) => applyWarningHeuristics(metric, stream)),
    };

    const syncAndEvents = {
        title: 'Synchronization & Events',
        description:
            'Timings that anchor the media to a clock or trigger events.',
        metrics: syncAndEventsMetrics
            .sort(sortFn)
            .map((metric) => applyWarningHeuristics(metric, stream)),
    };

    let timeOffset = 0;
    if (isLive) {
        const effectiveLiveEdge = liveEdge > 0 ? liveEdge : maxSegmentEnd;
        const dvrDepth = manifest.timeShiftBufferDepth || 60;

        timeOffset = Math.max(0, effectiveLiveEdge - dvrDepth);

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
        dvrWindow: isLive ? manifest.timeShiftBufferDepth : null,
        suggestedLivePoint: isLive
            ? liveEdge - (manifest.suggestedPresentationDelay || 0)
            : null,
        totalDuration: totalDuration || 100,
        timeOffset: timeOffset,
    };

    return finalViewModel;
}
