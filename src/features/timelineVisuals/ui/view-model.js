import { formatBitrate } from '@/ui/shared/format';

const EVENT_COLORS = {
    'scte35-inband': '#a855f7', // purple
    'hls-daterange': '#f59e0b', // amber
    adaptation: '#3b82f6', // blue
};

/**
 * Extracts and transforms all relevant timed events from a stream object.
 * @param {import('@/types').Stream} stream
 * @returns {Array<{time: number, type: string, details: string, color: string, scte35?: object}>}
 */
function getEvents(stream) {
    const events = [];

    // SCTE-35 from in-band emsg boxes
    (stream.inbandEvents || []).forEach((event) => {
        if (event.scte35 && !('error' in event.scte35)) {
            events.push({
                time: event.startTime,
                type: 'SCTE-35 (in-band)',
                details: `Splice Command: ${event.scte35.splice_command?.type || 'Unknown'}`,
                color: EVENT_COLORS['scte35-inband'],
                scte35: event.scte35,
            });
        }
    });

    // SCTE-35 from HLS DATERANGE tags
    (stream.manifest?.events || [])
        .filter((e) => e.scte35)
        .forEach((event) => {
            if (event.scte35 && !('error' in event.scte35)) {
                events.push({
                    time: event.startTime,
                    type: 'SCTE-35 (DATERANGE)',
                    details: `Splice Command: ${event.scte35.splice_command?.type || 'Unknown'}`,
                    color: EVENT_COLORS['hls-daterange'],
                    scte35: event.scte35,
                });
            }
        });

    // Adaptation events (bitrate switches)
    (stream.adaptationEvents || []).forEach((event) => {
        events.push({
            time: event.time,
            type: 'ABR Switch',
            details: `Resolution changed from ${event.oldHeight || '?'}p to ${
                event.newHeight
            }p`,
            color: EVENT_COLORS.adaptation,
        });
    });

    return events;
}

/**
 * Creates a unified view model for the timeline visualization from a stream object.
 * This function is synchronous and protocol-agnostic.
 * @param {import('@/types').Stream} stream
 * @returns {{
 *   tracks: {id: string, label: string}[],
 *   segments: {trackIndex: number, startTime: number, endTime: number, duration: number, number: number, type: string, isPartial: boolean}[],
 *   events: {time: number, type: string, details: string, color: string, scte35?: object}[],
 *   adAvails: import('@/types').AdAvail[],
 *   duration: number,
 *   isLive: boolean,
 *   abrLadder: {name: string, tracks: {width: number, height: number, bandwidth: number}[]}
 * }}
 */
export function createTimelineViewModel(stream) {
    const tracks = [];
    const segments = [];
    const isLive = stream.manifest?.type === 'dynamic';

    if (stream.protocol === 'dash') {
        stream.dashRepresentationState.forEach((repState, compositeKey) => {
            const parts = compositeKey.split('-');
            const periodIdentifier = parts[0];
            const repId = parts.slice(1).join('-');

            const period =
                stream.manifest.periods.find(
                    (p) => p.id === periodIdentifier
                ) || stream.manifest.periods[parseInt(periodIdentifier, 10)];

            if (!period) return;

            const as = period.adaptationSets.find((a) =>
                a.representations.some((r) => r.id === repId)
            );
            const rep = as?.representations.find((r) => r.id === repId);
            if (!rep) return;

            const trackIndex = tracks.length;
            tracks.push({
                id: rep.id,
                label: `[DASH] ${rep.id} (${rep.height?.value || '?'}p)`,
            });

            repState.segments.forEach((seg) => {
                if (seg.type !== 'Media' || !seg.duration) return;
                const startTime = seg.time / seg.timescale;
                const duration = seg.duration / seg.timescale;
                segments.push({
                    ...seg,
                    trackIndex,
                    startTime,
                    endTime: startTime + duration,
                    duration: duration,
                    isPartial: false,
                });
            });
        });
    } else if (stream.protocol === 'hls') {
        stream.hlsVariantState.forEach((variantState, uri) => {
            const variant = stream.manifest.variants.find(
                (v) => v.resolvedUri === uri
            );
            if (!variant) return;

            const trackIndex = tracks.length;
            const bw = (variant.attributes.BANDWIDTH / 1000).toFixed(0);
            tracks.push({
                id: uri,
                label: `[HLS] ${bw}k (${variant.attributes.RESOLUTION || '?'})`,
            });

            let cumulativeTime = 0;
            variantState.segments.forEach((seg) => {
                const startTime = cumulativeTime;
                const duration = seg.duration;
                segments.push({
                    ...seg,
                    trackIndex,
                    startTime,
                    endTime: startTime + duration,
                    duration,
                    isPartial: false,
                });

                let partialStartTime = startTime;
                (seg.parts || []).forEach((part) => {
                    const partDuration = part.DURATION;
                    segments.push({
                        ...part,
                        trackIndex,
                        startTime: partialStartTime,
                        endTime: partialStartTime + partDuration,
                        duration: partDuration,
                        number: seg.number,
                        type: 'Partial',
                        isPartial: true,
                    });
                    partialStartTime += partDuration;
                });

                cumulativeTime += duration;
            });
        });
    }

    const maxSegmentTime =
        segments.length > 0 ? Math.max(...segments.map((s) => s.endTime)) : 0;
    const duration = isLive
        ? stream.manifest.timeShiftBufferDepth || maxSegmentTime
        : stream.manifest.duration || maxSegmentTime;

    const allVideoReps = stream.manifest.periods
        .flatMap((p) => p.adaptationSets)
        .filter((as) => as.contentType === 'video')
        .flatMap((as) => as.representations);

    const abrLadder = {
        name: stream.name,
        tracks: allVideoReps
            .map((rep) => ({
                width: rep.width.value,
                height: rep.height.value,
                bandwidth: rep.bandwidth,
            }))
            .filter((t) => t.width && t.height && t.bandwidth),
    };

    return {
        tracks,
        segments,
        events: getEvents(stream),
        adAvails: stream.adAvails || [],
        duration: duration || 1,
        isLive,
        abrLadder,
    };
}
