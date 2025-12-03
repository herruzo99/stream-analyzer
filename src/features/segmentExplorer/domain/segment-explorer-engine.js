import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';

const MAX_HISTORY_PER_TRACK = 2000;

export class SegmentExplorerEngine {
    constructor() {
        this._cache = {
            streamId: null,
            activeTab: null,
            lastUpdateSignature: null,
            result: null,
        };
        this._streamHistory = new Map();
    }

    _createSignature(stream, activeTab) {
        if (!stream) return null;
        let sig = `${stream.id}-${activeTab}-${stream.protocol}`;
        const latestUpdate = stream.manifestUpdates?.[0];
        if (latestUpdate) {
            const seq =
                latestUpdate.endSequenceNumber || latestUpdate.sequenceNumber;
            const ts = latestUpdate.endTimestamp || latestUpdate.timestamp;
            sig += `-${latestUpdate.id}-${seq}-${ts}`;
        }

        let totalSegments = 0;
        if (stream.protocol === 'dash') {
            for (const state of stream.dashRepresentationState.values()) {
                totalSegments += state.segments.length;
            }
        } else if (stream.protocol === 'hls') {
            for (const state of stream.hlsVariantState.values()) {
                totalSegments += state.segments.length;
            }
        }

        sig += `-${totalSegments}`;
        return sig;
    }

    _getContentType(stream, repId) {
        if (stream.protocol === 'dash') {
            for (const p of stream.manifest.periods) {
                for (const as of p.adaptationSets) {
                    if (as.representations.some((r) => r.id === repId)) {
                        return as.contentType;
                    }
                }
            }
        }
        return 'unknown';
    }

    _getTrackMeta(stream, repId) {
        if (stream.protocol === 'dash') {
            for (const p of stream.manifest.periods) {
                for (const as of p.adaptationSets) {
                    const rep = as.representations.find((r) => r.id === repId);
                    if (rep) {
                        return {
                            width: rep.width?.value,
                            height: rep.height?.value,
                            codecs: (rep.codecs || [])
                                .map((c) => c.value)
                                .join(', '),
                            lang: as.lang,
                            bandwidth: rep.bandwidth,
                            repId: repId,
                            contentType: as.contentType,
                        };
                    }
                }
            }
        }
        return { bandwidth: 0, repId: 'unknown', contentType: 'unknown' };
    }

    _updateHistory(streamId, compositeKey, allSegments, staleThresholdSeq) {
        if (!this._streamHistory.has(streamId)) {
            this._streamHistory.set(streamId, new Map());
        }
        const streamHistory = this._streamHistory.get(streamId);

        if (!streamHistory.has(compositeKey)) {
            streamHistory.set(compositeKey, new Map());
        }
        const segmentHistory = streamHistory.get(compositeKey);

        allSegments.forEach((seg) => {
            if (seg.type === 'Media') {
                const isStale =
                    staleThresholdSeq !== -1 &&
                    typeof seg.number === 'number' &&
                    seg.number < staleThresholdSeq;
                // Store enriched segment.
                // NOTE: We must ensure we don't overwrite existing history if it's the same segment
                // but we do want to update 'isStale' status.
                segmentHistory.set(seg.uniqueId, { ...seg, _isStale: isStale });
            }
        });

        // Prune history
        if (segmentHistory.size > MAX_HISTORY_PER_TRACK) {
            const keys = segmentHistory.keys();
            let removed = 0;
            while (
                removed < 100 &&
                segmentHistory.size > MAX_HISTORY_PER_TRACK
            ) {
                segmentHistory.delete(keys.next().value);
                removed++;
            }
        }

        return segmentHistory;
    }

    process(stream, activeTab) {
        if (!stream) return null;

        const signature = this._createSignature(stream, activeTab);
        if (
            this._cache.result &&
            this._cache.lastUpdateSignature === signature
        ) {
            return this._cache.result;
        }

        let staleThresholdSeq = -1;
        const isDynamic = stream.manifest.type === 'dynamic';

        // Gather Tracks
        const allowedTypes = new Set();
        if (activeTab === 'video') allowedTypes.add('video');
        if (activeTab === 'audio') allowedTypes.add('audio');
        if (activeTab === 'text') {
            allowedTypes.add('text');
            allowedTypes.add('application');
            allowedTypes.add('subtitles');
        }

        const groupedTracks = new Map();

        if (stream.protocol === 'dash') {
            for (const [
                key,
                repState,
            ] of stream.dashRepresentationState.entries()) {
                let repId = 'unknown';
                const sampleSeg = repState.segments.find(
                    (s) => s.type === 'Media'
                );
                if (sampleSeg) {
                    repId = sampleSeg.repId;
                } else {
                    const parts = key.split('-');
                    if (parts.length > 1) repId = parts.slice(1).join('-');
                }

                const contentType = this._getContentType(stream, repId);
                if (allowedTypes.has(contentType)) {
                    const fragmentHistory = this._updateHistory(
                        stream.id,
                        key,
                        repState.segments,
                        staleThresholdSeq
                    );

                    if (!groupedTracks.has(repId)) {
                        groupedTracks.set(repId, {
                            id: repId,
                            label: repId,
                            meta: this._getTrackMeta(stream, repId),
                            historyMap: new Map(),
                            newlyAdded: new Set(),
                            bandwidth: 0,
                            initSegment: null,
                        });
                    }
                    const group = groupedTracks.get(repId);

                    for (const seg of fragmentHistory.values()) {
                        group.historyMap.set(seg.uniqueId, seg);
                    }

                    if (repState.newlyAddedSegmentUrls) {
                        for (const url of repState.newlyAddedSegmentUrls)
                            group.newlyAdded.add(url);
                    }
                    if (group.meta.bandwidth > group.bandwidth)
                        group.bandwidth = group.meta.bandwidth;
                    const init = repState.segments.find(
                        (s) => s.type === 'Init'
                    );
                    if (init) group.initSegment = init;
                }
            }
        } else if (stream.protocol === 'hls') {
            for (const [
                variantId,
                variantState,
            ] of stream.hlsVariantState.entries()) {
                let effectiveType = 'video';
                const sampleSeg =
                    variantState.segments.find((s) => s.type === 'Media') ||
                    variantState.segments[0];

                if (sampleSeg) {
                    const { contentType } = inferMediaInfoFromExtension(
                        sampleSeg.resolvedUrl
                    );
                    effectiveType =
                        contentType === 'unknown' || contentType === 'init'
                            ? 'video'
                            : contentType;
                }

                if (allowedTypes.has(effectiveType)) {
                    const trackHistory = this._updateHistory(
                        stream.id,
                        variantId,
                        variantState.segments,
                        staleThresholdSeq
                    );

                    let bandwidth = 0;
                    let codecs = 'HLS';
                    if (stream.manifest.variants) {
                        const variant = stream.manifest.variants.find(
                            (v) =>
                                v.stableId === variantId || v.uri === variantId
                        );
                        if (variant) {
                            bandwidth = variant.attributes.BANDWIDTH || 0;
                            codecs = variant.attributes.CODECS || 'HLS';
                        }
                    }

                    groupedTracks.set(variantId, {
                        id: variantId,
                        label: variantId.split('/').pop().split('?')[0],
                        meta: { codecs, bandwidth, width: 0, height: 0 },
                        historyMap: trackHistory,
                        newlyAdded:
                            variantState.newlyAddedSegmentUrls || new Set(),
                        bandwidth: bandwidth,
                        initSegment:
                            variantState.segments.find(
                                (s) => s.type === 'Init'
                            ) || null,
                    });
                }
            }
        }

        const rawTracks = Array.from(groupedTracks.values());

        // 1. Find global min start time across all tracks to normalize X=0
        let globalMinTime = Infinity;
        let globalMaxTime = -Infinity;

        const getAbsTime = (seg) => {
            // DASH: periodStart is absolute time offset for period
            if (
                seg.periodStart !== undefined &&
                seg.time !== undefined &&
                seg.timescale
            ) {
                return seg.periodStart + seg.time / seg.timescale;
            }
            // HLS: time is usually accumulated duration
            return seg.time || 0;
        };

        const getDurationSec = (seg) => {
            if (seg.duration && seg.timescale)
                return seg.duration / seg.timescale;
            return 0;
        };

        // Prepare flat lists for rendering
        const processedTracks = rawTracks.map((track) => {
            const segments = Array.from(track.historyMap.values())
                .map((seg) => {
                    const start = getAbsTime(seg);
                    const duration = getDurationSec(seg);
                    return {
                        ...seg,
                        start,
                        end: start + duration,
                        durationSec: duration,
                    };
                })
                .sort((a, b) => a.start - b.start);

            if (segments.length > 0) {
                if (segments[0].start < globalMinTime)
                    globalMinTime = segments[0].start;
                const last = segments[segments.length - 1];
                if (last.end > globalMaxTime) globalMaxTime = last.end;
            }

            return {
                ...track,
                segments,
            };
        });

        if (globalMinTime === Infinity) {
            const emptyResult = {
                tracks: [],
                timeBounds: { start: 0, end: 0 },
            };
            this._cache = {
                streamId: stream.id,
                activeTab,
                lastUpdateSignature: signature,
                result: emptyResult,
            };
            return emptyResult;
        }

        // Sort tracks by bandwidth
        processedTracks.sort((a, b) => b.bandwidth - a.bandwidth);

        // Normalize times to 0
        processedTracks.forEach((track) => {
            track.segments.forEach((seg) => {
                seg.relStart = seg.start - globalMinTime;
                seg.relEnd = seg.end - globalMinTime;
            });
        });

        const totalDuration = Math.max(0, globalMaxTime - globalMinTime);

        const result = {
            tracks: processedTracks,
            timeBounds: {
                start: globalMinTime,
                end: globalMaxTime,
                duration: totalDuration,
            },
            activeStreamId: stream.id,
            isLive: isDynamic,
        };

        this._cache = {
            streamId: stream.id,
            activeTab,
            lastUpdateSignature: signature,
            result,
        };
        return result;
    }
}
